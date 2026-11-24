/* =====================================================================
   LANTERN — Chain layer (Solana)
   ---------------------------------------------------------------------
   Wallet (Phantom/Solflare) · RPC (custom/managed) · SOL balances ·
   REAL trading via Jupiter (quote → swap → wallet sign → confirm) ·
   Portfolio (real token accounts) · On-chain safety screen ·
   Real SPL mint deployment (the launchpad).
   deployMemeCoin() and swap() are the two execution adapters — replace
   their internals to change programs/DEXes without touching the UI.
   ===================================================================== */
import('https://esm.sh/@solana/web3.js@1.95.4').then(start).catch(err => {
  console.error('[LANTERN] failed to load web3', err);
  window.LanternChain = {
    failed: true,
    getState: () => ({ status: 'offline' }),
    onStateChange: () => () => {},
    getProvider: () => null
  };
  document.dispatchEvent(new CustomEvent('lantern:wallet', {
    detail: { status: 'offline', hasWallet: false, loadError: true }
  }));
});

async function start(web3) {
  'use strict';

  const SPL_ESM = 'https://esm.sh/@solana/spl-token@0.4.8?deps=@solana/web3.js@1.95.4';
  const JUP = 'https://lite-api.jup.ag';
  const U64_MAX = (1n << 64n) - 1n;
  const LAMPORTS = 1e9;
  const RPC_KEY = 'lantern:rpc'; // {devnet: url, mainnet: url}

  const DEFAULT_RPC = {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com'
  };

  const state = {
    hasWallet: false,
    walletName: null,
    address: null,
    network: 'devnet',
    balance: null,      // SOL on active network
    mainnetBalance: null,
    rpcUrl: null,
    rpcMs: null,
    status: 'disconnected' // disconnected | connecting | connected
  };

  const listeners = [];
  let _web3 = web3;
  let _spl = null;
  let _conn = null;
  let _connKey = '';
  let _cost = null;

  /* ---------------- plumbing ---------------- */

  function snapshot() { return Object.assign({}, state); }

  function emit() {
    const snap = snapshot();
    listeners.forEach(fn => { try { fn(snap); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent('lantern:wallet', { detail: snap })); } catch (e) {}
  }

  function onStateChange(fn) {
    listeners.push(fn);
    fn(snapshot());
    return function () {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  async function libs() {
    if (!_spl) _spl = await import(SPL_ESM);
    return { web3: _web3, spl: _spl };
  }

  /* ---------------- RPC ---------------- */

  // Read-only fallbacks (CORS-open, keyless) — kicked in when the primary
  // public RPC rate-limits (429) so safety/holder reads keep working.
  const READ_FALLBACKS = [
    'https://solana-rpc.publicnode.com',
    'https://solana-mainnet.api.onfinality.io/public'
  ];
  let _readUrl = null;

  function withTimeout(p, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), ms);
      p.then(v => { clearTimeout(t); resolve(v); },
             e => { clearTimeout(t); reject(e); });
    });
  }

  /**
   * Run a read against the working endpoint: cached read URL → primary →
   * fallbacks. Only retries rate-limit/timeout/network errors.
   */
  async function readCall(fn) {
    const urls = [_readUrl, rpcFor('mainnet')].concat(READ_FALLBACKS)
      .filter((u, i, a) => u && a.indexOf(u) === i);
    let lastErr = null;
    for (const url of urls) {
      try {
        const conn = new _web3.Connection(url, { commitment: 'confirmed' });
        const res = await withTimeout(fn(conn), 9000);
        _readUrl = url;
        return res;
      } catch (e) {
        lastErr = e;
        const msg = String((e && e.message) || e);
        // Retry the next endpoint on rate limits, timeouts, network errors —
        // and on endpoint policy errors (403/401/405/400 "method not found"),
        // since public RPCs differ in which methods they allow (the default
        // mainnet endpoint rejects getSupply with 403 "Access forbidden").
        if (!/429|40[0135]|too many|rate limit|forbidden|not allowed|does not support|method not found|timeout|fetch|network|ECONN/i.test(msg)) throw e;
      }
    }
    throw lastErr || new Error('All RPC endpoints failed.');
  }

  function readRpcMap() {
    try { return JSON.parse(localStorage.getItem(RPC_KEY)) || {}; } catch (e) { return {}; }
  }

  function rpcFor(net) {
    const map = readRpcMap();
    return map[net] || DEFAULT_RPC[net] || DEFAULT_RPC.mainnet;
  }

  function setRpc(url, net) {
    net = net || state.network;
    const map = readRpcMap();
    if (url) map[net] = String(url).trim();
    else delete map[net];
    try { localStorage.setItem(RPC_KEY, JSON.stringify(map)); } catch (e) {}
    _conn = null; _connKey = '';
    if (state.address) refreshBalance();
    state.rpcUrl = rpcFor(state.network);
    emit();
    return state.rpcUrl;
  }

  function getConnection(net) {
    net = net || state.network;
    const url = rpcFor(net);
    const key = net + '|' + url;
    if (!_conn || _connKey !== key) {
      _conn = new _web3.Connection(url, { commitment: 'confirmed', confirmTransactionTimeout: 60000 });
      _connKey = key;
      _cost = null;
      state.rpcUrl = url;
    }
    return _conn;
  }

  /** Measure RPC latency (getEpochInfo round trip). */
  async function pingRpc(net) {
    const url = rpcFor(net || state.network);
    const t0 = performance.now();
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getEpochInfo', params: { commitment: 'confirmed' } })
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      state.rpcMs = Math.round(performance.now() - t0);
    } catch (e) {
      state.rpcMs = null;
      throw e;
    }
    emit();
    return state.rpcMs;
  }

  /* ---------------- wallet ---------------- */

  function getProvider() {
    if (window.phantom && window.phantom.solana && window.phantom.solana.isPhantom) return window.phantom.solana;
    if (window.solana && window.solana.isPhantom) return window.solana;
    if (window.solflare && window.solflare.isSolflare) return window.solflare;
    if (window.solana) return window.solana;
    if (window.solflare) return window.solflare;
    return null;
  }

  function detectWallet() {
    const p = getProvider();
    state.hasWallet = !!p;
    state.walletName = !p ? null
      : p.isPhantom ? 'Phantom'
      : p.isSolflare ? 'Solflare'
      : 'a Solana wallet';
    return p;
  }

  function addrOf(pub) {
    if (!pub) return null;
    return pub.toBase58 ? pub.toBase58() : String(pub);
  }

  async function connect() {
    const p = detectWallet();
    if (!p) throw Object.assign(new Error('No Solana wallet detected.'), { code: 'NO_WALLET' });
    state.status = 'connecting';
    emit();
    try {
      let pub = null;
      if (typeof p.connect === 'function') { const res = await p.connect(); pub = res && res.publicKey; }
      if (!pub && typeof p.request === 'function') { const res = await p.request({ method: 'connect' }); pub = res && res.publicKey; }
      pub = pub || p.publicKey;
      const addr = addrOf(pub);
      if (!addr) throw new Error('Wallet did not return an address.');
      state.address = addr;
      state.status = 'connected';
      await refreshBalance();
      emit();
      return addr;
    } catch (e) {
      state.status = state.address ? 'connected' : 'disconnected';
      emit();
      throw friendly(e);
    }
  }

  async function disconnect() {
    const p = getProvider();
    try { if (p && typeof p.disconnect === 'function') await p.disconnect(); } catch (e) {}
    state.address = null;
    state.balance = null;
    state.mainnetBalance = null;
    state.status = 'disconnected';
    emit();
  }

  async function solBalance(addr, net) {
    const conn = getConnection(net);
    const lamports = await conn.getBalance(new _web3.PublicKey(addr));
    return lamports / LAMPORTS;
  }

  async function refreshBalance() {
    if (!state.address) { state.balance = null; state.mainnetBalance = null; emit(); return null; }
    try {
      state.balance = await solBalance(state.address, state.network);
      if (state.network === 'mainnet') state.mainnetBalance = state.balance;
      else state.mainnetBalance = await solBalance(state.address, 'mainnet').catch(() => null);
    } catch (e) { /* keep stale */ }
    emit();
    return state.balance;
  }

  function setNetwork(net) {
    state.network = net === 'mainnet' ? 'mainnet' : 'devnet';
    _conn = null; _connKey = ''; _cost = null;
    state.rpcUrl = rpcFor(state.network);
    if (state.address) refreshBalance();
    emit();
    return state.network;
  }

  function friendly(e) {
    if (!e) return new Error('Unknown error.');
    const msg = String(e.message || e);
    if (e.code === 'NO_WALLET') return e;
    if (e.code === 4001 || /rejected|declined|cancelled|canceled|user denied/i.test(msg)) {
      return Object.assign(new Error('You rejected the signature request in your wallet.'), { code: 'REJECTED' });
    }
    if (/insufficient lamports|insufficient funds/i.test(msg)) {
      return Object.assign(new Error('Not enough SOL for this transaction (rent + fees).'), { code: 'FUNDS' });
    }
    if (/blockhash not found|block height exceeded/i.test(msg)) {
      return Object.assign(new Error('The transaction expired before confirmation — try again.'), { code: 'EXPIRED' });
    }
    if (/too many requests|429/i.test(msg)) {
      return Object.assign(new Error('RPC rate limit hit — set a custom RPC in Wallets and retry.'), { code: 'RATELIMIT' });
    }
    if (/failed to fetch|networkerror|load failed|cors/i.test(msg)) {
      return Object.assign(new Error('Network unreachable — check your connection or RPC URL.'), { code: 'NETWORK' });
    }
    return e instanceof Error ? e : new Error(msg);
  }

  async function requireWallet() {
    if (!state.address) await connect();
    const p = getProvider();
    if (!p || typeof p.signTransaction !== 'function') {
      throw Object.assign(new Error('Your wallet does not support transaction signing.'), { code: 'NO_SIGNER' });
    }
    return p;
  }

  /* ---------------- portfolio (real balances) ---------------- */

  /** Real SPL balances held by the connected wallet (mainnet). */
  async function getPositions() {
    if (!state.address) return [];
    const { spl } = await libs();
    const owner = new _web3.PublicKey(state.address);
    const res = await readCall(conn => conn.getParsedTokenAccountsByOwner(owner, { programId: spl.TOKEN_PROGRAM_ID }));
    const out = [];
    res.value.forEach(v => {
      const info = v.account.data.parsed.info;
      const amt = info.tokenAmount || {};
      const ui = amt.uiAmount || 0;
      if (ui > 0) out.push({ mint: info.mint, amount: ui, raw: amt.amount, decimals: amt.decimals });
    });
    return out;
  }

  /** Real balance of one mint for the wallet. */
  async function getTokenBalance(mint) {
    if (!state.address) return 0;
    try {
      const list = await getPositions();
      const hit = list.find(p => p.mint === mint);
      return hit ? hit.amount : 0;
    } catch (e) { return 0; }
  }

  /* ---------------- on-chain reads ---------------- */

  /** Parsed mint account: decimals, authorities, supply. */
  async function getMintInfo(mint) {
    const res = await readCall(conn => conn.getParsedAccountInfo(new _web3.PublicKey(mint)));
    const v = res.value;
    if (!v || !v.data || !v.data.parsed) return null;
    const i = v.data.parsed.info;
    return {
      decimals: i.decimals,
      mintAuthority: i.mintAuthority || null,
      freezeAuthority: i.freezeAuthority || null,
      supply: i.supply,
      owner: v.owner
    };
  }

  /** Native SOL supply (lamports) — used for real market cap math. */
  async function getSupply() {
    const res = await readCall(conn => conn.getSupply());
    const v = res && res.value;
    if (!v) return null;
    return {
      circulating: Number(v.circulating) / 1e9,
      total: Number(v.total) / 1e9,
      nonCirculating: Number(v.nonCirculating) / 1e9
    };
  }

  /** Top token accounts by balance + concentration of supply. */
  async function getTopHolders(mint) {
    let res;
    try {
      res = await readCall(conn => conn.getTokenLargestAccounts(new _web3.PublicKey(mint)));
    } catch (e) {
      // public endpoints rate-limit this method hard — one delayed retry
      await new Promise(r => setTimeout(r, 2500));
      res = await readCall(conn => conn.getTokenLargestAccounts(new _web3.PublicKey(mint)));
    }
    const rows = (res.value || []).slice(0, 10).map(v => ({
      address: v.address.toBase58 ? v.address.toBase58() : String(v.address),
      amount: v.uiAmount || 0
    }));
    let supply = null;
    try {
      const mi = await getMintInfo(mint);
      if (mi && mi.supply) supply = Number(mi.supply) / Math.pow(10, (mi.decimals != null ? mi.decimals : 9));
    } catch (e) {}
    const top10 = rows.reduce((s, r) => s + r.amount, 0);
    return { holders: rows, top10Pct: supply ? (top10 / supply) * 100 : null };
  }

  /**
   * Real safety screen: on-chain authorities + holder concentration +
   * DexScreener liquidity/age/flow signals. Degrades gracefully when an
   * endpoint is rate-limited (check reported as "unknown").
   */
  async function safetyScreen(mint, pair, pre) {
    pair = pair || null;
    pre = pre || {};
    const checks = [];

    const pMint = ('mintInfo' in pre)
      ? Promise.resolve(pre.mintInfo ? { v: pre.mintInfo } : { err: 1 })
      : getMintInfo(mint).then(v => ({ v })).catch(() => ({ err: 1 }));
    const pHold = ('holders' in pre)
      ? Promise.resolve(pre.holders ? { v: pre.holders } : { err: 1 })
      : getTopHolders(mint).then(v => ({ v })).catch(() => ({ err: 1 }));

    const [mintRes, holdersRes] = await Promise.all([pMint, pHold]);

    if (mintRes.v) {
      const m = mintRes.v;
      checks.push({
        key: 'mint',
        ok: !m.mintAuthority,
        weight: 22,
        label: m.mintAuthority ? 'Mint authority active — more tokens can be printed' : 'Mint authority revoked — fixed supply',
        detail: m.mintAuthority ? String(m.mintAuthority).slice(0, 8) + '…' : 'revoked'
      });
      checks.push({
        key: 'freeze',
        ok: !m.freezeAuthority,
        weight: 16,
        label: m.freezeAuthority ? 'Freeze authority active — wallets can be frozen' : 'Freeze authority revoked — nobody can freeze holders',
        detail: m.freezeAuthority ? 'active' : 'revoked'
      });
    } else {
      checks.push({ key: 'mint', ok: null, weight: 22, label: 'Mint authority — RPC unavailable', detail: 'unknown' });
      checks.push({ key: 'freeze', ok: null, weight: 16, label: 'Freeze authority — RPC unavailable', detail: 'unknown' });
    }

    if (holdersRes.v && holdersRes.v.top10Pct != null) {
      const pct = holdersRes.v.top10Pct;
      checks.push({
        key: 'conc',
        ok: pct <= 20,
        weight: 20,
        label: 'Top 10 accounts hold ' + pct.toFixed(1) + '% of supply' + (pct <= 20 ? ' — healthy spread' : ' — concentrated'),
        detail: pct.toFixed(1) + '%'
      });
    } else {
      checks.push({ key: 'conc', ok: null, weight: 20, label: 'Holder concentration — RPC unavailable', detail: 'unknown' });
    }

    if (pair && pair.liq != null) {
      checks.push({
        key: 'liq',
        ok: pair.liq >= 10000,
        weight: 20,
        label: 'Liquidity $' + fmtUsd(pair.liq) + (pair.liq >= 10000 ? ' — exits are possible' : ' — thin, exits may fail'),
        detail: '$' + fmtUsd(pair.liq)
      });
    } else {
      checks.push({ key: 'liq', ok: null, weight: 20, label: 'Liquidity — no pool data yet', detail: 'unknown' });
    }

    if (pair && pair.ageH != null) {
      const h = pair.ageH;
      checks.push({
        key: 'age',
        ok: h >= 24,
        weight: 12,
        label: h >= 24 ? 'Pool age ' + ageLabel(h) + ' — survived initial churn' : 'Pool age ' + ageLabel(h) + ' — extremely new',
        detail: ageLabel(h)
      });
    } else {
      checks.push({ key: 'age', ok: null, weight: 12, label: 'Pool age — unknown', detail: 'unknown' });
    }

    if (pair && pair.buys24 != null && pair.sells24 != null) {
      const ratio = pair.sells24 ? pair.buys24 / pair.sells24 : pair.buys24;
      checks.push({
        key: 'flow',
        ok: ratio >= 1,
        weight: 10,
        label: ratio >= 1 ? 'Buy pressure: ' + pair.buys24 + ' buys / ' + pair.sells24 + ' sells (24h)' : 'Sell pressure: ' + pair.buys24 + ' buys / ' + pair.sells24 + ' sells (24h)',
        detail: ratio.toFixed(1) + '×'
      });
    } else {
      checks.push({ key: 'flow', ok: null, weight: 10, label: 'Trade flow — no DEX data', detail: 'unknown' });
    }

    const socialsOk = !!(pair && ((pair.socials && pair.socials.length) || (pair.websites && pair.websites.length)));
    checks.push({
      key: 'social', ok: socialsOk, weight: 10,
      label: socialsOk ? 'Project socials linked on DexScreener' : 'No linked socials — anonymity risk',
      detail: socialsOk ? 'linked' : 'none'
    });

    let score = 0, max = 0;
    checks.forEach(c => {
      max += c.weight;
      if (c.ok === true) score += c.weight;
      else if (c.ok === null) score += c.weight * 0.4; // unknown = partial credit, not a fail
    });
    const pctScore = max ? Math.round((score / max) * 100) : 0;
    const verdict = pctScore >= 80 ? { text: 'Looks solid', tone: 'good' }
      : pctScore >= 60 ? { text: 'Trade with care', tone: 'mid' }
      : pctScore >= 40 ? { text: 'High risk', tone: 'bad' }
      : { text: 'Critical risk', tone: 'bad' };
    return { score: pctScore, verdict: verdict, checks: checks };
  }

  function fmtUsd(n) {
    if (n == null) return '—';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
  }
  function ageLabel(h) {
    if (h == null) return 'unknown';
    if (h < 1) return Math.round(h * 60) + 'm';
    if (h < 48) return Math.round(h) + 'h';
    return Math.round(h / 24) + 'd';
  }

  /* ---------------- Jupiter: REAL swaps ---------------- */

  async function quote({ inputMint, outputMint, amountRaw, slippageBps }) {
    amountRaw = String(amountRaw);
    if (!amountRaw || amountRaw === '0') throw new Error('Enter an amount first.');
    const url = JUP + '/swap/v1/quote' +
      '?inputMint=' + inputMint +
      '&outputMint=' + outputMint +
      '&amount=' + amountRaw +
      '&slippageBps=' + (slippageBps == null ? 50 : slippageBps) +
      '&restrictIntermediateSwaps=true';
    const r = await fetch(url);
    const q = await r.json();
    if (!r.ok || q.error || q.errorCode) {
      const raw = typeof q.error === 'string' ? q.error
        : (q.error && q.error.message) || q.errorMessage || '';
      const msg = q.errorCode === 'TOKEN_NOT_TRADABLE'
        ? 'This token has no tradable pool routed by Jupiter yet.'
        : raw || ('Quote failed (HTTP ' + r.status + ').');
      throw new Error(msg);
    }
    return q;
  }

  /**
   * Execute a real swap: Jupiter quote → swap tx → wallet signs → send →
   * confirm. Works for any pair Jupiter routes (SOL ↔ SPL, SPL ↔ SPL).
   * @returns {Promise<{signature, inAmount, outAmount, explorer}>}
   */
  async function swap({ inputMint, outputMint, amountRaw, slippageBps, side, onProgress }) {
    const provider = await requireWallet();
    const on = (s, pct) => { if (typeof onProgress === 'function') onProgress({ stage: s, pct: pct }); };

    on('quoting', 10);
    const q = await quote({ inputMint: inputMint, outputMint: outputMint, amountRaw: amountRaw, slippageBps: slippageBps });

    on('building', 35);
    const r = await fetch(JUP + '/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: q,
        userPublicKey: state.address,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    const body = await r.json();
    if (!r.ok || !body.swapTransaction) {
      throw friendly(new Error((body.error && body.error.message) || body.errorMessage || 'Swap build failed (HTTP ' + r.status + ').'));
    }

    on('signing', 60);
    const bin = atob(body.swapTransaction);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    let tx;
    try { tx = _web3.Transaction.from(bytes); } catch (e) { throw new Error('Could not decode the swap transaction.'); }

    let signed;
    try { signed = await provider.signTransaction(tx); } catch (e) { throw friendly(e); }

    on('sending', 80);
    const mainConn = getConnection('mainnet');
    let sig;
    try {
      let raw;
      try { raw = signed.serialize(); } catch (e) { throw new Error('The wallet did not return a fully signed transaction.'); }
      sig = await mainConn.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 3 });
    } catch (e) { throw friendly(e); }

    on('confirming', 92);
    const conf = { signature: sig, blockhash: tx.recentBlockhash, lastValidBlockHeight: body.lastValidBlockHeight };
    if (conf.lastValidBlockHeight) {
      try {
        const res = await mainConn.confirmTransaction(conf, 'confirmed');
        if (res.value.err) throw new Error('Transaction failed on-chain: ' + JSON.stringify(res.value.err));
      } catch (e) { throw friendly(e); }
    } else {
      try {
        await mainConn.confirmTransaction(sig, 'confirmed', 60000);
      } catch (e2) { throw friendly(e2); }
    }

    on('done', 100);
    refreshBalance();
    return {
      signature: sig,
      inAmount: q.inAmount,
      outAmount: q.outAmount,
      inMint: q.inputMint,
      outMint: q.outputMint,
      side: side || 'buy',
      explorer: 'https://solscan.io/tx/' + sig
    };
  }

  /* ---------------- launch cost ---------------- */

  async function estimateCost() {
    try {
      if (_cost && _cost.network === state.network) return _cost;
      const { spl } = await libs();
      const conn = getConnection();
      const [mintRent, ataRent] = await Promise.all([
        spl.getMinimumBalanceForRentExemptMint(conn),
        conn.getMinimumBalanceForRentExemption(165)
      ]);
      _cost = { network: state.network, lamports: mintRent + ataRent + 10000, mintRent: mintRent, ataRent: ataRent };
      return _cost;
    } catch (e) {
      return { network: state.network, lamports: 3600000 };
    }
  }

  /* ---------------- launch: real SPL mint ---------------- */

  async function deployMemeCoin(o) {
    const symbol = String(o.symbol || 'TOKEN').toUpperCase();
    const decimals = Math.max(0, Math.min(9, parseInt(o.decimals, 10) || 0));
    const supplyStr = String(o.supply || '0').replace(/[^\d]/g, '');
    const revokeMint = o.revokeMint !== false;
    const revokeFreeze = o.revokeFreeze !== false;
    const onProgress = typeof o.onProgress === 'function' ? o.onProgress : function () {};

    const { web3, spl } = await libs();
    if (!state.address) await connect();
    const provider = await requireWallet();

    const amount = BigInt(supplyStr || '0') * (10n ** BigInt(decimals));
    if (amount <= 0n) throw new Error('Supply must be greater than zero.');
    if (amount > U64_MAX) throw new Error('Supply too large for one mint on-chain.');

    const connection = getConnection();
    const owner = new web3.PublicKey(state.address);
    const mint = web3.Keypair.generate();

    onProgress({ stage: 'prepare', pct: 8, label: 'Preparing mint account…' });

    const block = await connection.getLatestBlockhash();
    const mintRent = await spl.getMinimumBalanceForRentExemptMint(connection);

    async function signAndSend(tx, stageSign, stageConfirm) {
      tx.feePayer = owner;
      let recent;
      if (tx.recentBlockhash) {
        recent = { blockhash: tx.recentBlockhash, lastValidBlockHeight: block.lastValidBlockHeight };
      } else {
        recent = await connection.getLatestBlockhash();
        tx.recentBlockhash = recent.blockhash;
      }
      onProgress({ stage: stageSign, pct: stageSign === 'sign1' ? 22 : 62, label: 'Approve in your wallet…' });

      let signed;
      try { signed = await provider.signTransaction(tx); } catch (e) { throw friendly(e); }

      onProgress({ stage: stageConfirm, pct: stageConfirm === 'confirm1' ? 50 : 84, label: 'Confirming on Solana…' });

      let raw;
      try { raw = signed.serialize(); } catch (e) { throw new Error('The wallet did not return all signatures — please try again.'); }
      const signature = await connection.sendRawTransaction(raw, { skipPreflight: false });
      const conf = await connection.confirmTransaction(
        { signature: signature, blockhash: recent.blockhash, lastValidBlockHeight: recent.lastValidBlockHeight },
        'confirmed'
      );
      if (conf.value.err) throw new Error('Transaction failed on-chain: ' + JSON.stringify(conf.value.err));
      return signature;
    }

    // TX 1: create mint + initialize (+ optional freeze revoke at init)
    const tx1 = new web3.Transaction();
    tx1.feePayer = owner;
    tx1.recentBlockhash = block.blockhash;
    tx1.add(web3.SystemProgram.createAccount({
      fromPubkey: owner,
      newAccountPubkey: mint.publicKey,
      space: spl.MINT_SIZE,
      lamports: mintRent,
      programId: spl.TOKEN_PROGRAM_ID
    }));
    tx1.add(spl.createInitializeMintInstruction(mint.publicKey, decimals, owner, revokeFreeze ? null : owner));
    tx1.partialSign(mint);
    const sig1 = await signAndSend(tx1, 'sign1', 'confirm1');

    // TX 2: token account + full pre-mint (+ optional mint authority revoke)
    const ata = spl.getAssociatedTokenAddressSync(mint.publicKey, owner, false);
    const tx2 = new web3.Transaction();
    tx2.add(spl.createAssociatedTokenAccountInstruction(owner, ata, owner, mint.publicKey));
    tx2.add(spl.createMintToInstruction(mint.publicKey, ata, owner, amount));
    if (revokeMint) {
      tx2.add(spl.createSetAuthorityInstruction(mint.publicKey, owner, spl.AuthorityType.MintTokens, null));
    }
    const sig2 = await signAndSend(tx2, 'sign2', 'confirm2');

    onProgress({ stage: 'done', pct: 100, label: 'Live on-chain ✦' });
    await refreshBalance();

    const cluster = state.network === 'mainnet' ? '' : '?cluster=devnet';
    const mintStr = mint.publicKey.toBase58();
    return {
      mint: mintStr,
      signature: sig2,
      firstSignature: sig1,
      network: state.network,
      symbol: symbol,
      decimals: decimals,
      explorer: 'https://solscan.io/tx/' + sig2 + cluster,
      tokenUrl: 'https://solscan.io/token/' + mintStr + cluster
    };
  }

  /* ---------------- boot ---------------- */

  (function boot() {
    state.rpcUrl = rpcFor(state.network);
    const p = detectWallet();
    if (p && p.isConnected && p.publicKey) {
      state.address = addrOf(p.publicKey);
      state.status = state.address ? 'connected' : 'disconnected';
      if (state.address) refreshBalance();
    }
    emit();
    window.addEventListener('load', function () {
      const had = state.address;
      detectWallet();
      if (!had) {
        const prov = getProvider();
        if (prov && prov.isConnected && prov.publicKey) {
          state.address = addrOf(prov.publicKey);
          state.status = state.address ? 'connected' : 'disconnected';
          if (state.address) refreshBalance();
        }
      }
      state.rpcUrl = rpcFor(state.network);
      emit();
      pingRpc().catch(() => {});
    });
  })();

  window.LanternChain = {
    // wallet / rpc
    connect: connect,
    disconnect: disconnect,
    refreshBalance: refreshBalance,
    setNetwork: setNetwork,
    getState: snapshot,
    onStateChange: onStateChange,
    getProvider: getProvider,
    installUrl: 'https://phantom.app/download',
    setRpc: setRpc,
    getRpcUrl: () => rpcFor(state.network),
    getAllRpc: readRpcMap,
    pingRpc: pingRpc,
    // portfolio
    getPositions: getPositions,
    getTokenBalance: getTokenBalance,
    solBalance: solBalance,
    // reads / safety
    getMintInfo: getMintInfo,
    getSupply: getSupply,
    getTopHolders: getTopHolders,
    safetyScreen: safetyScreen,
    // REAL trading (Jupiter)
    quote: quote,
    swap: swap,
    // launch
    estimateCost: estimateCost,
    deployMemeCoin: deployMemeCoin
  };
}
