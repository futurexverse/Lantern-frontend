/* =====================================================================
   LANTERN trade page — client-side swap via Phantom + Jupiter
   No server-side keys. User signs every trade in their own wallet.
   ===================================================================== */

// Load @solana/web3.js from esm.sh (CDN, no build step needed)
import {
  Connection, Transaction, PublicKey, LAMPORTS_PER_SOL
} from 'https://esm.sh/@solana/web3.js@1.95.4';

// Jupiter swap API (same one the bot uses)
const JUP = 'https://lite-api.jup.ag';
const SLIPPAGE_BPS = 50;  // 0.5% — matches bot default

// DexScreener for token metadata (name, image)
const DEXSCREENER_SEARCH = 'https://api.dexscreener.com/latest/dex/search?q=';

// Bot callback endpoint — set this after you deploy the bot on Railway.
// The page reads it from URL (?bot=...) so the same Vercel deploy can point
// at any bot instance. If missing, trades still execute but won't be
// recorded in /trades history.
function botApiUrl() {
  const p = new URLSearchParams(location.search).get('bot');
  if (p) return p.replace(/\/$/, '');
  return '';  // empty = don't record
}

// RPC: prefer a Helius URL from ?rpc=... if provided, else public mainnet
function rpcUrl() {
  return new URLSearchParams(location.search).get('rpc') || 'https://api.mainnet-beta.solana.com';
}

const SOL_MINT = 'So11111111111111111111111111111111111111112';

/* ---------------- DOM refs ---------------- */
const $ = id => document.getElementById(id);
const el = {
  walletState: $('walletState'),
  walletAddr: $('walletAddr'),
  connectBtn: $('connectBtn'),
  solBalance: $('solBalance'),
  solAmount: $('solAmount'),
  tradeForm: $('tradeForm'),
  tradeSideBadge: $('tradeSideBadge'),
  tokenSym: $('tokenSym'),
  tokenName: $('tokenName'),
  payAmount: $('payAmount'),
  payToken: $('payToken'),
  recvAmount: $('recvAmount'),
  recvToken: $('recvToken'),
  metaPrice: $('metaPrice'),
  metaImpact: $('metaImpact'),
  metaLiq: $('metaLiq'),
  execBtn: $('execBtn'),
  quoteStatus: $('quoteStatus'),
  tradeResult: $('tradeResult'),
  resultIcon: $('resultIcon'),
  resultTitle: $('resultTitle'),
  resultBody: $('resultBody'),
  resultLink: $('resultLink'),
  doneBtn: $('doneBtn'),
  errorCard: $('errorCard'),
  errorBody: $('errorBody'),
  retryBtn: $('retryBtn'),
  noPhantom: $('noPhantom')
};

/* ---------------- state ---------------- */
const params = new URLSearchParams(location.search);
const state = {
  side: (params.get('side') || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy',
  mint: params.get('mint') || '',
  sym: params.get('sym') || '—',
  amount: parseFloat(params.get('amount')) || 0,
  // For sells: amount is token count (raw UI). For buys: SOL amount.
  decimals: null,
  provider: null,        // Phantom provider
  walletAddr: null,      // base58 public key
  connection: null,
  quote: null,
  tokenUsd: null,
  solUsd: null
};

/* ---------------- formatting ---------------- */
const fmt = (n, d=4) => n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
const fmtUsd = n => n == null ? '—' : '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtPrice = n => {
  if (n == null) return '—';
  if (n >= 1) return '$' + n.toFixed(4);
  if (n >= 0.01) return '$' + n.toFixed(5);
  if (n > 0) return '$' + n.toExponential(3);
  return '$0';
};
const short = (s, h=4, t=4) => s ? s.slice(0, h) + '…' + s.slice(-t) : '—';

/* ---------------- Phantom provider detection ---------------- */
function getPhantom() {
  // Phantom injects as window.phantom.solana (preferred) or window.solana (legacy)
  if (window.phantom?.solana) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

/* ---------------- connect wallet ---------------- */
async function connectWallet() {
  const p = getPhantom();
  if (!p) {
    el.walletState.hidden = true;
    el.noPhantom.hidden = false;
    return;
  }
  try {
    el.connectBtn.disabled = true;
    el.connectBtn.textContent = 'Connecting…';
    const resp = await p.connect();
    state.provider = p;
    state.walletAddr = resp.publicKey.toString();
    state.connection = new Connection(rpcUrl(), { commitment: 'confirmed' });

    el.walletAddr.textContent = short(state.walletAddr, 6, 6);
    el.connectBtn.hidden = true;
    el.walletState.classList.add('connected');

    await refreshSolBalance();
    el.solBalance.hidden = false;

    // Show the trade form once wallet is connected
    el.walletState.hidden = false;
    el.tradeForm.hidden = false;
    await loadTradeQuote();
  } catch (e) {
    showError(e.message || 'Connection rejected');
  } finally {
    el.connectBtn.disabled = false;
    el.connectBtn.textContent = 'Connect Phantom';
  }
}

async function refreshSolBalance() {
  if (!state.walletAddr || !state.connection) return;
  try {
    const lamports = await state.connection.getBalance(new PublicKey(state.walletAddr));
    const sol = lamports / LAMPORTS_PER_SOL;
    el.solAmount.textContent = fmt(sol, 4) + ' SOL';
    // fetch SOL USD price while we're here
    if (!state.solUsd) {
      const r = await fetch(JUP + '/price/v2?ids=' + SOL_MINT);
      if (r.ok) {
        const j = await r.json();
        state.solUsd = j?.data?.[SOL_MINT]?.price;
      }
    }
    if (state.solUsd) {
      el.solAmount.textContent += '  (~' + fmtUsd(sol * state.solUsd) + ')';
    }
  } catch (e) {
    el.solAmount.textContent = '—';
  }
}

/* ---------------- token metadata ---------------- */
async function loadTokenMeta() {
  if (state.mint && state.mint !== SOL_MINT) {
    try {
      const r = await fetch(DEXSCREENER_SEARCH + encodeURIComponent(state.sym || state.mint));
      const j = await r.json();
      const pair = j?.pairs?.[0];
      if (pair) {
        const t = pair.baseToken;
        if (!state.sym) state.sym = t.symbol;
        el.tokenName.textContent = t.name || '';
        if (pair.liquidity?.usd) state.tokenLiq = pair.liquidity.usd;
        if (pair.priceUsd) state.tokenUsd = parseFloat(pair.priceUsd);
        if (pair.baseToken?.decimals) state.decimals = pair.baseToken.decimals;
      }
    } catch (e) { /* optional */ }
  }
  el.tokenSym.textContent = '$' + state.sym;
}

/* ---------------- Jupiter quote ---------------- */
async function loadTradeQuote() {
  await loadTokenMeta();
  if (state.mint === SOL_MINT) {
    showError('SOL is the other side of the trade — pick a token.');
    return;
  }
  if (!state.amount || state.amount <= 0) {
    el.quoteStatus.textContent = 'Enter an amount to get a quote.';
    return;
  }

  // amountRaw: for buy, amount is SOL → lamports. For sell, token raw amount.
  let inputMint, outputMint, amountRaw;
  if (state.side === 'buy') {
    inputMint = SOL_MINT;
    outputMint = state.mint;
    amountRaw = String(Math.round(state.amount * LAMPORTS_PER_SOL));
  } else {
    inputMint = state.mint;
    outputMint = SOL_MINT;
    if (!state.decimals) {
      el.quoteStatus.textContent = 'Reading token decimals…';
      return;
    }
    amountRaw = String(Math.round(state.amount * Math.pow(10, state.decimals)));
  }

  el.quoteStatus.innerHTML = '<span class="spin"></span>Fetching Jupiter quote…';
  el.execBtn.disabled = true;

  const url = JUP + '/swap/v1/quote?inputMint=' + inputMint +
              '&outputMint=' + outputMint +
              '&amount=' + amountRaw +
              '&slippageBps=' + SLIPPAGE_BPS +
              '&restrictIntermediateSwaps=true';

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const q = await r.json();
    if (!r.ok || q.error || q.errorCode) {
      const msg = q.errorCode === 'TOKEN_NOT_TRADABLE'
        ? 'This token has no tradable pool routed by Jupiter yet.'
        : (q.error?.message || q.errorMessage || q.error || 'Quote failed.');
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    state.quote = q;

    // Derive UI amounts
    const inUi = state.side === 'buy'
      ? Number(q.inAmount) / LAMPORTS_PER_SOL
      : Number(q.inAmount) / Math.pow(10, state.decimals || 9);
    const outUi = state.side === 'sell'
      ? Number(q.outAmount) / LAMPORTS_PER_SOL
      : Number(q.outAmount) / Math.pow(10, state.decimals || 9);

    el.payAmount.textContent = fmt(inUi, state.side === 'buy' ? 4 : 2);
    el.payToken.textContent = state.side === 'buy' ? 'SOL' : state.sym;
    el.recvAmount.textContent = fmt(outUi, state.side === 'sell' ? 4 : 2);
    el.recvToken.textContent = state.side === 'sell' ? 'SOL' : state.sym;

    // Price + impact
    const solUsd = state.solUsd;
    if (state.side === 'buy' && solUsd) {
      const perToken = (inUi * solUsd) / outUi;
      el.metaPrice.textContent = fmtPrice(perToken);
    } else if (state.side === 'sell' && state.tokenUsd) {
      el.metaPrice.textContent = fmtPrice(state.tokenUsd);
    } else {
      el.metaPrice.textContent = '—';
    }
    el.metaImpact.textContent = q.priceImpactPct != null
      ? parseFloat(q.priceImpactPct).toFixed(3) + '%'
      : '—';
    el.metaLiq.textContent = state.tokenLiq ? fmtUsd(state.tokenLiq) : '—';

    el.tradeSideBadge.textContent = state.side.toUpperCase();
    el.tradeSideBadge.className = 'side-badge ' + state.side;
    el.execBtn.textContent = 'Confirm ' + state.side.toUpperCase() + ' in Phantom';
    el.execBtn.disabled = false;
    el.quoteStatus.textContent = '';
  } catch (e) {
    el.quoteStatus.textContent = '';
    showError(e.message);
  }
}

/* ---------------- execute swap ---------------- */
async function executeSwap() {
  if (!state.quote || !state.provider) return;
  el.execBtn.disabled = true;
  el.execBtn.innerHTML = '<span class="spin"></span>Building transaction…';

  try {
    // Get the serialized swap transaction from Jupiter
    const r = await fetch(JUP + '/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        quoteResponse: state.quote,
        userPublicKey: state.walletAddr,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    const body = await r.json();
    if (!r.ok || !body.swapTransaction) {
      throw new Error(body?.error?.message || body?.errorMessage || 'Swap build failed.');
    }

    // Deserialize → sign with Phantom → send
    el.execBtn.innerHTML = '<span class="spin"></span>Waiting for Phantom approval…';
    const bytes = Uint8Array.from(atob(body.swapTransaction), c => c.charCodeAt(0));
    const tx = Transaction.from(bytes);

    const signed = await state.provider.signTransaction(tx);
    const raw = signed.serialize();

    el.execBtn.innerHTML = '<span class="spin"></span>Sending to Solana…';
    const sig = await state.connection.sendRawTransaction(raw, {
      skipPreflight: false,
      maxRetries: 3
    });

    // Wait for confirmation
    el.execBtn.innerHTML = '<span class="spin"></span>Confirming on-chain…';
    await state.connection.confirmTransaction(sig, 'confirmed');

    // Done — show result
    const inUi = state.side === 'buy'
      ? Number(state.quote.inAmount) / LAMPORTS_PER_SOL
      : Number(state.quote.inAmount) / Math.pow(10, state.decimals || 9);
    const outUi = state.side === 'sell'
      ? Number(state.quote.outAmount) / LAMPORTS_PER_SOL
      : Number(state.quote.outAmount) / Math.pow(10, state.decimals || 9);

    showResult({
      success: true,
      signature: sig,
      side: state.side,
      sym: state.sym,
      inUi, outUi
    });

    // Record trade with the bot (best-effort, doesn't block the success UI)
    recordTradeWithBot({
      signature: sig,
      side: state.side,
      mint: state.mint,
      sym: state.sym,
      inUi, outUi,
      signerAddress: state.walletAddr
    }).catch(e => console.warn('[record-trade] failed:', e.message));

    // refresh balance
    refreshSolBalance();
  } catch (e) {
    showError(e.message || 'Swap failed');
  } finally {
    el.execBtn.disabled = false;
    el.execBtn.textContent = 'Confirm ' + state.side.toUpperCase() + ' in Phantom';
  }
}

/* ---------------- record trade with bot ---------------- */
async function recordTradeWithBot(payload) {
  const bot = botApiUrl();
  if (!bot) return;  // no bot URL configured — skip
  const r = await fetch(bot + '/api/record-trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('bot responded ' + r.status);
}

/* ---------------- UI helpers ---------------- */
function showResult(r) {
  el.tradeForm.hidden = true;
  el.walletState.hidden = true;
  el.tradeResult.hidden = false;
  if (!r.success) {
    el.resultIcon.textContent = '⚠️';
    el.resultTitle.textContent = 'Trade failed';
  }
  const inLabel = r.side === 'buy' ? 'SOL' : r.sym;
  const outLabel = r.side === 'buy' ? r.sym : 'SOL';
  el.resultBody.innerHTML =
    `Paid <code>${fmt(r.inUi, 4)} ${inLabel}</code><br>` +
    `Received <code>${fmt(r.outUi, 4)} ${outLabel}</code><br>` +
    `Signature: <code>${short(r.signature, 8, 8)}</code>`;
  el.resultLink.href = 'https://solscan.io/tx/' + r.signature;
}

function showError(msg) {
  el.tradeForm.hidden = true;
  el.errorCard.hidden = false;
  el.errorBody.innerHTML = '<code>' + (msg || 'Unknown error') + '</code>';
}

/* ---------------- wire up ---------------- */
el.connectBtn.addEventListener('click', connectWallet);
el.execBtn.addEventListener('click', executeSwap);
el.retryBtn.addEventListener('click', () => {
  el.errorCard.hidden = true;
  el.tradeForm.hidden = false;
  loadTradeQuote();
});
el.doneBtn.addEventListener('click', () => {
  // Try to close (works if opened as Telegram WebApp)
  if (window.Telegram?.WebApp?.close) window.Telegram.WebApp.close();
  else window.history.back();
});

// If Phantom is already connected from a previous session, auto-connect
(async function init() {
  const p = getPhantom();
  if (!p) {
    el.walletState.hidden = true;
    el.noPhantom.hidden = false;
    return;
  }
  // Pre-fill the trade header even before connect
  el.tradeSideBadge.textContent = state.side.toUpperCase();
  el.tradeSideBadge.className = 'side-badge ' + state.side;
  el.tokenSym.textContent = '$' + state.sym;
  // Some Phantoms auto-reconnect
  if (p.publicKey) {
    state.provider = p;
    state.walletAddr = p.publicKey.toString();
    state.connection = new Connection(rpcUrl(), { commitment: 'confirmed' });
    el.walletAddr.textContent = short(state.walletAddr, 6, 6);
    el.connectBtn.hidden = true;
    el.solBalance.hidden = false;
    el.tradeForm.hidden = false;
    await refreshSolBalance();
    await loadTradeQuote();
  }
})();
