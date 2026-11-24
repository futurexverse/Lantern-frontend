/* ===================================================================
   LANTERN — Dashboard Interactions & State
   Session, multi-view navigation, interactive tokens, SVG avatars,
   real-time filters, trade simulation, AI bot controls, wallets & theme
   =================================================================== */

// ---------- Session Handling (Default Guest Trader fallback) ----------
const session = (() => {
  try {
    const s = JSON.parse(localStorage.getItem('lantern:session'));
    return s && s.email ? s : { name: 'trader', email: 'trader@lantern.io' };
  } catch (e) {
    return { name: 'trader', email: 'trader@lantern.io' };
  }
})();

// ---------- Global Toast Feedback ----------
const toast = Object.assign(document.createElement('div'), {
  className: 'login-toast',
  role: 'status'
});
document.body.append(toast);

function showToast(msg) {
  let tone = 'info';
  let text = String(msg == null ? '' : msg);
  const m = text.match(/^\s*(✓|✦|✔|⚠|!)/);
  if (m) {
    tone = (m[1] === '✓' || m[1] === '✦' || m[1] === '✔') ? 'ok' : 'warn';
    text = text.slice(m[0].length).trim();
  }
  const icons = {
    ok: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
    info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>'
  };
  toast.className = 'login-toast tone-' + tone;
  toast.innerHTML = '<span class="toast-ico">' + icons[tone] + '</span><span class="toast-msg"></span>';
  const msgEl = toast.querySelector('.toast-msg');
  if (msgEl) msgEl.textContent = text;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ---------- Theme Management (Synced with Landing Page) ----------
(function initTheme() {
  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

  const saved = (() => {
    try { return localStorage.getItem('lantern:theme'); } catch (e) { return null; }
  })();

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', t === 'light' ? '#f8fafc' : '#06080f');
    }
    const sun = document.querySelector('.theme-btn .icon-sun');
    const moon = document.querySelector('.theme-btn .icon-moon');
    if (sun && moon) {
      sun.style.display = t === 'light' ? 'none' : 'block';
      moon.style.display = t === 'light' ? 'block' : 'none';
    }
    try { localStorage.setItem('lantern:theme', t); } catch (e) {}
  };

  applyTheme(saved || document.documentElement.dataset.theme || getSystemTheme());

  document.getElementById('dashThemeBtn')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
  });
})();

// ---------- User Personalization ----------
(function initUser() {
  const name = session.name || 'trader';
  const nameEl = document.getElementById('userName');
  if (nameEl) nameEl.textContent = name;
  const sideNameEl = document.getElementById('sideUserName');
  if (sideNameEl) sideNameEl.textContent = name;
  const dropNameEl = document.getElementById('dropdownUserName');
  if (dropNameEl) dropNameEl.textContent = name;

  const initial = (name[0] || 'L').toUpperCase();
  const avatar = document.getElementById('userAvatar');
  if (avatar) avatar.textContent = initial;
  const avatarSm = document.getElementById('userAvatarSm');
  if (avatarSm) avatarSm.textContent = initial;

  // Avatar dropdown menu toggle
  const menuWrap = document.querySelector('.user-menu-wrap');
  const dropdown = document.getElementById('userDropdown');
  avatar?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!menuWrap?.contains(e.target)) dropdown?.classList.remove('open');
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
})();

// ---------- Mobile Sidebar ----------
(function initMobileSidebar() {
  const sidebar = document.getElementById('dashSidebar');
  const overlay = document.getElementById('dashOverlay');
  const burger = document.getElementById('dashHamburger');
  if (!sidebar || !burger) return;

  const toggle = () => {
    const open = sidebar.classList.toggle('open');
    overlay?.classList.toggle('show', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  const close = () => {
    sidebar.classList.remove('open');
    overlay?.classList.remove('show');
    burger.setAttribute('aria-expanded', 'false');
  };

  burger.addEventListener('click', toggle);
  overlay?.addEventListener('click', close);
})();

// ---------- Multi-View Navigation (Every sidebar link works) ----------
const sectionView = document.getElementById('pageSection');
const VIEWS = {
  'Overview': document.getElementById('pageOverview'),
  'Discover': document.getElementById('pageDiscover'),
  'PnL & cards': document.getElementById('pagePnL'),
  'Portfolio': document.getElementById('pagePortfolio'),
  'Watchlist': document.getElementById('pageWatchlist'),
  'AI Trading': document.getElementById('pageAITrading'),
  'Auto Snipe': document.getElementById('pageAutoSnipe'),
  'Launchpad': document.getElementById('pageLaunchpad'),
  'Cabal leaderboard': sectionView,
  'Holder rewards': sectionView,
  'Referrals': sectionView,
  'Wallets': document.getElementById('pageWallets'),
  'Activity': sectionView,
  'Live feed': sectionView,
  'Token lookup': document.getElementById('pageTrade'),
  'Narratives': sectionView,
  'Alerts': sectionView,
  'Telegram': sectionView,
  'Bridge': sectionView,
  'AI Advanced': sectionView,
  'Strategy Lab': sectionView,
  'Proposals': sectionView,
  'Public calls': sectionView
};

// ---------- Section content ----------
const SECTION_DEFS = {
  'Cabal leaderboard': {
    sub: 'The cabal, ranked. Weekly volume and realized PnL across every tracked wallet.',
    cta: '<button class="btn-mini" data-sec="Leaderboard refreshed — you are rank #142.">Refresh</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Season prize</label><span class="sb-val">$25,000</span></div>
        <div class="sb-item"><label>Your rank</label><span class="sb-val">#142</span></div>
        <div class="sb-item"><label>Tracked wallets</label><span class="sb-val">8,412</span></div>
        <div class="sb-item"><label>Season ends</label><span class="sb-val">12d 04h</span></div>
      </div>
      <section class="market-card" style="margin-top:20px;">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Top of the cabal · this week</span></div>
        <div class="leader-row top"><span class="leader-rank">1</span><span class="medal" style="background:#fef3c7;">🥇</span><span class="leader-name">@voidrunner <small>SOL · 184 trades</small></span><span class="leader-val"><span class="chg up">+$48,204</span><br><small style="color:var(--ink-faint);">vol $1.2M</small></span></div>
        <div class="leader-row top"><span class="leader-rank">2</span><span class="medal" style="background:#e5e7eb;">🥈</span><span class="leader-name">@mevwhale <small>SOL · 92 trades</small></span><span class="leader-val"><span class="chg up">+$31,880</span><br><small style="color:var(--ink-faint);">vol $840K</small></span></div>
        <div class="leader-row top"><span class="leader-rank">3</span><span class="medal" style="background:#fed7aa;">🥉</span><span class="leader-name">@curvejeff <small>RBH · 140 trades</small></span><span class="leader-val"><span class="chg up">+$22,415</span><br><small style="color:var(--ink-faint);">vol $610K</small></span></div>
        <div class="leader-row"><span class="leader-rank">4</span><span class="medal" style="background:var(--bg-surface);color:var(--ink-faint);font-size:11px;font-weight:700;">4</span><span class="leader-name">@snipergod <small>SOL · 77 trades</small></span><span class="leader-val"><span class="chg up">+$18,902</span><br><small style="color:var(--ink-faint);">vol $512K</small></span></div>
        <div class="leader-row"><span class="leader-rank">5</span><span class="medal" style="background:var(--bg-surface);color:var(--ink-faint);font-size:11px;font-weight:700;">5</span><span class="leader-name">@bagholder <small>RBH · 203 trades</small></span><span class="leader-val"><span class="chg down">-$4,118</span><br><small style="color:var(--ink-faint);">vol $388K</small></span></div>
      </section>`
  },
  'Holder rewards': {
    sub: 'Every epoch pays a slice of platform fees to $LANTERN holders. Claim whenever.',
    cta: '<button class="btn-mini" data-sec="✓ $42.18 rewards claimed to your wallet.">Claim all</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Your holdings</label><span class="sb-val">14,285,714</span></div>
        <div class="sb-item"><label>Claimable now</label><span class="sb-val up">$42.18</span></div>
        <div class="sb-item"><label>Rewards APR</label><span class="sb-val">18.4%</span></div>
        <div class="sb-item"><label>Current epoch</label><span class="sb-val">#42</span></div>
      </div>
      <section class="market-card" style="margin-top:20px;">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Reward epochs</span></div>
        <table class="market-table">
          <thead><tr><th>Epoch</th><th>Window</th><th>Your share</th><th>Reward</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><strong>#42</strong></td><td><span class="price-cell">live</span></td><td><span class="price-cell">0.014%</span></td><td><span class="chg up">$42.18</span></td><td><button class="table-trade-btn" data-sec="✓ Epoch 42 rewards claimed.">Claim</button></td></tr>
            <tr><td><strong>#41</strong></td><td><span class="price-cell">7 days</span></td><td><span class="price-cell">0.014%</span></td><td><span class="chg up">$38.90</span></td><td><button class="table-trade-btn" data-sec="Already claimed in epoch 41.">Claimed</button></td></tr>
            <tr><td><strong>#40</strong></td><td><span class="price-cell">7 days</span></td><td><span class="price-cell">0.011%</span></td><td><span class="chg up">$27.44</span></td><td><button class="table-trade-btn" data-sec="Already claimed in epoch 40.">Claimed</button></td></tr>
          </tbody>
        </table>
      </section>`
  },
  'Referrals': {
    sub: 'Bring friends along. You earn 10% of their trading fees, forever.',
    cta: '<button class="btn-mini" data-sec="copy-ref">Copy link</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Invites joined</label><span class="sb-val">14</span></div>
        <div class="sb-item"><label>Referred volume</label><span class="sb-val">$82.4K</span></div>
        <div class="sb-item"><label>Your earnings</label><span class="sb-val up">$186.40</span></div>
        <div class="sb-item"><label>Tier</label><span class="sb-val">Gold · 15%</span></div>
      </div>
      <div class="referral-box" style="margin-top:20px;">
        <span style="flex:1;">t.me/lantern_bot?start=ref-trader-8f2a</span>
        <button class="table-trade-btn" data-sec="copy-ref">Copy</button>
      </div>
      <section class="market-card" style="margin-top:20px;">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Recent invites</span></div>
        <table class="market-table">
          <thead><tr><th>Friend</th><th>Joined</th><th>Their volume</th><th>Commission</th></tr></thead>
          <tbody>
            <tr><td><strong>@hopper</strong></td><td><span class="price-cell">2d ago</span></td><td><span class="price-cell">$12.4K</span></td><td><span class="chg up">+$31.02</span></td></tr>
            <tr><td><strong>@degen_ana</strong></td><td><span class="price-cell">6d ago</span></td><td><span class="price-cell">$44.1K</span></td><td><span class="chg up">+$98.60</span></td></tr>
            <tr><td><strong>@bugzy</strong></td><td><span class="price-cell">2w ago</span></td><td><span class="price-cell">$25.9K</span></td><td><span class="chg up">+$56.78</span></td></tr>
          </tbody>
        </table>
      </section>`
  },
  'Wallets': {
    sub: 'Solana and Robinhood Chain wallets, with balances and positions in one place.',
    cta: '<button class="btn-mini" data-sec="create-wallets">Create wallets</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Total net worth</label><span class="sb-val">$14,892.40</span></div>
        <div class="sb-item"><label>24h change</label><span class="sb-val up">+$842.10 (+6.0%)</span></div>
        <div class="sb-item"><label>Chains</label><span class="sb-val">SOL + RBH</span></div>
        <div class="sb-item"><label>Open positions</label><span class="sb-val">7</span></div>
      </div>
      <div class="sec-grid" style="margin-top:20px;">
        <div class="sec-card"><h4>◎ Solana</h4><p style="font-family:'JetBrains Mono',monospace;font-size:12px;word-break:break-all;">7xKX...9fQa<br>28.5 SOL · $5,251.12</p><div class="sec-meta"><span>+6.14% 24h</span><span class="chg up">+$304.20</span></div><button class="btn-mini" style="width:100%;justify-content:center;" data-sec="SOL address copied.">Copy address</button></div>
        <div class="sec-card"><h4>◆ Robinhood Chain</h4><p style="font-family:'JetBrains Mono',monospace;font-size:12px;word-break:break-all;">0xF4c2...8B1e<br>12.4 RBH · $7,270.12</p><div class="sec-meta"><span>+4.55% 24h</span><span class="chg up">+$316.80</span></div><button class="btn-mini" style="width:100%;justify-content:center;" data-sec="RBH address copied.">Copy address</button></div>
        <div class="sec-card"><h4>✦ Watch-only</h4><p>Track any address without exposing keys. Balances and positions refresh every 12 seconds.</p><div class="sec-meta"><span>0 added</span><span>—</span></div><button class="btn-mini" style="width:100%;justify-content:center;" data-sec="Paste an address to track it watch-only.">Add address</button></div>
      </div>`
  },
  'Activity': {
    sub: 'Everything your account did, newest first. Trades, claims, alerts and logins.',
    cta: '<button class="btn-mini" data-sec="Activity exported as CSV.">Export</button>',
    body: `
      <section class="market-card">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Today</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#10b981;"></span><strong>BUY</strong> 0.25 SOL → <strong>$CALLER</strong> @ $0.0000110<span class="feed-time">14:02</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#00d4ff;"></span><strong>CLAIM</strong> epoch #41 rewards <span class="feed-time">13:45</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#ef4444;"></span><strong>SELL</strong> $FSP @ $0.00000487 · stop loss<span class="feed-time">12:18</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#f59e0b;"></span><strong>ALERT</strong> $TMNT crossed +3% in 5m<span class="feed-time">11:52</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#8b5cf6;"></span><strong>LOGIN</strong> Telegram session · new device<span class="feed-time">09:31</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#10b981;"></span><strong>BUY</strong> 0.15 RBH → <strong>$LANTERN</strong> @ $0.00000078<span class="feed-time">08:47</span></div>
      </section>`
  },
  'Live feed': {
    sub: 'Every buy and sell across supported chains, streamed as it happens.',
    cta: '<button class="btn-mini" data-sec="Feed paused. Click again to resume.">Pause feed</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Events / min</label><span class="sb-val">128</span></div>
        <div class="sb-item"><label>Buyers</label><span class="sb-val up">54%</span></div>
        <div class="sb-item"><label>Sellers</label><span class="sb-val">46%</span></div>
        <div class="sb-item"><label>Latency</label><span class="sb-val">12ms</span></div>
      </div>
      <section class="market-card" style="margin-top:20px;">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Stream</span><span class="token-chain-badge" style="color:#10b981;border-color:#10b981;">● LIVE</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#10b981;"></span><strong>BUY</strong> $CAT · 2.4 SOL · $49.9<span class="feed-time">now</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#ef4444;"></span><strong>SELL</strong> $LEGO · 0.8 SOL · $5.9<span class="feed-time">3s</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#10b981;"></span><strong>BUY</strong> $GTACAT · 1.1 RBH · $44.8<span class="feed-time">7s</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#10b981;"></span><strong>BUY</strong> $TMNT · 5.6 SOL · $115<span class="feed-time">12s</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#ef4444;"></span><strong>SELL</strong> $QUESTLY · 0.3 SOL · $0.8<span class="feed-time">18s</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#10b981;"></span><strong>BUY</strong> $CALLER · 3.2 SOL · $69.4<span class="feed-time">21s</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#ef4444;"></span><strong>SELL</strong> $WIN · 1.9 SOL · $4.8<span class="feed-time">26s</span></div>
      </section>`
  },
  'Token lookup': {
    sub: 'Paste any contract for an AI risk read: rug odds, narrative and quality.',
    cta: '',
    body: `
      <div class="lookup-input" style="max-width:640px;">
        <input class="ai-input" id="lookupAddr" type="text" placeholder="Paste a contract address (e.g. 998t2u1f...pump)" autocomplete="off" spellcheck="false">
        <button class="btn-mini" data-sec="lookup">Run AI screen</button>
      </div>
      <div class="sec-grid" style="margin-top:20px;">
        <div class="sec-card"><h4>🛡 Rug odds</h4><p>Liquidity is locked, mint authority revoked and the deployer holds under 2%. No red flags in the bytecode.</p><div class="risk-meter"><i style="width:12%;background:#10b981;"></i></div><div class="sec-meta"><span>LOW RISK</span><span class="chg up">12%</span></div></div>
        <div class="sec-card"><h4>🧠 Narrative</h4><p>Classified as an AI meme with a strong caller wave. Mentions up 4.2× in the last hour across tracked channels.</p><div class="sec-meta"><span>AI MEMES</span><span class="chg up">hot</span></div></div>
        <div class="sec-card"><h4>✦ Quality</h4><p>Original art, active community and consistent buys. Scored above 80% of launches this week.</p><div class="risk-meter"><i style="width:81%;background:var(--cyan);"></i></div><div class="sec-meta"><span>GRADE</span><span class="chg up">A-</span></div></div>
      </div>`
  },
  'Narratives': {
    sub: 'Track the stories moving the market before the charts do.',
    cta: '<button class="btn-mini" data-sec="Narrative alerts enabled for the top 3.">Track top 3</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Active narratives</label><span class="sb-val">9</span></div>
        <div class="sb-item"><label>Hottest</label><span class="sb-val up">AI memes</span></div>
        <div class="sb-item"><label>24h narrative vol</label><span class="sb-val">$482K</span></div>
        <div class="sb-item"><label>New today</label><span class="sb-val">2</span></div>
      </div>
      <div class="sec-grid" style="margin-top:20px;">
        <div class="sec-card"><h4>🤖 AI memes</h4><p>Agents, neural cats and robot frogs. The engine's highest-conviction bucket three days running.</p><div class="sec-meta"><span>42 tokens</span><span class="chg up">+18.4%</span></div></div>
        <div class="sec-card"><h4>🧱 Lego meta</h4><p>Brick-built islands and blocky homages. Fresh wave with rising caller participation.</p><div class="sec-meta"><span>11 tokens</span><span class="chg up">+6.2%</span></div></div>
        <div class="sec-card"><h4>🐸 Dog & frog coins</h4><p>The evergreen memecoin crowd. High volume, high churn — size small and stay quick.</p><div class="sec-meta"><span>67 tokens</span><span class="chg down">-3.1%</span></div></div>
        <div class="sec-card"><h4>🏛 Political</h4><p>Election-season tickers and tribute coins. Spiky, event-driven moves.</p><div class="sec-meta"><span>23 tokens</span><span class="chg up">+9.7%</span></div></div>
      </div>`
  },
  'Alerts': {
    sub: 'Price, liquidity and social triggers pushed straight to Telegram.',
    cta: '<button class="btn-mini" data-sec="New alert draft created.">New alert</button>',
    body: `
      <section class="market-card">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Your alerts</span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#00d4ff;"></span><span style="flex:1;"><strong>$LANTERN</strong> crosses $0.00000100</span><span class="token-chain-badge">PRICE</span><span class="alert-toggle on"></span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#10b981;"></span><span style="flex:1;"><strong>$CAT</strong> liquidity added &gt; $10K</span><span class="token-chain-badge">LIQ</span><span class="alert-toggle on"></span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#f59e0b;"></span><span style="flex:1;"><strong>$CALLER</strong> mentioned by 3+ callers</span><span class="token-chain-badge">SOCIAL</span><span class="alert-toggle on"></span></div>
        <div class="feed-row"><span class="feed-dot" style="background:#8b5cf6;"></span><span style="flex:1;"><strong>$TMNT</strong> down 20% from entry</span><span class="token-chain-badge">RISK</span><span class="alert-toggle"></span></div>
      </section>`
  },
  'Telegram': {
    sub: 'Trade, get alerts and check positions without leaving the chat.',
    cta: '<button class="btn-mini" data-sec="Test alert sent to @lantern_bot.">Send test</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Status</label><span class="sb-val up">Connected</span></div>
        <div class="sb-item"><label>Account</label><span class="sb-val">@trader</span></div>
        <div class="sb-item"><label>Alerts today</label><span class="sb-val">14</span></div>
        <div class="sb-item"><label>Commands</label><span class="sb-val">18</span></div>
      </div>
      <div class="sec-grid" style="margin-top:20px;">
        <div class="sec-card"><h4>⚡ Trade from chat</h4><p>/buy 0.25 CALLER · /sell all · /positions — executed through the same engine as the dashboard.</p><div class="sec-meta"><span>/buy /sell</span><span>enabled</span></div></div>
        <div class="sec-card"><h4>🔔 Instant alerts</h4><p>Fills, rug warnings and alert triggers arrive the moment they fire — no refresh needed.</p><div class="sec-meta"><span>push</span><span class="chg up">on</span></div></div>
        <div class="sec-card"><h4>🛡 Guardian</h4><p>Close positions or kill the AI agent from chat if the dashboard is out of reach.</p><div class="sec-meta"><span>/guard</span><span>armed</span></div></div>
      </div>`
  },
  'Bridge': {
    sub: 'Move funds between Solana and Robinhood Chain in one hop.',
    cta: '<button class="btn-mini" data-sec="✦ Bridge submitted — 42s ETA.">Bridge</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Routes</label><span class="sb-val">6</span></div>
        <div class="sb-item"><label>Avg. time</label><span class="sb-val">42s</span></div>
        <div class="sb-item"><label>Fee</label><span class="sb-val">0.1%</span></div>
        <div class="sb-item"><label>Your bridges</label><span class="sb-val">3</span></div>
      </div>
      <section class="market-card" style="margin-top:20px;">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Recent bridges</span></div>
        <table class="market-table">
          <thead><tr><th>From</th><th>To</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td><strong>SOL</strong></td><td><strong>RBH</strong></td><td><span class="price-cell">1.5 SOL</span></td><td><span class="token-chain-badge" style="color:#10b981;border-color:#10b981;">DONE · 38s</span></td></tr>
            <tr><td><strong>RBH</strong></td><td><strong>SOL</strong></td><td><span class="price-cell">220 RBH</span></td><td><span class="token-chain-badge" style="color:#10b981;border-color:#10b981;">DONE · 45s</span></td></tr>
            <tr><td><strong>SOL</strong></td><td><strong>RBH</strong></td><td><span class="price-cell">0.4 SOL</span></td><td><span class="token-chain-badge" style="color:#f59e0b;border-color:#f59e0b;">PENDING</span></td></tr>
          </tbody>
        </table>
      </section>`
  },
  'AI Advanced': {
    sub: 'Fine-tune the agent: model, confidence gates and hard guardrails.',
    cta: '<button class="btn-mini" data-sec="✓ Advanced AI config saved to the agent.">Save config</button>',
    body: `
      <div class="ai-config-grid">
        <div class="ai-card">
          <h4>Model &amp; confidence</h4>
          <div class="strat-options">
            <label class="strat-opt active"><input type="radio" name="advmodel" checked> lantern-core v3</label>
            <label class="strat-opt"><input type="radio" name="advmodel"> lantern-fast v2</label>
            <label class="strat-opt"><input type="radio" name="advmodel"> ensemble</label>
          </div>
          <div class="ai-slider-row" style="margin-top:14px;">
            <label>Min confidence to buy: <strong id="confVal">72%</strong></label>
            <input type="range" min="40" max="95" step="1" value="72" id="confRange">
          </div>
        </div>
        <div class="ai-card">
          <h4>Hard guardrails</h4>
          <div class="checkbox-row">
            <label><input type="checkbox" checked> Kill-switch on 3 consecutive losses</label>
            <label><input type="checkbox" checked> Never buy above $50K MCAP</label>
            <label><input type="checkbox" checked> Auto-exit if liquidity drops 40%</label>
            <label><input type="checkbox"> Allow sniping inside first 3 blocks</label>
          </div>
        </div>
      </div>`
  },
  'Strategy Lab': {
    sub: 'Backtest ideas against historical launches before risking a cent.',
    cta: '<button class="btn-mini" data-sec="✦ Backtest queued — results in ~20s.">Run backtest</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Strategies</label><span class="sb-val">7</span></div>
        <div class="sb-item"><label>Best backtest</label><span class="sb-val up">+214%</span></div>
        <div class="sb-item"><label>Avg. Sharpe</label><span class="sb-val">1.8</span></div>
        <div class="sb-item"><label>Running now</label><span class="sb-val">1</span></div>
      </div>
      <div class="sec-grid" style="margin-top:20px;">
        <div class="sec-card"><h4>Curve graduate fade</h4><p>Short tokens that spike on graduation, exit at +25% or trailing 8%.</p><div class="sec-meta"><span>90d · 412 trades</span><span class="chg up">+214%</span></div></div>
        <div class="sec-card"><h4>Caller copy 3m</h4><p>Mirror verified callers within 3 minutes, fixed 0.2 SOL sizing, hard stop -15%.</p><div class="sec-meta"><span>90d · 288 trades</span><span class="chg up">+96%</span></div></div>
        <div class="sec-card"><h4>Narrative DCA</h4><p>Split entries across 45 minutes when a narrative crosses the heat threshold.</p><div class="sec-meta"><span>90d · 61 trades</span><span class="chg down">-12%</span></div></div>
      </div>`
  },
  'Proposals': {
    sub: 'Governance votes for fee switches, reward epochs and treasury moves.',
    cta: '<button class="btn-mini" data-sec="Draft proposal created — needs 10K voting power.">New proposal</button>',
    body: `
      <section class="market-card">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Open votes</span></div>
        <div class="feed-row" style="flex-direction:column;align-items:stretch;gap:8px;">
          <span style="display:flex;gap:10px;align-items:center;"><strong style="flex:1;">P-18 · Route 20% of fees into holder rewards</strong><span class="token-chain-badge" style="color:#10b981;border-color:#10b981;">PASSING</span></span>
          <span class="vote-bar"><i style="width:78%"></i><i class="against" style="width:22%"></i></span>
          <span class="sec-meta"><span>78% for · 4.2M votes</span><span>ends in 2d</span></span>
        </div>
        <div class="feed-row" style="flex-direction:column;align-items:stretch;gap:8px;">
          <span style="display:flex;gap:10px;align-items:center;"><strong style="flex:1;">P-17 · Add Robinhood Chain to bridge routes</strong><span class="token-chain-badge" style="color:#10b981;border-color:#10b981;">PASSING</span></span>
          <span class="vote-bar"><i style="width:64%"></i><i class="against" style="width:36%"></i></span>
          <span class="sec-meta"><span>64% for · 3.1M votes</span><span>ends in 5d</span></span>
        </div>
        <div class="feed-row" style="flex-direction:column;align-items:stretch;gap:8px;">
          <span style="display:flex;gap:10px;align-items:center;"><strong style="flex:1;">P-16 · Raise launch fee to $69</strong><span class="token-chain-badge" style="color:#ef4444;border-color:#ef4444;">FAILING</span></span>
          <span class="vote-bar"><i style="width:31%"></i><i class="against" style="width:69%"></i></span>
          <span class="sec-meta"><span>31% for · 1.9M votes</span><span>ends in 1d</span></span>
        </div>
      </section>`
  },
  'Public calls': {
    sub: 'Verified public calls with entry, current price and live ROI.',
    cta: '<button class="btn-mini" data-sec="Only verified callers can post public calls.">Post a call</button>',
    body: `
      <div class="stats-banner">
        <div class="sb-item"><label>Calls today</label><span class="sb-val">12</span></div>
        <div class="sb-item"><label>Win rate</label><span class="sb-val up">68%</span></div>
        <div class="sb-item"><label>Avg. ROI</label><span class="sb-val up">+42%</span></div>
        <div class="sb-item"><label>Verified callers</label><span class="sb-val">9</span></div>
      </div>
      <section class="market-card" style="margin-top:20px;">
        <div class="market-header"><span style="font-weight:700;font-size:15px;">Open calls</span></div>
        <table class="market-table">
          <thead><tr><th>Caller</th><th>Token</th><th>Entry</th><th>Now</th><th>ROI</th></tr></thead>
          <tbody>
            <tr><td><strong>@voidrunner</strong></td><td><strong>$CALLER</strong></td><td><span class="price-cell">$0.0000110</span></td><td><span class="price-cell">$0.0000217</span></td><td><span class="chg up">+97.3%</span></td></tr>
            <tr><td><strong>@mevwhale</strong></td><td><strong>$GTACAT</strong></td><td><span class="price-cell">$0.0000392</span></td><td><span class="price-cell">$0.0000408</span></td><td><span class="chg up">+4.1%</span></td></tr>
            <tr><td><strong>@curvejeff</strong></td><td><strong>$TRACE</strong></td><td><span class="price-cell">$0.0000039</span></td><td><span class="price-cell">$0.0000046</span></td><td><span class="chg up">+17.9%</span></td></tr>
            <tr><td><strong>@snipergod</strong></td><td><strong>$QUESTLY</strong></td><td><span class="price-cell">$0.0000068</span></td><td><span class="price-cell">$0.00000269</span></td><td><span class="chg down">-60.4%</span></td></tr>
          </tbody>
        </table>
      </section>`
  }
};

function renderSection(name) {
  const def = SECTION_DEFS[name];
  if (!def || !sectionView) return;
  sectionView.innerHTML = `
    <div class="view-header">
      <div><h2>${name}</h2><p class="view-sub">${def.sub}</p></div>
      ${def.cta || ''}
    </div>
    ${def.body}`;

  sectionView.querySelectorAll('.alert-toggle').forEach(t => {
    t.addEventListener('click', () => {
      t.classList.toggle('on');
      showToast(t.classList.contains('on') ? '🔔 Alert enabled.' : 'Alert disabled.');
    });
  });
  sectionView.querySelectorAll('[data-sec]').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.sec;
      if (a === 'create-wallets') { createWallets(); return; }
      if (a === 'copy-ref') {
        try { navigator.clipboard.writeText('https://t.me/lantern_bot?start=ref-trader-8f2a'); } catch (e) {}
        showToast('✓ Referral link copied.');
        return;
      }
      if (a === 'lookup') {
        const v = (document.getElementById('lookupAddr')?.value || '').trim();
        showToast(v ? `✦ AI screen complete for ${v.slice(0, 14)}… — low risk.` : 'Paste a contract address first.');
        return;
      }
      showToast(`✦ ${a}`);
    });
  });
  const conf = sectionView.querySelector('#confRange');
  conf?.addEventListener('input', () => {
    const el = sectionView.querySelector('#confVal');
    if (el) el.textContent = `${conf.value}%`;
  });
}

function showView(viewName) {
  if (!VIEWS[viewName]) return;

  Object.values(VIEWS).forEach(v => { if (v) v.hidden = true; });
  VIEWS[viewName].hidden = false;

  document.querySelectorAll('.side-link').forEach(l => {
    l.classList.toggle('active', l.dataset.nav === viewName);
  });

  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = viewName;
  document.title = `${viewName} — LANTERN Dashboard`;

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Refresh view-specific content
  if (SECTION_DEFS[viewName]) renderSection(viewName);
  if (viewName === 'Discover') renderDiscoverGrid();
  if (viewName === 'PnL & cards') renderTradeHistory().catch(() => {});
  if (viewName === 'Overview') renderOverviewPerformance();
  if (viewName === 'Portfolio') renderPortfolio().catch(() => {});
  if (viewName === 'Watchlist') renderWatchlist();
  if (viewName === 'AI Trading') renderAiPositions();
  if (viewName === 'Launchpad') renderLaunchpad();
  if (viewName === 'Token lookup') initTradeView();
  if (viewName === 'Wallets') renderWalletsView();
}

document.querySelectorAll('.side-link, [data-nav]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const nav = link.dataset.nav;
    if (nav && VIEWS[nav]) {
      showView(nav);
      if (window.innerWidth <= 1024) {
        document.getElementById('dashSidebar')?.classList.remove('open');
        document.getElementById('dashOverlay')?.classList.remove('show');
      }
    }
  });
});

// ---------- Token Database — LANTERN engine tokens (live market data) ----------
function tokenPic(t) {
  return t.img
    ? `<img src="${t.img}" alt="${t.sym} logo" loading="lazy" onerror="this.style.display='none'">`
    : (t.svg || '');
}

// ---------- Live market list (hydrated from DexScreener / GeckoTerminal) ----------
// Starts empty: the table shows a loading row until hydrateMarketData()
// fills it with real mints, prices, 24h change, volume and liquidity.
let TOKENS = [];

async function hydrateMarketData() {
  const D = window.LANTERN && window.LANTERN.data;
  if (!D || hydrateMarketData.running) return;
  hydrateMarketData.running = true;
  try {
    const [trend, aiHits, pools, majors] = await Promise.all([
      D.trending(10),
      D.search('ai', 8).catch(() => []),
      D.newPools(8),
      Promise.all(['SOL', 'BONK', 'WIF', 'JUP', 'RAY', 'PYTH'].map(q =>
        D.search(q, 1).then(r => (r && r[0]) || null).catch(() => null)))
    ]);

    const byMint = {};
    const add = (mint, info, cats) => {
      if (!mint) return;
      if (!byMint[mint]) byMint[mint] = { mint: mint, cats: [], info: info || null };
      else if (info && !byMint[mint].info) byMint[mint].info = info;
      cats.forEach(c => { if (byMint[mint].cats.indexOf(c) === -1) byMint[mint].cats.push(c); });
    };
    (trend || []).forEach(t => add(t.mint, t.info, ['all', 'trending']));
    (aiHits || []).forEach(f => add(f.mint, f, ['all', 'ai']));
    (pools || []).forEach(p => add(p.mint, null, ['all', 'new']));
    (majors || []).forEach(f => { if (f) add(f.mint, f, ['all']); });

    const mints = Object.keys(byMint);
    if (!mints.length) return;

    const infos = {};
    for (let i = 0; i < mints.length; i += 30) {
      Object.assign(infos, await D.infoBatch(mints.slice(i, i + 30)));
    }

    const rows = [];
    mints.forEach(mint => {
      const rec = byMint[mint];
      const inf = infos[mint] || rec.info;
      if (!inf || inf.price == null) return;
      const chg = inf.change ? inf.change.h24 : null;
      const cats = rec.cats.slice();
      if (cats.indexOf('all') === -1) cats.unshift('all');
      rows.push({
        id: mint,
        mint: mint,
        sym: '$' + String(inf.symbol || '?').replace(/^\$+/g, '').trim().slice(0, 10).trim(),
        name: inf.name || inf.symbol || mint.slice(0, 6),
        chain: 'SOL',
        price: fmtPrice(inf.price),
        chg: fmtPct(chg),
        up: chg == null || chg >= 0,
        vol: fmtMoney(inf.vol24),
        liq: fmtMoney(inf.liq),
        img: inf.image || null,
        category: cats
      });
    });

    // "Top Gainers" tab — real 24h performers
    rows.slice()
      .sort((a, b) => (parseFloat(b.chg) || -999) - (parseFloat(a.chg) || -999))
      .slice(0, 6)
      .forEach(r => { if (r.chg.charAt(0) === '+' && r.category.indexOf('gainers') === -1) r.category.push('gainers'); });

    if (!rows.length) return;
    TOKENS = rows;
    renderMarketTable();
    if (VIEWS['Discover'] && !VIEWS['Discover'].hidden) renderDiscoverGrid();
    renderWatchlist();
  } catch (e) {
    // network hiccup — the next interval tick retries
  } finally {
    hydrateMarketData.running = false;
  }
}

// Live $LATERN market stats for the Overview callout (price, MC, vol, buyers, liq).
// If LATERN_MINT is empty, the hero shows a placeholder telling you to set it.
async function loadOverviewCallout() {
  const D = window.LANTERN && window.LANTERN.data;
  if (!D) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  // If no LATERN mint configured, show placeholders + the SOL chart fallback.
  if (!LATERN_MINT) {
    set('coPrice', '\u2014');
    set('coMcap', '\u2014');
    set('coVol', '\u2014');
    set('coBuyers', '\u2014');
    set('coLiq', '\u2014');
    set('contractAddress', '—');
    const sub = document.getElementById('calloutSub');
    if (sub) sub.textContent = 'Paste the $LATERN mint at the top of dashboard.js to load live stats.';
    // Still load the SOL chart as a visual fallback so the page doesn't look broken
    try {
      if (!marketChart.pair) marketChart.pair = await D.tokenInfo(SOL_MINT_LIT);
    } catch (e) {}
    return;
  }

  try {
    const [info, px] = await Promise.all([
      D.tokenInfo(LATERN_MINT).catch(() => null),
      D.prices([LATERN_MINT]).catch(() => null)
    ]);
    const price = (px && px[LATERN_MINT] && px[LATERN_MINT].usd != null)
      ? px[LATERN_MINT].usd
      : (info && info.price);
    if (price != null) set('coPrice', fmtPrice(price));

    if (info) {
      set('coVol', fmtMoney(info.vol24));
      set('coBuyers', info.buys24 != null ? compactNum(info.buys24) : '\u2014');
      set('coLiq', fmtMoney(info.liq));
      // DexScreener's marketCap for SPL tokens IS the real market cap (unlike WSOL).
      if (info.mcap != null) set('coMcap', fmtMoney(info.mcap));
      else if (info.fdv != null) set('coMcap', fmtMoney(info.fdv));
      marketChart.pair = info;  // reuse for the live chart below
      const img = document.getElementById('calloutMascot');
      if (img && info.image) img.src = info.image;
    }

    // Update the contract address display with the real LATERN mint
    set('contractAddress', LATERN_MINT);
  } catch (e) {
    // callout stays on dash if DexScreener is unreachable
  }
}

/** First promise to yield a non-null value (or null after `ms`). */
function firstValue(promises, ms) {
  if (!promises.length) return Promise.resolve(null);
  return new Promise(resolve => {
    let pending = promises.length;
    const timer = setTimeout(() => resolve(null), ms || 8000);
    promises.forEach(p => Promise.resolve(p).then(v => {
      if (v != null) { clearTimeout(timer); resolve(v); return; }
      if (--pending === 0) { clearTimeout(timer); resolve(null); }
    }, () => {
      if (--pending === 0) { clearTimeout(timer); resolve(null); }
    }));
  });
}

function scheduleCalloutRecheck() {
  if (scheduleCalloutRecheck.t) return;
  scheduleCalloutRecheck.tries = (scheduleCalloutRecheck.tries || 0) + 1;
  scheduleCalloutRecheck.t = setTimeout(() => {
    scheduleCalloutRecheck.t = null;
    loadOverviewCallout();
  }, 3000);
}

// ---------- Watchlist LocalStorage State ----------
const WATCHLIST_DEFAULT = [];
function getWatchlist() {
  try {
    const raw = JSON.parse(localStorage.getItem('lantern:watchlist'));
    if (!Array.isArray(raw)) return [];
    return raw.filter(id => TOKENS.some(t => t.id === id));
  } catch (e) { return []; }
}
function toggleWatchlist(tokenId) {
  let list = getWatchlist();
  if (list.includes(tokenId)) {
    list = list.filter(id => id !== tokenId);
    showToast(`Removed from watchlist.`);
  } else {
    list.push(tokenId);
    showToast(`★ Added to watchlist.`);
  }
  try { localStorage.setItem('lantern:watchlist', JSON.stringify(list)); } catch (e) {}
  renderMarketTable();
}

// ---------- Market Table Rendering & Filtering ----------
let currentFilter = 'all';
let searchQuery = '';

// Any "Trade" button anywhere opens the real lookup/swap view (Jupiter routed)
function quickTrade(q) {
  showView('Token lookup');
  openTradeToken(String(q || '').replace(/^\$+/, ''));
}

function renderMarketTable() {
  const body = document.getElementById('marketBody');
  if (!body) return;

  if (!TOKENS.length) {
    body.innerHTML = '<tr><td colspan="6" class="t-name" style="text-align:center;padding:28px;"><span class="spin"></span> Loading live market…</td></tr>';
    const cnt0 = document.getElementById('marketCount');
    if (cnt0) cnt0.textContent = 'Loading live prices from DexScreener…';
    return;
  }

  const watched = getWatchlist();
  const filtered = TOKENS.filter(t => {
    const matchesFilter = currentFilter === 'all' || t.category.includes(currentFilter);
    const matchesSearch = !searchQuery ||
      t.sym.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  body.innerHTML = filtered.map(t => {
    const isStarred = watched.includes(t.id);
    return `
      <tr>
        <td>
          <div class="token-cell">
            <button class="star-btn ${isStarred ? 'starred' : ''}" data-star="${t.id}" title="${isStarred ? 'Unstar' : 'Star'}">
              ★
            </button>
            <div class="token-pic">${tokenPic(t)}</div>
            <div class="token-info">
              <span class="t-sym">${t.sym} <span class="token-chain-badge">${t.chain}</span></span>
              <span class="t-name">${t.name}</span>
            </div>
          </div>
        </td>
        <td><span class="price-cell">${t.price}</span></td>
        <td><span class="chg ${t.up ? 'up' : 'down'}">${t.chg}</span></td>
        <td class="col-vol"><span class="price-cell" style="font-size:12.5px">${t.vol}</span></td>
        <td class="col-liq"><span class="price-cell" style="font-size:12.5px">${t.liq}</span></td>
        <td>
          <button class="table-trade-btn" data-trade="${t.mint || t.sym}" data-chain="${t.chain}">Trade</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('marketCount').textContent =
    `Showing ${filtered.length} live tokens · prices via DexScreener · refreshes every 60s`;

  // Star event listeners
  body.querySelectorAll('[data-star]').forEach(btn => {
    btn.addEventListener('click', () => toggleWatchlist(btn.dataset.star));
  });

  // Trade buttons
  body.querySelectorAll('[data-trade]').forEach(btn => {
    btn.addEventListener('click', () => quickTrade(btn.dataset.trade));
  });
}

// Market category tabs
document.querySelectorAll('#marketTabs .m-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#marketTabs .m-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderMarketTable();
  });
});

// Real-time table filter input
document.getElementById('tableFilterInput')?.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderMarketTable();
});

// Topbar search input
const topSearch = document.getElementById('searchInput');
topSearch?.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  if (VIEWS['Overview'].hidden) showView('Overview');
  renderMarketTable();
});

// Slash key hotkey focuses search
document.addEventListener('keydown', (e) => {
  const buyOpen = document.getElementById('buyOverlay')?.classList.contains('show');
  const wizOpen = document.getElementById('launchOverlay')?.classList.contains('show');
  if (e.key === '/' && document.activeElement !== topSearch && !buyOpen && !wizOpen) {
    e.preventDefault();
    topSearch?.focus();
  }
});

// ---------- View 2: Discover Grid Rendering ----------
function renderDiscoverGrid() {
  const grid = document.getElementById('discoverGrid');
  if (!grid) return;

  if (!TOKENS.length) {
    grid.innerHTML = '<div class="t-name" style="grid-column:1/-1;text-align:center;padding:30px;"><span class="spin"></span> Loading live market…</div>';
    return;
  }

  grid.innerHTML = TOKENS.slice(0, 9).map(t => `
    <div class="disc-card">
      <div class="disc-head">
        <div class="token-cell">
          <div class="token-pic">${tokenPic(t)}</div>
          <div class="token-info">
            <span class="t-sym">${t.sym}</span>
            <span class="t-name">${t.name}</span>
          </div>
        </div>
        <span class="chg ${t.up ? 'up' : 'down'}">${t.chg}</span>
      </div>
      <div class="disc-stats">
        <div><label>Price</label><span>${t.price}</span></div>
        <div><label>24h Vol</label><span>${t.vol}</span></div>
        <div><label>Liquidity</label><span>${t.liq}</span></div>
        <div><label>Chain</label><span>${t.chain}</span></div>
      </div>
      <button class="btn-mini" style="width:100%;justify-content:center;" data-trade="${t.mint || t.sym}" data-chain="${t.chain}">
        Quick Snipe ${t.sym}
      </button>
    </div>
  `).join('');

  grid.querySelectorAll('[data-trade]').forEach(btn => {
    btn.addEventListener('click', () => quickTrade(btn.dataset.trade));
  });
}

document.querySelectorAll('.filter-pills .fp-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.filter-pills .fp-btn').forEach(btn => btn.classList.remove('active'));
    b.classList.add('active');
    renderDiscoverGrid();
    showToast(`Filtered: ${b.textContent}`);
  });
});

// ---------- Professional Performance Charts (Hand-Rendered SVG) ----------
function buildSmoothPath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function renderPerfChart(containerId, values, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el || !values || values.length < 2) return;

  const W = 640;
  const H = window.innerWidth <= 768 ? 180 : (opts.height || 200);
  const PAD = { t: 14, r: 14, b: 14, l: 46 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const lo = min - span * 0.18;
  const hi = max + span * 0.18;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const pts = values.map((v, i) => ({
    x: PAD.l + (values.length === 2 ? iw / 2 : (i / (values.length - 1)) * iw),
    y: PAD.t + (1 - (v - lo) / (hi - lo)) * ih,
    v: v
  }));
  const lineD = buildSmoothPath(pts);
  const base = PAD.t + ih;
  const areaD = `${lineD} L ${pts[pts.length - 1].x} ${base} L ${pts[0].x} ${base} Z`;
  const up = (opts.up === undefined) ? values[values.length - 1] >= values[0] : opts.up;
  const color = up ? (getComputedStyle(document.documentElement).getPropertyValue('--cyan') || '#00d4ff').trim() : '#ef4444';
  const fmt = opts.format || ((v) => `$${Math.round(v)}`);
  const tipTitle = opts.tipTitle || 'Value';

  const gridHtml = [];
  for (let f = 0; f <= 1; f += 0.25) {
    const gy = PAD.t + ih * f;
    gridHtml.push(`<line x1="${PAD.l}" y1="${gy.toFixed(1)}" x2="${W - PAD.r}" y2="${gy.toFixed(1)}" class="chart-grid"/>`);
  }

  el.innerHTML = `
    <div class="chart-wrap" style="position:relative;width:100%;height:${H}px">
      <svg class="perf-chart" viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">
        ${gridHtml.join('')}
        <path class="chart-area" d="${areaD}" fill="${color}" fill-opacity="0.13" stroke="none"/>
        <path class="chart-line" pathLength="1" d="${lineD}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle class="chart-dot" cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="4.5" fill="${color}"/>
        <line class="chart-cross" x1="${pts[pts.length - 1].x}" y1="${PAD.t}" x2="${pts[pts.length - 1].x}" y2="${base}" stroke="${color}" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="3 3"/>
        <circle class="chart-cross-dot" cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="5" fill="none" stroke="${color}" stroke-width="2"/>
        <rect class="chart-hit" x="${PAD.l}" y="${PAD.t}" width="${iw}" height="${ih}" fill="transparent"/>
        <text class="chart-axis" x="${PAD.l - 8}" y="${PAD.t + 3}" text-anchor="end">${fmt(lo)}</text>
        <text class="chart-axis" x="${PAD.l - 8}" y="${base + 3}" text-anchor="end">${fmt(hi)}</text>
      </svg>
      <div class="chart-tip"></div>
    </div>`;

  const wrapEl = el.querySelector('.chart-wrap');
  const svgEl = el.querySelector('svg');
  const tipEl = el.querySelector('.chart-tip');
  const cross = el.querySelector('.chart-cross');
  const crossDot = el.querySelector('.chart-cross-dot');

  const hideTip = () => {
    tipEl.style.display = 'none';
    cross.style.opacity = '0';
    crossDot.style.opacity = '0';
  };

  const moveTip = (e) => {
    const r = svgEl.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(frac * (values.length - 1))));
    const p = pts[idx];
    const wrapR = wrapEl.getBoundingClientRect();
    tipEl.style.display = 'block';
    tipEl.style.left = `${(p.x / W) * wrapR.width}px`;
    tipEl.style.top = `${Math.max(40, (p.y / H) * wrapR.height)}px`;
    tipEl.innerHTML = `<div class="chart-tip-val">${fmt(p.v)}</div><div class="chart-tip-sub">${tipTitle}</div>`;
    cross.style.opacity = '1';
    crossDot.style.opacity = '1';
    cross.setAttribute('x1', p.x);
    cross.setAttribute('x2', p.x);
    crossDot.setAttribute('cx', p.x);
    crossDot.setAttribute('cy', p.y);
  };

  svgEl.addEventListener('mousemove', moveTip);
  svgEl.addEventListener('mouseleave', hideTip);

  cross.style.opacity = '1';
  crossDot.style.opacity = '1';
  tipEl.style.display = 'none';
}

function genSeries(seed, n, start, end, vol) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  const step = (end - start) / (n - 1);
  for (let i = 0; i < n; i++) {
    const v = start + step * i + (rnd() - 0.5) * 2 * vol;
    out.push(Math.min(end, Math.max(start, v)));
  }
  return out;
}

const CUM_PNL_SERIES = genSeries(42, 30, 42, 3420, 90);
const REALIZED_PNL_SERIES = genSeries(77, 30, 42, 3420, 150);

function pnlSeriesFor(tf) {
  if (tf === '7D') return CUM_PNL_SERIES.slice(-7);
  if (tf === '30D') return CUM_PNL_SERIES.slice(-30);
  return CUM_PNL_SERIES;
}

/* ===================================================================
   Big Candlestick Chart — $LANTERN live chart (candles + MAs + volume)
   Styled after the reference: cyan up / red down candles, two moving
   averages, volume bars, right price axis, bottom time axis,
   dashed last-price tag, crosshair + OHLC tooltip, grow-in animation
   =================================================================== */
const CANDLE_TF = {
  '15m': { tf: 'minute', agg: 15, limit: 96, mins: 15 },
  '1H':  { tf: 'hour',   agg: 1,  limit: 96, mins: 60 },
  '4H':  { tf: 'hour',   agg: 4,  limit: 96, mins: 240 },
  '1D':  { tf: 'day',    agg: 1,  limit: 60, mins: 1440 }
};
let candleTf = '1H';

// Live chart state — real OHLCV from GeckoTerminal (no synthetic candles)
// LATERN_MINT: paste your real $LATERN Solana mint address here.
//   - Empty: the Overview hero shows placeholder text + the SOL chart as a fallback
//   - Filled (e.g. 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'):
//     hero shows live $LATERN price/mcap/vol/buyers/liq + chart loads $LATERN/USD candles.
//     The 'Buy $LATERN' button opens the real swap modal (Phantom + Jupiter).
const LATERN_MINT = '';   // REPLACE with your real $LATERN Solana mint
const SOL_MINT_LIT = 'So11111111111111111111111111111111111111112';
const marketChart = { candles: [], pair: null, loading: false, tfLoaded: null, misses: 0 };

async function loadMarketChart() {
  if (marketChart.loading) return;
  marketChart.loading = true;
  const cfg = CANDLE_TF[candleTf] || CANDLE_TF['1H'];
  try {
    const D = window.LANTERN && window.LANTERN.data;
    if (!D) return;
    // Prefer $LATERN's pair if its mint is configured; else fall back to SOL.
    const heroMint = LATERN_MINT || SOL_MINT_LIT;
    if (!marketChart.pair) marketChart.pair = await D.tokenInfo(heroMint);
    if (marketChart.pair) {
      const candles = await D.ohlcv(marketChart.pair.pairAddress, cfg.tf, cfg.limit, cfg.agg);
      marketChart.candles = candles || [];
      marketChart.tfLoaded = candleTf;
    }
  } catch (e) {
    marketChart.candles = [];
  } finally {
    marketChart.loading = false;
    if (!marketChart.candles.length) marketChart.misses += 1;
    else marketChart.misses = 0;
  }
}

function renderCandleChart() {
  const el = document.getElementById('candleChart');
  if (!el) return;
  const candles = marketChart.candles;
  if (!candles.length) {
    if (marketChart.misses >= 2) {
      el.innerHTML = '<div class="chart-empty">Live market data unavailable — switch timeframe to retry.</div>';
      return;
    }
    el.innerHTML = '<div class="chart-empty"><span class="spin"></span> Loading live SOL/USD candles…</div>';
    if (!marketChart.loading) loadMarketChart().then(() => renderCandleChart());
    return;
  }
  const cfg = CANDLE_TF[candleTf] || CANDLE_TF['1H'];
  const dec = priceAxisDecimals(candles);

  const W = Math.max(window.innerWidth <= 768 ? 200 : 560, Math.round(el.clientWidth || 900));
  const H = window.innerWidth <= 768 ? 250 : 360;
  const PAD = { t: 16, r: 76, b: 26, l: 10 };
  const iw = W - PAD.l - PAD.r;
  const totalH = H - PAD.t - PAD.b;
  const volH = Math.round(totalH * 0.17);
  const gap = 16;
  const priceH = totalH - volH - gap;
  const priceBottom = PAD.t + priceH;
  const volTop = priceBottom + gap;
  const volBottom = H - PAD.b;

  const lo = Math.min(...candles.map(c => c.l));
  const hi = Math.max(...candles.map(c => c.h));
  const padP = (hi - lo) * 0.12 || hi * 0.05;
  const min = lo - padP, max = hi + padP;
  const y = v => PAD.t + (1 - (v - min) / (max - min)) * priceH;
  const slot = iw / candles.length;
  const bw = Math.max(3, slot * 0.6);
  const cx = i => PAD.l + slot * (i + 0.5);

  // Moving averages: MA 7 (fast) and MA 25 (slow)
  const closes = candles.map(c => c.c);
  const smaPts = period => {
    const out = [];
    for (let i = period - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      out.push({ x: cx(i), y: y(sum / period) });
    }
    return out;
  };
  const ma1Pts = smaPts(7);
  const ma2Pts = smaPts(25);
  const ma1Path = ma1Pts.length > 2 ? buildSmoothPath(ma1Pts) : '';
  const ma2Path = ma2Pts.length > 2 ? buildSmoothPath(ma2Pts) : '';

  // Horizontal price grid + right axis labels
  let gridHtml = '';
  const priceTicks = 5;
  for (let t = 0; t <= priceTicks; t++) {
    const v = min + (max - min) * (t / priceTicks);
    const yy = y(v);
    gridHtml += `<line class="candle-grid" x1="${PAD.l}" y1="${yy.toFixed(1)}" x2="${W - PAD.r}" y2="${yy.toFixed(1)}"/>
      <text class="candle-axis" x="${W - PAD.r + 8}" y="${(yy + 3.5).toFixed(1)}">${v.toFixed(dec)}</text>`;
  }

  // Vertical grid + bottom time labels (real candle timestamps)
  let timeHtml = '';
  const timeTicks = 6;
  for (let t = 0; t < timeTicks; t++) {
    const i = Math.round(t * (candles.length - 1) / (timeTicks - 1));
    const d = new Date(candles[i].t || Date.now());
    const label = cfg.mins >= 1440
      ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
      : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    timeHtml += `<line class="candle-grid" x1="${cx(i).toFixed(1)}" y1="${PAD.t}" x2="${cx(i).toFixed(1)}" y2="${volBottom}"/>
      <text class="candle-axis" x="${cx(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${label}</text>`;
  }

  // Candles + volume bars
  const maxV = Math.max(...candles.map(c => c.v)) || 1;
  const candleHtml = candles.map((c, i) => {
    const up = c.c >= c.o;
    const x = cx(i);
    const yTop = y(Math.max(c.o, c.c));
    const yBot = y(Math.min(c.o, c.c));
    const bodyH = Math.max(1.5, yBot - yTop);
    const vh = Math.max(2, (c.v / maxV) * (volH - 6));
    return `<g class="candle-anim" style="animation-delay:${i * 8}ms">
      <line class="${up ? 'candle-wick-up' : 'candle-wick-down'}" x1="${x.toFixed(1)}" y1="${y(c.h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y(c.l).toFixed(1)}" stroke-width="1.3"/>
      <rect class="${up ? 'candle-up' : 'candle-down'}" x="${(x - bw / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${bodyH.toFixed(1)}" rx="0.5"/>
      <rect class="${up ? 'vol-bar-up' : 'vol-bar-down'}" x="${(x - bw / 2).toFixed(1)}" y="${(volBottom - vh).toFixed(1)}" width="${bw.toFixed(1)}" height="${vh.toFixed(1)}" rx="0.5"/>
    </g>`;
  }).join('');

  // Last-price dashed line + right-edge tag
  const last = candles[candles.length - 1];
  const lastColor = last.c >= last.o ? '#00e5ff' : '#ff3b5c';
  const lastY = y(last.c);
  const priceLine = `<line x1="${PAD.l}" y1="${lastY.toFixed(1)}" x2="${W - PAD.r}" y2="${lastY.toFixed(1)}" stroke="${lastColor}" stroke-width="1" stroke-dasharray="5 4" opacity=".75"/>
    <rect x="${W - PAD.r + 3}" y="${(lastY - 8.5).toFixed(1)}" width="${PAD.r - 6}" height="17" rx="3" fill="${lastColor}"/>
    <text class="candle-price-tag" x="${W - PAD.r + 8}" y="${(lastY + 3.5).toFixed(1)}">${last.c.toFixed(dec)}</text>`;

  el.innerHTML = `
    <div class="candle-chart">
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:100%;height:${H}px;display:block;" role="img" aria-label="SOL/USD live candlestick chart with moving averages and volume">
        ${gridHtml}
        ${timeHtml}
        ${candleHtml}
        <path class="candle-ma2" d="${ma2Path}" pathLength="1"/>
        <path class="candle-ma1" d="${ma1Path}" pathLength="1"/>
        ${priceLine}
        <line class="candle-cross" id="candleCross" x1="0" y1="${PAD.t}" x2="0" y2="${volBottom}"/>
        <rect class="candle-hit" id="candleHit" x="${PAD.l}" y="${PAD.t}" width="${iw}" height="${volBottom - PAD.t}"/>
      </svg>
      <div class="candle-tip" id="candleTip"></div>
    </div>
    <div class="candle-legend">
      <span><i style="background:#ff8a5c"></i>MA 7</span>
      <span><i style="background:#8b93a7"></i>MA 25</span>
      <span><i style="background:#00e5ff"></i>Volume · up</span>
      <span><i style="background:#ff3b5c"></i>down</span>
      <span style="margin-left:auto;">${candleTf} · ${candles.length} real candles · GeckoTerminal · hover for OHLC</span>
    </div>`;

  // Crosshair + OHLC tooltip
  const svgEl = el.querySelector('svg');
  const hit = el.querySelector('#candleHit');
  const cross = el.querySelector('#candleCross');
  const tip = el.querySelector('#candleTip');
  const wrap = el.querySelector('.candle-chart');
  if (!svgEl || !hit || !tip || !wrap) return;

  const move = ev => {
    const r = svgEl.getBoundingClientRect();
    const sx = (ev.clientX - r.left) * (W / r.width);
    let i = Math.floor((sx - PAD.l) / slot);
    i = Math.max(0, Math.min(candles.length - 1, i));
    const c = candles[i];
    const x = cx(i);
    if (cross) {
      cross.setAttribute('x1', x.toFixed(1));
      cross.setAttribute('x2', x.toFixed(1));
      cross.classList.add('on');
    }
    const d = new Date(c.t || Date.now());
    const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const up = c.c >= c.o;
    const chg = ((c.c - c.o) / c.o) * 100;
    tip.innerHTML = `
      <div class="ct-head">${hh} · SOL/USD</div>
      <div class="ct-row"><span>Open</span><b>${c.o.toFixed(dec)}</b></div>
      <div class="ct-row"><span>High</span><b>${c.h.toFixed(dec)}</b></div>
      <div class="ct-row"><span>Low</span><b>${c.l.toFixed(dec)}</b></div>
      <div class="ct-row"><span>Close</span><b style="color:${up ? '#00e5ff' : '#ff3b5c'}">${c.c.toFixed(dec)}</b></div>
      <div class="ct-row"><span>Change</span><b style="color:${up ? '#00e5ff' : '#ff3b5c'}">${up ? '+' : ''}${chg.toFixed(2)}%</b></div>
      <div class="ct-row"><span>Volume</span><b>$${compactNum(Math.round(c.v || 0))}</b></div>`;
    tip.style.display = 'block';
    const px = (x / W) * wrap.clientWidth;
    const tw = tip.offsetWidth || 165;
    tip.style.left = `${Math.min(Math.max(px + 14, 4), Math.max(4, wrap.clientWidth - tw - 4))}px`;
    tip.style.top = `${Math.max(6, (y(c.h) / H) * wrap.clientHeight - 10)}px`;
  };
  hit.addEventListener('mousemove', move);
  hit.addEventListener('mouseleave', () => {
    cross?.classList.remove('on');
    tip.style.display = 'none';
  });
}

function renderCumulativeChart(values, containerId, opts = {}) {
  renderPerfChart(containerId || 'fullPnlBars', values, Object.assign({
    uid: containerId || 'cum',
    height: 220,
    format: (v) => `$${Math.round(v).toLocaleString('en-US')}`,
    tipTitle: 'Cumulative PnL'
  }, opts));
}

function renderOverviewPerformance() {
  renderCumulativeChart(REALIZED_PNL_SERIES, 'overviewRealized', { height: 260, uid: 'realized' });
}

// ---------- View 3: Realized PnL & Trade History ----------
async function renderTradeHistory() {
  renderCumulativeChart(CUM_PNL_SERIES);

  const tbody = document.getElementById('tradeHistoryBody');
  if (!tbody) return;

  const trades = readTrades().slice().reverse();
  if (!trades.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--ink-muted);">No trades yet — make a swap in Token lookup and it will show up here.</td></tr>';
    return;
  }

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--ink-muted);">Loading token art…</td></tr>';

  // fetch logos for the mints in view (batched, DexScreener allows 30/call)
  const mints = Array.from(new Set(trades.map(t => t.mint).filter(Boolean)));
  let infos = {};
  try { infos = await window.LANTERN.data.infoBatch(mints) || {}; } catch (e) { infos = {}; }

  tbody.innerHTML = trades.slice(0, 25).map(t => {
    const info = infos[t.mint] || {};
    const sym = (t.sym || info.symbol || '?').trim();
    const rawName = String(info.name || '').trim();
    // only show the name when it adds something beyond the ticker
    const name = rawName && rawName.toLowerCase() !== sym.toLowerCase() ? rawName : '';
    const img = info.image || null;
    const letter = escHtml(String(sym).replace(/^\$+/, '')[0] || '?').toUpperCase();
    const pic = img
      ? `<img src="${escHtml(img)}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${letter}'))">`
      : letter;
    const up = t.side === 'buy';
    const when = t.ts ? new Date(t.ts) : null;
    const time = when ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
      when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
    const amount = t.tokenAmount != null
      ? fmtTok(t.tokenAmount) + ' $' + sym
      : (t.side === 'buy' ? '+' + fmtTok(t.outUi) + ' $' + sym : '+' + Number(t.outUi || 0).toFixed(4) + ' SOL');
    const price = t.priceUsd != null ? fmtPrice(t.priceUsd) : '—';
    const value = t.usdValue != null ? fmtMoney(t.usdValue) : '—';
    const link = t.explorer || '#';
    return `<tr>
      <td>
        <div class="token-cell">
          <div class="token-pic">${pic}</div>
          <div class="token-info">
            <span class="t-sym">$${escHtml(sym)}</span>
            ${name ? `<span class="t-name">${escHtml(name)}</span>` : ''}
          </div>
        </div>
      </td>
      <td><span class="token-chain-badge ${up ? 'badge-buy' : 'badge-sell'}">${t.side === 'buy' ? 'BUY' : 'SELL'}</span></td>
      <td><span class="price-cell">${amount}</span></td>
      <td><span class="price-cell">${price}</span></td>
      <td><span class="price-cell">${value}</span></td>
      <td><a class="trade-tx-link" href="${escHtml(link)}" target="_blank" rel="noopener" title="${escHtml(t.sig || '')}">${time}</a></td>
    </tr>`;
  }).join('');
}

document.getElementById('shareCardBtn')?.addEventListener('click', () => {
  showToast('✓ PnL Share Card rendered — copied to clipboard!');
});

// ---------- View 4: Portfolio Holdings (real wallet balances) ----------
async function renderPortfolio() {
  const tbody = document.getElementById('portfolioBody');
  if (!tbody) return;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const c = window.LanternChain;

  if (!c || !chainState.address) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--ink-muted);">Connect a wallet to see your real holdings, values and token art.</td></tr>';
    set('pfNetWorth', '—'); set('pfUnrealized', '—'); set('pfAssetCount', '—'); set('pfSolBal', '—');
    return;
  }

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--ink-muted);"><span class="spin"></span> Reading on-chain balances…</td></tr>';

  try {
    const [positions, solUsdPrice] = await Promise.all([
      c.getPositions(),
      window.LANTERN.data.prices([SOL_MINT_LIT]).then(p => (p && p[SOL_MINT_LIT] && p[SOL_MINT_LIT].usd) || null).catch(() => null)
    ]);

    const mints = positions.map(p => p.mint);
    const [prices, infos] = await Promise.all([
      mints.length ? window.LANTERN.data.prices(mints) : Promise.resolve({}),
      mints.length ? window.LANTERN.data.infoBatch(mints) : Promise.resolve({})
    ]);

    // SOL balance (native) as its own row
    let solBal = chainState.balance;
    if (solBal == null && c.solBalance) { try { solBal = await c.solBalance(); } catch (e) { solBal = null; } }

    const rows = [];
    let total = 0;

    if (solBal != null && solBal > 0) {
      const val = solUsdPrice != null ? solBal * solUsdPrice : null;
      if (val != null) total += val;
      rows.push({ mint: null, sym: 'SOL', name: 'Solana Native', amount: solBal, price: solUsdPrice, val, img: null, up: null });
    }

    positions.forEach(p => {
      const info = infos[p.mint] || {};
      const price = (prices[p.mint] && prices[p.mint].usd != null) ? prices[p.mint].usd : (info.price || null);
      const val = price != null ? p.amount * price : null;
      if (val != null) total += val;
      const sym = String(info.symbol || '').trim() || shortAddr(p.mint);
      const rawName = String(info.name || '').trim();
      rows.push({
        mint: p.mint,
        sym: sym,
        name: rawName && rawName.toLowerCase() !== sym.toLowerCase() ? rawName : '',
        amount: p.amount, price, val,
        img: info.image || null,
        up: info.change && info.change.h24 != null ? info.change.h24 : null
      });
    });

    // biggest holdings first
    rows.sort((a, b) => (b.val || 0) - (a.val || 0));

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--ink-muted);">No assets in this wallet yet.</td></tr>';
      set('pfNetWorth', '—'); set('pfUnrealized', '—'); set('pfAssetCount', '0'); set('pfSolBal', '—');
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const letter = escHtml(String(r.sym).replace(/^\$+/, '')[0] || '?').toUpperCase();
      const pic = r.img
        ? `<img src="${escHtml(r.img)}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${letter}'))">`
        : letter;
      const price = r.price != null ? fmtPrice(r.price) : '—';
      const val = r.val != null ? fmtMoney(r.val) : '—';
      const chg = r.up != null
        ? `<span class="chg ${r.up >= 0 ? 'up' : 'down'}">${fmtPct(r.up)}</span>`
        : '<span class="t-name">—</span>';
      const action = r.mint
        ? `<button class="table-trade-btn" data-opentrade="${escHtml(r.mint)}">Trade</button>`
        : '<span class="t-name">Native</span>';
      return `<tr>
        <td>
          <div class="token-cell">
            <div class="token-pic">${pic}</div>
            <div class="token-info">
              <span class="t-sym">$${escHtml(r.sym)}</span>
              <span class="t-name">${escHtml(r.name || (r.mint ? shortAddr(r.mint) : 'Solana'))}</span>
            </div>
          </div>
        </td>
        <td><span class="price-cell">${fmtTok(r.amount)}</span></td>
        <td><span class="price-cell">${price}</span></td>
        <td><strong>${val}</strong></td>
        <td>${chg}</td>
        <td>${action}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-opentrade]').forEach(b => b.addEventListener('click', () => {
      showView('Token lookup');
      openTradeToken(b.dataset.opentrade);
    }));

    set('pfNetWorth', total > 0 ? fmtMoney(total) : '—');
    set('pfAssetCount', String(rows.length));
    set('pfSolBal', solBal != null ? fmtTok(solBal) + ' SOL' : '—');
    const unreal = document.getElementById('pfUnrealized');
    if (unreal) {
      const withChg = rows.filter(r => r.up != null && r.val != null);
      if (withChg.length) {
        const delta = withChg.reduce((s, r) => s + r.val * (r.up / 100), 0);
        const pct = total > 0 ? (delta / total) * 100 : 0;
        unreal.textContent = (delta >= 0 ? '+' : '') + fmtMoney(delta) + ' (' + fmtPct(pct) + ')';
        unreal.className = 'sb-val ' + (delta >= 0 ? 'up' : 'down');
      } else {
        unreal.textContent = '—';
      }
    }
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--ink-muted);">Could not read balances — RPC rate-limited. Set a custom RPC in Wallets and retry.</td></tr>';
  }
}

// ---------- View 5: Watchlist View ----------
function renderWatchlist() {
  const tbody = document.getElementById('watchlistBody');
  if (!tbody) return;

  const watched = getWatchlist();
  const list = TOKENS.filter(t => watched.includes(t.id));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--ink-muted);">No tokens in watchlist. Star any token in the Overview table to pin here.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(t => `
    <tr>
      <td>
        <div class="token-cell">
          <button class="star-btn starred" data-unstar="${t.id}">★</button>
          <div class="token-pic">${tokenPic(t)}</div>
          <div class="token-info">
            <span class="t-sym">${t.sym}</span>
            <span class="t-name">${t.name}</span>
          </div>
        </div>
      </td>
      <td><span class="price-cell">${t.price}</span></td>
      <td><span class="chg ${t.up ? 'up' : 'down'}">${t.chg}</span></td>
      <td class="col-vol"><span class="price-cell">${t.vol}</span></td>
      <td><span class="token-chain-badge" style="color:#10b981;">Active Alert</span></td>
      <td><button class="table-trade-btn" data-trade="${t.mint || t.sym}">Trade</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-unstar]').forEach(btn => {
    btn.addEventListener('click', () => toggleWatchlist(btn.dataset.unstar));
  });
  tbody.querySelectorAll('[data-trade]').forEach(btn => {
    btn.addEventListener('click', () => quickTrade(btn.dataset.trade));
  });
}

// ---------- View 6: AI Trading Controls & Active Positions ----------
let aiBotActive = true;

function renderAiPositions() {
  const tbody = document.getElementById('aiPositionsBody');
  if (!tbody) return;

  const positions = [
    { token: '$LANTERN/RBH', size: '0.25 RBH', entry: '$0.00000078', current: '$0.00000091', pnl: '+$184.20 (+16.6%)', action: 'Trailing Stop' },
    { token: '$CALLER/SOL', size: '0.20 SOL', entry: '$0.0000110', current: '$0.0000217', pnl: '+$62.40 (+97.3%)', action: 'TP Target in 6%' },
    { token: '$TRACE/RBH', size: '0.15 RBH', entry: '$0.0000039', current: '$0.0000046', pnl: '+$84.10 (+17.9%)', action: 'Holding Runner' }
  ];

  tbody.innerHTML = positions.map(p => `
    <tr>
      <td><strong>${p.token}</strong></td>
      <td><span class="price-cell">${p.size}</span></td>
      <td><span class="price-cell">${p.entry}</span></td>
      <td><span class="price-cell">${p.current}</span></td>
      <td><span class="chg up">${p.pnl}</span></td>
      <td><span class="token-chain-badge" style="color:var(--cyan);border-color:var(--cyan);">${p.action}</span></td>
    </tr>
  `).join('');
}

document.getElementById('toggleAiBotBtn')?.addEventListener('click', () => {
  aiBotActive = !aiBotActive;
  const label = document.getElementById('aiBotStateLabel');
  const stAi = document.getElementById('stAi');
  if (label) label.textContent = aiBotActive ? 'Pause AI Agent' : 'Start AI Agent';
  if (stAi) {
    stAi.className = aiBotActive ? 'st live' : 'st off';
    stAi.innerHTML = `<i></i>AI trading ${aiBotActive ? 'active' : 'paused'}`;
  }
  showToast(aiBotActive ? '✦ AI Trading Agent armed & scanning blocks' : 'AI Trading Agent paused.');
});

// AI Sliders
document.getElementById('tpRange')?.addEventListener('input', (e) => {
  document.getElementById('tpVal').textContent = `+${e.target.value}%`;
});
document.getElementById('slRange')?.addEventListener('input', (e) => {
  document.getElementById('slVal').textContent = `-${e.target.value}%`;
});
document.getElementById('tradeSizeRange')?.addEventListener('input', (e) => {
  document.getElementById('tradeSizeVal').textContent = `${e.target.value} RBH / ${(e.target.value * 6).toFixed(1)} SOL`;
});

// View 7: Auto Snipe Save Button
document.getElementById('saveSnipeRulesBtn')?.addEventListener('click', () => {
  showToast('✓ Block-0 Sniping rules saved to node engine.');
});
document.getElementById('launchTokenBtn')?.addEventListener('click', () => {
  openLaunchWizard();
});
document.getElementById('slipRange')?.addEventListener('input', (e) => {
  document.getElementById('slipVal').textContent = `${e.target.value}%`;
});

// ---------- Wallets Management ----------
function fakeAddress(chain) {
  const hex = '0123456789abcdef';
  const pick = (n) => Array.from({ length: n }, () => hex[Math.floor(Math.random() * 16)]).join('');
  if (chain === 'SOL') {
    const b58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return Array.from({ length: 44 }, () => b58[Math.floor(Math.random() * b58.length)]).join('');
  }
  return '0x' + pick(40);
}

function getWallets() {
  try { return JSON.parse(localStorage.getItem('lantern:wallets')) || null; }
  catch (e) { return null; }
}

function setWalletStatus(ready) {
  const st = document.getElementById('stWallets');
  if (!st) return;
  st.className = ready ? 'st live' : 'st off';
  st.innerHTML = `<i></i>Wallets ${ready ? 'ready' : 'not created'}`;
}

function renderWallets() {
  const list = document.getElementById('walletList');
  const w = getWallets();
  if (!list) return;
  if (!w) { list.innerHTML = ''; setWalletStatus(false); return; }

  const copyIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  list.innerHTML = w.map(x => `
    <div class="wallet-row">
      <span class="wl-label">${x.chain}</span>
      <code>${x.address}</code>
      <button class="ca-copy" data-wallet="${x.address}" aria-label="Copy ${x.chain} address">${copyIcon}</button>
    </div>
  `).join('');
  setWalletStatus(true);

  list.querySelectorAll('[data-wallet]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.wallet);
        showToast('✓ Wallet address copied');
      } catch (err) {
        showToast('Address: ' + btn.dataset.wallet.slice(0, 12) + '...');
      }
    });
  });
}

function createWallets() {
  if (getWallets()) {
    document.getElementById('walletList')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('✓ Trading wallets already generated.');
    return;
  }
  const wallets = [
    { chain: 'SOL', address: fakeAddress('SOL') },
    { chain: 'RBH', address: fakeAddress('RBH') }
  ];
  try { localStorage.setItem('lantern:wallets', JSON.stringify(wallets)); } catch (e) {}
  renderWallets();
  document.getElementById('walletList')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast('✓ Demo wallets created — Solana + Robinhood live.');
}

// ---------- Buy / Trade Modal (REAL SWAPS via Phantom + Jupiter) ----------
// Previously this modal faked trade execution with a "Trade Executed" toast.
// Now it does a REAL Jupiter swap: quote → unsigned tx → Phantom signs →
// send to Solana RPC → wait for confirmation → show real Solscan link.
const buyOverlay = document.getElementById('buyOverlay');
const buyAmount = document.getElementById('buyAmount');
let targetToken = '$LANTERN';
let targetChain = 'SOL';
let targetMint = null;            // the actual Solana mint address being bought
let targetDecimals = null;        // token decimals (for displaying receive amount)
let buyBusy = false;              // mutex: prevent double-submit during swap
let buyQuoteTimer = null;         // debounced quote fetcher

const SOL_MINT_FOR_BUY = 'So11111111111111111111111111111111111111112';
const BUY_SLIPPAGE_BPS = 100;     // 1% slippage for the modal (memecoins can be volatile)

/**
 * Open the buy modal for a specific token.
 * @param {string} tokenSym   e.g. 'BONK' or '$BONK'
 * @param {string} mint       Solana mint address (32-44 char base58) — REQUIRED
 * @param {number} [decimals] Token decimals (optional, fetched from RPC if missing)
 */
function openBuy(tokenSym = '$LANTERN', mint = null, decimals = null) {
  if (!buyOverlay || !buyAmount) return;
  if (!mint) {
    showToast('⚠ No token selected. Use the Trade view to pick a token first.');
    return;
  }
  targetToken = tokenSym.startsWith('$') ? tokenSym : `$${tokenSym}`;
  targetChain = 'SOL';
  targetMint = mint;
  targetDecimals = decimals;
  buyBusy = false;

  document.getElementById('modalTokenName').textContent = targetToken;
  document.getElementById('buyTitle').innerHTML = `Buy ${targetToken}`;
  document.getElementById('buySuffix').textContent = 'SOL';
  document.getElementById('buyConfirmText').textContent = `Confirm Buy ${targetToken}`;

  buyOverlay.classList.add('show');
  buyOverlay.setAttribute('aria-hidden', 'false');
  buyAmount.value = '';
  document.getElementById('estTokens').textContent = '0 tokens';

  // Reset modal to non-busy state
  const confirmBtn = document.getElementById('buyConfirm');
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
  }

  setTimeout(() => buyAmount.focus(), 150);

  // Fetch token decimals if not provided (needed for displaying received amount)
  if (!targetDecimals) {
    const c = window.LanternChain;
    if (c && c.getMintInfo) {
      c.getMintInfo(mint).then(mi => {
        if (mi && mi.decimals != null) targetDecimals = mi.decimals;
      }).catch(() => {});
    }
  }
}

function closeBuy() {
  if (buyBusy) {
    showToast('Swap in progress — please wait for confirmation or rejection in Phantom.');
    return;
  }
  if (!buyOverlay) return;
  buyOverlay.classList.remove('show');
  buyOverlay.setAttribute('aria-hidden', 'true');
  if (buyQuoteTimer) { clearTimeout(buyQuoteTimer); buyQuoteTimer = null; }
}

document.getElementById('buyClose')?.addEventListener('click', closeBuy);
document.getElementById('buyCancel')?.addEventListener('click', closeBuy);
buyOverlay?.addEventListener('click', e => { if (e.target === buyOverlay) closeBuy(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBuy(); });

// Live quote preview as the user types — fetches a real Jupiter quote
// and shows the actual receive amount (instead of the fake fixed rate).
buyAmount?.addEventListener('input', () => {
  if (buyQuoteTimer) clearTimeout(buyQuoteTimer);
  buyQuoteTimer = setTimeout(updateBuyQuotePreview, 300);
});

async function updateBuyQuotePreview() {
  const amt = parseFloat(buyAmount?.value);
  const estEl = document.getElementById('estTokens');
  if (!estEl) return;
  if (!amt || amt <= 0 || !targetMint) {
    estEl.textContent = '0 tokens';
    return;
  }
  estEl.textContent = '…';
  try {
    const c = window.LanternChain;
    if (!c || !c.quote) { estEl.textContent = `${targetToken}`; return; }
    const amountRaw = String(Math.round(amt * 1e9));  // SOL → lamports
    const q = await c.quote({
      inputMint: SOL_MINT_FOR_BUY,
      outputMint: targetMint,
      amountRaw,
      slippageBps: BUY_SLIPPAGE_BPS
    });
    const outRaw = Number(q.outAmount);
    const dec = targetDecimals || 9;
    const outUi = outRaw / Math.pow(10, dec);
    estEl.textContent = outUi.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ` ${targetToken}`;
  } catch (e) {
    estEl.textContent = '— (quote failed)';
  }
}

// Quick-amount buttons (25% / 50% / 75% / MAX) — uses REAL SOL balance
document.querySelectorAll('.quick-row button').forEach(q => {
  q.addEventListener('click', () => {
    const mult = parseFloat(q.dataset.quick);
    const c = window.LanternChain;
    const bal = (c && c.getState && c.getState().mainnetBalance) || 0;
    if (bal <= 0) {
      showToast('Connect your wallet to use quick-amount buttons.');
      return;
    }
    // leave a 0.002 SOL fee buffer
    const usable = Math.max(0, bal - 0.002);
    if (buyAmount) {
      buyAmount.value = (usable * mult).toFixed(4);
      buyAmount.dispatchEvent(new Event('input'));
    }
  });
});

// THE REAL SWAP — replaces the old fake "Trade Executed" toast.
document.getElementById('buyConfirm')?.addEventListener('click', async () => {
  if (buyBusy) return;
  const amt = parseFloat(buyAmount?.value);
  if (!amt || amt <= 0) {
    showToast('Enter an amount first.');
    buyAmount?.focus();
    return;
  }
  if (!targetMint) {
    showToast('No token selected.');
    return;
  }
  const c = window.LanternChain;
  if (!c) { showToast('Chain module still loading — try again.'); return; }
  if (!c.getState || !c.getState().address) {
    showToast('Connect your Phantom wallet first.');
    return;
  }

  const confirmBtn = document.getElementById('buyConfirm');
  const confirmText = document.getElementById('buyConfirmText');
  const original = confirmText ? confirmText.textContent : '';
  buyBusy = true;
  if (confirmBtn) confirmBtn.disabled = true;

  const setBtn = (label) => { if (confirmText) confirmText.textContent = label; };
  setBtn('Quoting…');

  try {
    const amountRaw = String(Math.round(amt * 1e9));  // SOL → lamports
    const res = await c.swap({
      inputMint: SOL_MINT_FOR_BUY,
      outputMint: targetMint,
      amountRaw,
      slippageBps: BUY_SLIPPAGE_BPS,
      side: 'buy',
      onProgress: (p) => {
        const stage = p.stage || '';
        const label = stage === 'quoting' ? 'Quoting…'
                    : stage === 'building' ? 'Building tx…'
                    : stage === 'signing' ? 'Sign in Phantom…'
                    : stage === 'sending' ? 'Sending to Solana…'
                    : stage === 'confirming' ? 'Confirming on-chain…'
                    : stage === 'done' ? 'Confirmed ✅'
                    : 'Working…';
        setBtn(label);
      }
    });

    // Real success — show the actual Solscan link
    closeBuy();
    showToast(`✅ Bought ${targetToken} — view on Solscan ↗`, 8000);
    // Open Solscan in new tab so the user sees the real on-chain tx
    if (res && res.explorer) {
      setTimeout(() => window.open(res.explorer, '_blank', 'noopener'), 400);
    }
  } catch (e) {
    // Real failure — show the actual error
    const msg = e && e.message ? e.message : 'Swap failed.';
    showToast('⚠ ' + msg, 8000);
  } finally {
    buyBusy = false;
    if (confirmBtn) confirmBtn.disabled = false;
    setBtn(original);
  }
});


// ---------- Action Dispatcher (Buttons across views) ----------
document.querySelectorAll('[data-action]').forEach(el => {
  el.addEventListener('click', e => {
    if (el.tagName === 'A') e.preventDefault();
    const action = el.dataset.action;
    switch (action) {
      case 'Create wallets': createWallets(); break;
      case 'Your wallets':
        if (!getWallets()) createWallets();
        else document.getElementById('walletList')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'Trade now':
        showView('Token lookup');
        openTradeToken(SOL_MINT_LIT);
        break;
      case 'Chart': {
        const blk = document.getElementById('chartBlock');
        if (!blk) break;
        if (blk.hidden) {
          blk.hidden = false;
          renderCandleChart();
          showToast('✓ SOL/USD live chart loaded.');
        } else {
          blk.hidden = true;
        }
        break;
      }
      case 'Start trading':
        showView('AI Trading');
        showToast('Welcome to AI Trading — adjust your budget and deploy.');
        break;
      case 'Make your first move':
        showView('Discover');
        break;
      case 'Create memecoin':
        openLaunchWizard();
        break;
      case 'Explore the market':
        showView('Discover');
        break;
      case 'Reset demo':
        localStorage.removeItem('lantern:wallets');
        localStorage.removeItem('lantern:watchlist');
        renderWallets();
        renderMarketTable();
        showToast('Demo data reset.');
        break;
      case 'Deposit':
        if (!getWallets()) createWallets();
        showToast('Your wallet address is ready to receive funds.');
        break;
      default:
        showToast(`✦ ${action} triggered.`);
    }
  });
});

// Copy contract button
// Copy the $LATERN contract address (or SOL fallback if LATERN_MINT is empty)
document.getElementById('copyBtn')?.addEventListener('click', async () => {
  const ca = LATERN_MINT || SOL_MINT_LIT;
  if (!ca) { showToast('No contract address configured.'); return; }
  try {
    await navigator.clipboard.writeText(ca);
    showToast('✓ $LANTERN Solana mint copied to clipboard.');
  } catch (e) {
    showToast('Mint: ' + ca.slice(0, 8) + '…' + ca.slice(-6));
  }
});

// "Buy $LATERN" button -> opens the real swap modal (now executes on-chain)
document.getElementById('calloutBuyBtn')?.addEventListener('click', () => {
  if (!LATERN_MINT) {
    showToast('⚠ Set LATERN_MINT at the top of dashboard.js first.');
    return;
  }
  openBuy('LATERN', LATERN_MINT);
});

// "Open in Trade view" button -> loads $LATERN in the Trade tab (full chart + safety)
document.getElementById('calloutTradeBtn')?.addEventListener('click', () => {
  if (!LATERN_MINT) {
    showToast('⚠ Set LATERN_MINT at the top of dashboard.js first.');
    return;
  }
  quickTrade(LATERN_MINT);
});

// Dismiss callout
document.getElementById('calloutClose')?.addEventListener('click', () => {
  document.getElementById('tokenCallout')?.remove();
  showToast('Token callout dismissed.');
});

// Topbar chain toggle button
const chainBtn = document.getElementById('chainBtn');
const chainLabel = document.getElementById('chainLabel');
const chains = ['SOL + RBH', 'Solana only', 'Robinhood only'];
let chainIdx = 0;
chainBtn?.addEventListener('click', () => {
  chainIdx = (chainIdx + 1) % chains.length;
  if (chainLabel) chainLabel.textContent = chains[chainIdx];
  showToast(`Chain view: ${chains[chainIdx]}`);
});

// Topbar engine status button
document.getElementById('engineBtn')?.addEventListener('click', () => {
  showToast('⚡ LANTERN Engine v2.4 · 12ms latency · 99.98% uptime');
});

// PnL Timeframe Tabs — Overview (toast) & Cumulative Performance chart
document.querySelectorAll('.pnl-tabs .tab:not([data-ctf])').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.pnl-tabs .tab:not([data-ctf])').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    if (t.dataset.ptab) {
      const panel = t.closest('.pnl-panel');
      // Resolve the chart container: the .chart-wrap lives inside the id'd container
      const wrap = panel ? panel.querySelector('.chart-wrap') : null;
      const target = wrap ? wrap.parentElement
        : (panel ? panel.querySelector('div[id]') : null) || document.getElementById('fullPnlBars');
      if (target && target.id) renderCumulativeChart(pnlSeriesFor(t.dataset.ptab), target.id);
      return;
    }
    showToast(`PnL timeframe: ${t.textContent}`);
  });
});

// Candlestick timeframe tabs (15m / 1H / 4H / 1D) — refetches real OHLCV
document.querySelectorAll('#candleTabs .tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('#candleTabs .tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    candleTf = t.dataset.ctf || '1H';
    marketChart.candles = [];
    marketChart.misses = 0;
    renderCandleChart();
  });
});

/* ===================================================================
   MEMECOIN LAUNCHPAD — create & launch real memecoins (Solana SPL)
   State lives in localStorage; execution goes through window.LanternChain
   (launchchain.js), the single swap point for future chains/programs.
   =================================================================== */
const LAUNCH_KEY = 'lantern:launches';
const U64_MAX = (1n << 64n) - 1n;

function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function shortAddr(a) {
  a = String(a || '');
  return a.length > 12 ? a.slice(0, 4) + '…' + a.slice(-4) : (a || '—');
}
function compactNum(n) {
  n = Number(n) || 0;
  if (n >= 1e12) return (n / 1e12).toFixed(n % 1e12 ? 1 : 0) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M';
  return n.toLocaleString('en-US');
}
function solscanUrl(path, net) {
  return 'https://solscan.io/' + path + (net === 'mainnet' ? '' : '?cluster=devnet');
}

function getLaunches() {
  try {
    const list = JSON.parse(localStorage.getItem(LAUNCH_KEY));
    return Array.isArray(list) ? list : [];
  } catch (e) { return []; }
}
function saveLaunches(list) {
  try {
    localStorage.setItem(LAUNCH_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    showToast('⚠ Storage full — mint is live on-chain but could not be saved locally.');
    return false;
  }
}

// ---------- Launchpad page ----------
function launchPic(l) {
  if (l.image) return `<img src="${escHtml(l.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
  if (l.avatar && l.avatar.e) {
    return `<span class="lp-emoji" style="background:${escHtml(l.avatar.bg || 'linear-gradient(135deg,#0891b2,#6366f1)')}">${escHtml(l.avatar.e)}</span>`;
  }
  return `<span class="lp-emoji" style="background:linear-gradient(135deg,#0891b2,#6366f1)">${escHtml(String(l.symbol || '?')[0] || '?').toUpperCase()}</span>`;
}

function renderLaunchpad() {
  const body = document.getElementById('launchListBody');
  if (!body) return;
  const list = getLaunches();

  if (!list.length) {
    body.innerHTML = `
      <tr><td colspan="6">
        <div class="launch-empty">
          <strong>No memecoins yet.</strong>
          <span>Your confirmed mints land here with mint address, supply and explorer links.</span>
          <button class="empty-btn" data-newlaunch>Create your first memecoin</button>
        </div>
      </td></tr>`;
  } else {
    body.innerHTML = list.slice().reverse().map(l => `
      <tr>
        <td>
          <div class="token-cell">
            <div class="token-pic">${launchPic(l)}</div>
            <div class="token-info">
              <span class="t-sym">$${escHtml(l.symbol)} <span class="token-chain-badge">${l.network === 'mainnet' ? 'MAINNET' : 'DEVNET'}</span></span>
              <span class="t-name">${escHtml(l.name)}</span>
            </div>
          </div>
        </td>
        <td><span class="price-cell mint-cell">${shortAddr(l.mint)}</span></td>
        <td><span class="token-chain-badge">${l.network === 'mainnet' ? 'MAINNET' : 'DEVNET'}</span></td>
        <td><span class="price-cell" style="font-size:12.5px">${compactNum(l.supply)} <small class="t-name">(${Number(l.supply).toLocaleString('en-US')})</small></span></td>
        <td><span class="token-chain-badge" style="color:#10b981;border-color:#10b981;">LIVE</span></td>
        <td>
          <a class="table-trade-btn" href="${solscanUrl('token/' + l.mint, l.network)}" target="_blank" rel="noopener">Explorer</a>
          <button class="table-trade-btn" data-copy="${escHtml(l.mint)}">Copy CA</button>
        </td>
      </tr>`).join('');
  }

  const foot = document.getElementById('launchCount');
  if (foot) {
    foot.textContent = list.length
      ? `${list.length} launch${list.length === 1 ? '' : 'es'} · every mint verified on Solana`
      : '0 launches · confirmed mints appear here the moment they land on-chain';
  }

  // Stats banner
  const totalSupply = list.reduce((sum, l) => sum + (Number(l.supply) || 0), 0);
  const nets = Array.from(new Set(list.map(l => l.network || 'devnet')));
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setText('lpStatLaunches', String(list.length));
  setText('lpStatSupply', list.length ? compactNum(totalSupply) : '0');
  setText('lpStatNets', list.length ? nets.map(n => n === 'mainnet' ? 'MAINNET' : 'DEVNET').join(' · ') : '—');
  setText('lpStatStatus', chainState.address ? 'Wallet live' : 'Ready');

  body.querySelectorAll('[data-newlaunch]').forEach(b => b.addEventListener('click', openLaunchWizard));
  body.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast('✓ Mint address copied.');
      } catch (e) {
        showToast('Mint: ' + btn.dataset.copy);
      }
    });
  });
}

// ---------- Wallet bar / status sync ----------
let chainState = { address: null, hasWallet: false, walletName: null, network: 'devnet', balance: null, status: 'disconnected' };

function applyWalletState(s) {
  chainState = Object.assign({}, chainState, s || {});

  const dot = document.getElementById('walletDot');
  const label = document.getElementById('walletStateLabel');
  const sub = document.getElementById('walletSubLabel');
  const btn = document.getElementById('walletActionBtn');
  const connected = !!chainState.address;

  dot?.classList.toggle('on', connected);
  if (label) label.textContent = connected ? 'Wallet connected' : (chainState.hasWallet ? 'Wallet not connected' : 'No wallet detected');
  if (sub) {
    sub.textContent = connected
      ? `${shortAddr(chainState.address)} · ${chainState.balance != null ? chainState.balance.toFixed(4) + ' SOL' : 'balance…'} · ${chainState.network === 'mainnet' ? 'Mainnet' : 'Devnet'}`
      : (chainState.hasWallet
        ? `Connect ${chainState.walletName || 'your wallet'} to launch a real SPL token.`
        : 'Install Phantom or Solflare to launch a real SPL token.');
  }
  if (btn) btn.textContent = connected ? 'Disconnect' : (chainState.hasWallet ? 'Connect wallet' : 'Install Phantom');

  const netSel = document.getElementById('lpNetSelect');
  if (netSel && netSel.value !== chainState.network) netSel.value = chainState.network;

  // Status strip
  const st = document.getElementById('stLaunch');
  if (st) {
    st.className = connected ? 'st live' : 'st off';
    st.innerHTML = `<i></i>${connected ? 'Wallet ' + shortAddr(chainState.address) : 'Wallet not connected'}`;
  }

  // Wizard step 3
  const ws = document.getElementById('wizWalletState');
  if (ws) ws.textContent = connected ? 'Connected' : 'Not connected';
  const wa = document.getElementById('wizWalletAddr');
  if (wa) wa.textContent = connected ? shortAddr(chainState.address) : '—';
  const wb = document.getElementById('wizWalletBal');
  if (wb) wb.textContent = chainState.balance != null ? chainState.balance.toFixed(4) + ' SOL' : (connected ? '…' : '—');

  syncLaunchButtons();
  const lp = document.getElementById('lpStatStatus');
  if (lp) lp.textContent = connected ? 'Wallet live' : 'Ready';
}

function syncLaunchButtons() {
  const connected = !!chainState.address;
  const successShown = !!(document.getElementById('wizSuccess') && !document.getElementById('wizSuccess').hidden);
  const showConnect = document.getElementById('wizConnectBtn');
  const showLaunch = document.getElementById('wizLaunchBtn');
  const firstBuyBtn = document.getElementById('wizFirstBuyBtn');
  const viewBtn = document.getElementById('wizViewBtn');
  const againBtn = document.getElementById('wizAgainBtn');
  const inWizard = !!(document.getElementById('launchOverlay')?.classList.contains('show'));
  if (!inWizard) return;
  if (showConnect) showConnect.hidden = connected || successShown;
  if (showLaunch) showLaunch.hidden = !connected || successShown;
  if (firstBuyBtn) firstBuyBtn.hidden = !(successShown && wizard.step === 3);
  if (viewBtn) viewBtn.hidden = !successShown;
  if (againBtn) againBtn.hidden = !successShown;
}

document.addEventListener('lantern:wallet', e => applyWalletState(e.detail));

document.getElementById('walletActionBtn')?.addEventListener('click', async () => {
  const c = window.LanternChain;
  if (!c) { showToast('Chain module is still loading — try again in a second.'); return; }
  if (chainState.address) {
    await c.disconnect();
    showToast('Wallet disconnected.');
    return;
  }
  if (!chainState.hasWallet) { window.open(c.installUrl, '_blank', 'noopener'); return; }
  try {
    const addr = await c.connect();
    showToast('✓ Wallet connected: ' + shortAddr(addr));
  } catch (err) {
    showToast('⚠ ' + (err && err.message ? err.message : 'Connection failed.'));
    if (err && err.code === 'NO_WALLET') window.open(c.installUrl, '_blank', 'noopener');
  }
});

document.getElementById('lpNetSelect')?.addEventListener('change', (e) => {
  const net = e.target.value;
  window.LanternChain?.setNetwork(net);
  setWizardNetwork(net);
  showToast(`Network set to ${net === 'mainnet' ? 'Mainnet (real SOL)' : 'Devnet (free)'}.`);
});

/* ------------------------- LAUNCH WIZARD ------------------------- */
const wizard = {
  step: 1,
  name: '',
  sym: '',
  desc: '',
  image: '',
  avatar: null,
  decimals: 9,
  supply: '1000000000',
  revokeMint: true,
  revokeFreeze: true,
  network: 'devnet',
  socials: { x: '', tg: '', web: '' },
  fee: 1,
  rain: 50,
  launching: false,
  done: false,
  lastLaunch: null
};

const LOGO_PRESETS = [
  { k: 'auto' },
  { k: 'img', v: 'assets/tokens/moonpepe.webp' },
  { k: 'img', v: 'assets/tokens/cat.png' },
  { k: 'img', v: 'assets/tokens/boo.webp' },
  { k: 'img', v: 'assets/tokens/capy.webp' },
  { k: 'img', v: 'assets/tokens/gtacat.png' },
  { k: 'img', v: 'assets/tokens/lego.webp' },
  { k: 'img', v: 'assets/tokens/starinu.webp' },
  { k: 'img', v: 'assets/tokens/qaven.png' },
  { k: 'emoji', v: '🐸', bg: 'linear-gradient(135deg,#10b981,#0ea5e9)' },
  { k: 'emoji', v: '🚀', bg: 'linear-gradient(135deg,#8b5cf6,#ec4899)' },
  { k: 'emoji', v: '🌙', bg: 'linear-gradient(135deg,#1e293b,#6366f1)' },
  { k: 'emoji', v: '🔥', bg: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { k: 'emoji', v: '💎', bg: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
  { k: 'emoji', v: '🦍', bg: 'linear-gradient(135deg,#334155,#0f172a)' },
  { k: 'emoji', v: '😼', bg: 'linear-gradient(135deg,#f472b6,#a855f7)' }
];

function openLaunchWizard() {
  const overlay = document.getElementById('launchOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
  if (wizard.done) resetWizard();
  goWizardStep(wizard.step || 1);
  refreshPreview();
  loadCostEstimate();
  setTimeout(() => document.getElementById('wizName')?.focus(), 150);
}

function closeLaunchWizard() {
  if (wizard.launching) { showToast('Launch in progress — wait for the signature.'); return; }
  const overlay = document.getElementById('launchOverlay');
  overlay?.classList.remove('show');
  overlay?.setAttribute('aria-hidden', 'true');
}

function resetWizard() {
  wizard.step = 1;
  wizard.name = ''; wizard.sym = ''; wizard.desc = '';
  wizard.image = ''; wizard.avatar = null;
  wizard.decimals = 9; wizard.supply = '1000000000';
  wizard.revokeMint = true; wizard.revokeFreeze = true;
  wizard.socials = { x: '', tg: '', web: '' };
  wizard.fee = 1; wizard.rain = 50;
  wizard.launching = false; wizard.done = false; wizard.lastLaunch = null;

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setVal('wizName', ''); setVal('wizSym', ''); setVal('wizDesc', '');
  setVal('wizSupply', '1000000000'); setVal('wizDecimals', '9');
  setVal('wizSocialX', ''); setVal('wizSocialTg', ''); setVal('wizSocialWeb', '');
  setVal('wizFee', '1'); setVal('wizRain', '50');
  const rm = document.getElementById('wizRevokeMint'); if (rm) rm.checked = true;
  const rf = document.getElementById('wizRevokeFreeze'); if (rf) rf.checked = true;
  const cnt = document.getElementById('wizDescCount'); if (cnt) cnt.textContent = '0/160';
  document.querySelectorAll('#wizSupplyChips button').forEach(b => b.classList.toggle('active', b.dataset.supply === '1000000000'));
  renderFeeLabels();

  ['wizSuccess', 'wizProgress'].forEach(id => { const el = document.getElementById(id); if (el) el.hidden = true; });
  document.querySelectorAll('#wizProgress .wp-row').forEach(r => r.classList.remove('active', 'done', 'err'));
  ['wizHint1', 'wizHint2', 'wizHint3'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
  const fine = document.getElementById('wizFine');
  if (fine) fine.textContent = 'You will sign 2 transactions: create the mint, then mint your supply.';
  renderGallery();
}

function goWizardStep(n) {
  n = Math.max(1, Math.min(4, n));
  wizard.step = n;
  document.querySelectorAll('.wiz-panel').forEach(p => { p.hidden = Number(p.dataset.panel) !== n; });
  document.querySelectorAll('#wizSteps li').forEach((li, i) => {
    li.classList.toggle('active', i + 1 === n);
    li.classList.toggle('done', i + 1 < n);
  });
  if (n === 2) { renderTokenomics(); loadCostEstimate(); }
  if (n === 3) { renderReview(); renderScore(); syncLaunchButtons(); loadCostEstimate(); }
  if (n === 4) { syncLaunchButtons(); initFirstBuy(); }
}

function renderFeeLabels() {
  const f = document.getElementById('wizFeeVal');
  if (f) f.textContent = (wizard.fee || 0) + '%';
  const r = document.getElementById('wizRainVal');
  if (r) r.textContent = (wizard.rain || 0) + '%';
  const split = document.getElementById('wizFeeSplit');
  if (split) split.textContent = (100 - (wizard.rain || 0)) + ' / ' + (wizard.rain || 0);
  const note = document.getElementById('wizRainNote');
  if (note) {
    note.textContent = (wizard.rain || 0) > 0
      ? `${wizard.rain}% of every creator fee is queued for holder rain draws.`
      : 'Holder rain off — all creator fees stay with you.';
  }
}

function refreshPreview() {
  const sym = (wizard.sym || '').toUpperCase();
  const logo = document.getElementById('lpLogo');
  if (logo) {
    if (wizard.image) {
      logo.className = 'lp-logo has-img';
      logo.innerHTML = `<img src="${escHtml(wizard.image)}" alt="" onerror="this.parentNode.classList.remove('has-img')">`;
    } else if (wizard.avatar && wizard.avatar.e) {
      logo.className = 'lp-logo';
      logo.style.background = wizard.avatar.bg || 'linear-gradient(135deg,#0891b2,#6366f1)';
      logo.innerHTML = `<span style="font-size:34px">${escHtml(wizard.avatar.e)}</span>`;
    } else {
      logo.className = 'lp-logo';
      logo.style.background = 'linear-gradient(135deg,#0891b2,#6366f1)';
      logo.innerHTML = `<span>${escHtml((sym || wizard.name || '?')[0] || '?').toUpperCase()}</span>`;
    }
  }
  const symEl = document.getElementById('lpSym');
  if (symEl) symEl.textContent = sym ? '$' + sym : '$TOKEN';
  const nameEl = document.getElementById('lpName');
  if (nameEl) nameEl.textContent = wizard.name.trim() || 'Your memecoin';
  const descEl = document.getElementById('lpDesc');
  if (descEl) descEl.textContent = wizard.desc.trim() || 'Your story shows up right here.';
  const chainEl = document.getElementById('lpChain');
  if (chainEl) chainEl.textContent = wizard.network === 'mainnet' ? 'SOLANA MAINNET' : 'SOLANA DEVNET';
  const supEl = document.getElementById('lpSupplyTxt');
  if (supEl) supEl.textContent = (Number(wizard.supply) || 0).toLocaleString('en-US') + ' supply';
}

function renderGallery() {
  const g = document.getElementById('wizGallery');
  if (!g) return;
  g.innerHTML = LOGO_PRESETS.map((p, i) => {
    const active = (p.k === 'auto' && !wizard.image && !wizard.avatar)
      || (p.k === 'img' && wizard.image === p.v)
      || (p.k === 'emoji' && wizard.avatar && wizard.avatar.e === p.v);
    if (p.k === 'img') {
      return `<button type="button" class="gal-opt ${active ? 'active' : ''}" data-gi="${i}" title="preset"><img src="${p.v}" alt="" loading="lazy" onerror="this.parentNode.style.display='none'"></button>`;
    }
    if (p.k === 'emoji') {
      return `<button type="button" class="gal-opt ${active ? 'active' : ''}" data-gi="${i}" title="avatar" style="background:${p.bg}">${p.v}</button>`;
    }
    return `<button type="button" class="gal-opt gal-auto ${active ? 'active' : ''}" data-gi="${i}" title="auto logo">${escHtml(((wizard.sym || wizard.name || '?')[0] || '?').toUpperCase())}</button>`;
  }).join('');

  g.querySelectorAll('[data-gi]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = LOGO_PRESETS[Number(btn.dataset.gi)];
      if (p.k === 'auto') { wizard.image = ''; wizard.avatar = null; }
      else if (p.k === 'img') { wizard.image = p.v; wizard.avatar = null; }
      else { wizard.image = ''; wizard.avatar = { e: p.v, bg: p.bg }; }
      renderGallery();
      refreshPreview();
    });
  });
}

function resizeLogo(file, done) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 192;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      let url;
      try { url = canvas.toDataURL('image/png'); } catch (e) { url = reader.result; }
      if (url && url.length > 400000) {
        try { url = canvas.toDataURL('image/jpeg', 0.8); } catch (e) {}
      }
      done(url);
    };
    img.onerror = () => done(null);
    img.src = reader.result;
  };
  reader.onerror = () => done(null);
  reader.readAsDataURL(file);
}

function unitsFor(supply, decimals) {
  return BigInt(String(supply || '0').replace(/[^\d]/g, '') || '0') * (10n ** BigInt(decimals));
}
function maxSupplyFor(decimals) {
  return (U64_MAX / (10n ** BigInt(decimals))).toString();
}

function renderTokenomics() {
  const supplyStr = String(wizard.supply || '0');
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('tokSupply', (Number(supplyStr) || 0).toLocaleString('en-US'));
  set('tokDec', String(wizard.decimals));
  let units = '0';
  try { units = unitsFor(supplyStr, wizard.decimals).toLocaleString('en-US'); } catch (e) {}
  set('tokUnits', units);
  const ma = document.getElementById('tokMintAuth');
  if (ma) { ma.textContent = wizard.revokeMint ? 'Revoked (fixed)' : 'Kept (can mint)'; ma.className = wizard.revokeMint ? 'ok' : 'warn'; }
  const fa = document.getElementById('tokFreezeAuth');
  if (fa) { fa.textContent = wizard.revokeFreeze ? 'Revoked (rug-proof)' : 'Kept (can freeze)'; fa.className = wizard.revokeFreeze ? 'ok' : 'warn'; }
  set('tokFee', wizard.fee > 0 ? wizard.fee + '% of volume' : '0% — off');
  set('tokRain', wizard.rain > 0 ? wizard.rain + '% of fees' : 'off');
  renderFeeLabels();
}

async function loadCostEstimate() {
  const c = window.LanternChain;
  if (!c || typeof c.estimateCost !== 'function') return;
  try {
    const r = await c.estimateCost();
    const sol = '≈' + ((r.lamports || 3600000) / 1e9).toFixed(4) + ' SOL';
    const a = document.getElementById('tokCost'); if (a) a.textContent = sol;
    const b = document.getElementById('wizCost'); if (b) b.textContent = sol;
    const d = document.getElementById('rvCost'); if (d) d.textContent = sol;
  } catch (e) {}
}

function calcScore() {
  const tips = [];
  let s = 30;
  const name = wizard.name.trim();
  const sym = (wizard.sym || '').trim();
  const desc = wizard.desc.trim();

  if (name.length >= 4) { s += 12; tips.push([1, 'Name is clear and readable']); }
  else { tips.push([0, 'Use a name of at least 4 characters']); }

  if (/^[A-Z0-9]{3,6}$/.test(sym)) { s += 12; tips.push([1, 'Ticker fits market standards (3–6 chars)']); }
  else if (/^[A-Z0-9]{2,10}$/.test(sym)) { s += 6; tips.push([0, 'Tickers of 3–6 characters read best']); }
  else { tips.push([0, 'Ticker must be 2–10 letters or numbers']); }

  if (desc.length >= 60) { s += 16; tips.push([1, 'Strong, complete story']); }
  else if (desc.length >= 20) { s += 8; tips.push([0, 'Add more story — aim for 60+ characters']); }
  else { tips.push([0, 'Write at least 60 characters of story']); }

  if (wizard.image) { s += 12; tips.push([1, 'Custom logo uploaded']); }
  else if (wizard.avatar) { s += 9; tips.push([1, 'Logo avatar selected']); }
  else { tips.push([0, 'Add a logo — tokens with art outperform']); }

  if (wizard.revokeMint && wizard.revokeFreeze) { s += 12; tips.push([1, 'Authorities revoked — trusted setup']); }
  else { tips.push([0, 'Revoke mint & freeze authorities']); }

  const soc = [wizard.socials.x, wizard.socials.tg, wizard.socials.web].filter(Boolean).length;
  if (soc >= 2) { s += 8; tips.push([1, soc + ' socials linked — buyers can verify you']); }
  else if (soc === 1) { s += 4; tips.push([0, 'Add X and Telegram — buyers check links first']); }
  else { tips.push([0, 'Add socials — anonymous launches convert worse']); }

  if (wizard.network === 'mainnet') { s += 7; tips.push([1, 'Mainnet launch — real attention signal']); }
  else { tips.push([0, 'Devnet first, then launch mainnet for real buyers']); }

  if (name && sym && desc) s += 4;
  return { score: Math.min(99, s), tips };
}

function renderScore() {
  const { score, tips } = calcScore();
  const val = document.getElementById('scoreVal');
  const bar = document.getElementById('scoreBar');
  const list = document.getElementById('scoreTips');
  if (val) { val.textContent = score + '/100'; val.className = score >= 70 ? 'good' : score >= 50 ? 'mid' : 'low'; }
  if (bar) { bar.style.width = score + '%'; bar.className = score >= 70 ? 'good' : score >= 50 ? 'mid' : 'low'; }
  if (list) list.innerHTML = tips.map(t => `<li class="${t[0] ? 'yes' : 'no'}">${t[0] ? '✓' : '✕'} ${escHtml(t[1])}</li>`).join('');
}

function renderReview() {
  const rows = document.getElementById('wizReviewRows');
  if (!rows) return;
  const net = wizard.network === 'mainnet' ? 'Solana Mainnet' : 'Solana Devnet';
  const socialsOn = [wizard.socials.x, wizard.socials.tg, wizard.socials.web].filter(Boolean).length;
  const rowsData = [
    ['Token', escHtml((wizard.name || '—').trim()) + ' <span class="rv-sym">$' + escHtml(wizard.sym || '—') + '</span>'],
    ['Supply', (Number(wizard.supply) || 0).toLocaleString('en-US') + ' <small class="rv-dim">· ' + wizard.decimals + ' decimals</small>'],
    ['Mint authority', wizard.revokeMint ? 'Revoked — fixed supply' : 'Kept — can mint more'],
    ['Freeze authority', wizard.revokeFreeze ? 'Revoked — rug-proof' : 'Kept — can freeze wallets'],
    ['Creator fee', wizard.fee > 0 ? wizard.fee + '% <small class="rv-dim">· ' + wizard.rain + '% rained on holders</small>' : '0% — off'],
    ['Socials', socialsOn ? socialsOn + ' linked <small class="rv-dim">· X · Telegram · site</small>' : 'none added'],
    ['Network', net],
    ['Launch cost', '<span id="rvCost">≈0.0036 SOL</span> + fees']
  ];
  rows.innerHTML = rowsData.map(r => `<div class="wiz-row"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join('');
}

function setWizardNetwork(net) {
  wizard.network = net === 'mainnet' ? 'mainnet' : 'devnet';
  document.querySelectorAll('#wizNetChips button').forEach(b => b.classList.toggle('active', b.dataset.net === wizard.network));
  const tag = document.getElementById('wizNetTag');
  if (tag) tag.textContent = 'SOLANA · ' + wizard.network.toUpperCase();
  refreshPreview();
  renderScore();
}

function setHint(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html || '';
}

function validateStep(n) {
  if (n === 1) {
    const name = wizard.name.trim();
    const sym = (wizard.sym || '').trim();
    if (name.length < 2) { setHint('wizHint1', 'Give your token a name first.'); return false; }
    if (!/^[A-Za-z0-9]{2,10}$/.test(sym)) { setHint('wizHint1', 'Ticker must be 2–10 letters or numbers (e.g. LINU).'); return false; }
    for (const [k, label] of [['x', 'X'], ['tg', 'Telegram'], ['web', 'website']]) {
      const v = (wizard.socials[k] || '').trim();
      if (v && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(v)) {
        setHint('wizHint1', `Your ${label} link needs to start with https:// — or clear the field.`);
        return false;
      }
    }
    setHint('wizHint1', '');
    return true;
  }
  if (n === 2) {
    const supplyStr = String(wizard.supply || '').replace(/[^\d]/g, '');
    if (!supplyStr || Number(supplyStr) <= 0) { setHint('wizHint2', 'Set a total supply greater than zero.'); return false; }
    let units;
    try { units = unitsFor(supplyStr, wizard.decimals); } catch (e) { units = U64_MAX + 1n; }
    if (units > U64_MAX) {
      const max = Number(maxSupplyFor(wizard.decimals)).toLocaleString('en-US');
      setHint('wizHint2', `With ${wizard.decimals} decimals the on-chain cap is ${max} tokens — lower the supply or pick fewer decimals.`);
      return false;
    }
    setHint('wizHint2', '');
    return true;
  }
  return true;
}

/* ---------- launch execution (real chain) ---------- */
const WP_ORDER = ['prep', 'sign1', 'conf1', 'sign2', 'conf2'];

function resetProgress() {
  document.querySelectorAll('#wizProgress .wp-row').forEach(r => r.classList.remove('active', 'done', 'err'));
}
function paintProgress(p) {
  const stage = p && p.stage;
  const idx = WP_ORDER.indexOf(stage);
  if (stage === 'done') {
    document.querySelectorAll('#wizProgress .wp-row').forEach(r => r.classList.add('done'));
    return;
  }
  if (idx < 0) return;
  document.querySelectorAll('#wizProgress .wp-row').forEach((r, i) => {
    r.classList.toggle('done', i < idx);
    r.classList.toggle('active', i === idx);
  });
}
function markProgressError() {
  const active = document.querySelector('#wizProgress .wp-row.active');
  if (active) { active.classList.remove('active'); active.classList.add('err'); }
}

function launchErrorUi(err) {
  markProgressError();
  const msg = (err && err.message) ? err.message : 'Launch failed.';
  showToast('⚠ ' + msg);
  if (err && err.code === 'NO_WALLET') {
    const url = (window.LanternChain && window.LanternChain.installUrl) || 'https://phantom.app/download';
    setHint('wizHint3', `No Solana wallet found. <a href="${url}" target="_blank" rel="noopener">Install Phantom ↗</a>`);
  } else {
    setHint('wizHint3', escHtml(msg));
  }
  const fine = document.getElementById('wizFine');
  if (fine) fine.textContent = 'Nothing was charged beyond the fee of the confirmed transaction.';
  syncLaunchButtons();
}

function finishLaunch(res, record) {
  wizard.done = true;
  const prog = document.getElementById('wizProgress');
  if (prog) prog.hidden = true;
  const success = document.getElementById('wizSuccess');
  if (success) success.hidden = false;

  const mintEl = document.getElementById('wsMint');
  if (mintEl) mintEl.textContent = shortAddr(res.mint);
  const sigEl = document.getElementById('wsSig');
  if (sigEl) sigEl.textContent = shortAddr(res.signature);
  const link = document.getElementById('wsLink');
  if (link) { link.href = res.tokenUrl; link.textContent = 'View $' + record.symbol + ' on Solscan ↗'; }

  const fine = document.getElementById('wizFine');
  if (fine) fine.textContent = 'Minted ' + (Number(record.supply) || 0).toLocaleString('en-US') + ' $' + record.symbol + ' to your wallet on ' + (res.network === 'mainnet' ? 'Mainnet' : 'Devnet') + '.';

  const lb = document.getElementById('wizLaunchBtn');
  if (lb) lb.hidden = true;
  const cb = document.getElementById('wizConnectBtn');
  if (cb) cb.hidden = true;

  wizard.lastLaunch = { record: record, res: res };

  renderLaunchpad();
  showToast(`✦ $${record.symbol} is live on-chain — mint ${shortAddr(res.mint)}`);
}

async function startLaunch() {
  const c = window.LanternChain;
  if (!c) { setHint('wizHint3', 'Chain libraries are still loading — try again in a moment.'); return; }
  if (wizard.launching || wizard.done) return;
  if (!validateStep(1) || !validateStep(2)) return;

  if (!c.getState().address) {
    setHint('wizHint3', 'Connecting wallet…');
    try {
      await c.connect();
    } catch (err) {
      launchErrorUi(err);
      return;
    }
  }

  wizard.launching = true;
  setHint('wizHint3', '');
  const success = document.getElementById('wizSuccess');
  if (success) success.hidden = true;
  const prog = document.getElementById('wizProgress');
  if (prog) prog.hidden = false;
  resetProgress();
  syncLaunchButtons();
  const lb = document.getElementById('wizLaunchBtn');
  if (lb) { lb.hidden = false; lb.disabled = true; lb.textContent = 'Launching…'; }

  try {
    const res = await c.deployMemeCoin({
      symbol: wizard.sym,
      decimals: wizard.decimals,
      supply: String(wizard.supply).replace(/[^\d]/g, ''),
      revokeMint: wizard.revokeMint,
      revokeFreeze: wizard.revokeFreeze,
      onProgress: paintProgress
    });
    const record = {
      id: 'l' + Date.now(),
      name: wizard.name.trim(),
      symbol: wizard.sym.toUpperCase(),
      desc: wizard.desc.trim(),
      image: wizard.image,
      avatar: wizard.avatar,
      socials: { x: wizard.socials.x, tg: wizard.socials.tg, web: wizard.socials.web },
      fee: wizard.fee,
      rain: wizard.rain,
      supply: String(wizard.supply).replace(/[^\d]/g, ''),
      decimals: wizard.decimals,
      revokeMint: wizard.revokeMint,
      revokeFreeze: wizard.revokeFreeze,
      network: res.network,
      mint: res.mint,
      sig: res.signature,
      ts: Date.now(),
      by: session.name || 'trader'
    };
    const list = getLaunches();
    list.push(record);
    saveLaunches(list);
    finishLaunch(res, record);
  } catch (err) {
    launchErrorUi(err);
  } finally {
    wizard.launching = false;
    if (lb) { lb.disabled = false; lb.textContent = 'Launch memecoin'; }
    syncLaunchButtons();
  }
}

/* ---------- wizard wiring ---------- */
document.getElementById('createCoinBtn')?.addEventListener('click', openLaunchWizard);
document.getElementById('createCoinBtn2')?.addEventListener('click', openLaunchWizard);
document.getElementById('launchClose')?.addEventListener('click', closeLaunchWizard);
document.getElementById('launchOverlay')?.addEventListener('click', e => {
  if (e.target.id === 'launchOverlay') closeLaunchWizard();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('launchOverlay')?.classList.contains('show')) closeLaunchWizard();
});

document.querySelectorAll('[data-wiz-cancel]').forEach(b => b.addEventListener('click', closeLaunchWizard));
document.querySelectorAll('[data-wiz-next]').forEach(b => b.addEventListener('click', () => {
  const target = Number(b.dataset.wizNext);
  if (validateStep(wizard.step)) goWizardStep(target);
}));
document.querySelectorAll('[data-wiz-back]').forEach(b => b.addEventListener('click', () => goWizardStep(Number(b.dataset.wizBack))));

// Step 1 fields
document.getElementById('wizName')?.addEventListener('input', e => {
  wizard.name = e.target.value;
  refreshPreview();
  renderGallery();
});
document.getElementById('wizSym')?.addEventListener('input', e => {
  const pos = e.target.selectionStart;
  e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  e.target.setSelectionRange(pos, pos);
  wizard.sym = e.target.value;
  refreshPreview();
  renderGallery();
});
document.getElementById('wizDesc')?.addEventListener('input', e => {
  wizard.desc = e.target.value;
  const cnt = document.getElementById('wizDescCount');
  if (cnt) cnt.textContent = `${e.target.value.length}/160`;
  refreshPreview();
});
document.getElementById('wizLogoFile')?.addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) { showToast('Please choose an image file.'); return; }
  resizeLogo(file, url => {
    if (!url) { showToast('⚠ Could not read that image.'); return; }
    wizard.image = url;
    wizard.avatar = null;
    renderGallery();
    refreshPreview();
    showToast('✓ Logo ready.');
  });
  e.target.value = '';
});

// Step 2 fields
document.querySelectorAll('#wizSupplyChips button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#wizSupplyChips button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  wizard.supply = b.dataset.supply;
  const inp = document.getElementById('wizSupply');
  if (inp) inp.value = b.dataset.supply;
  setHint('wizHint2', '');
  renderTokenomics();
  refreshPreview();
}));
document.getElementById('wizSupply')?.addEventListener('input', e => {
  const digits = e.target.value.replace(/[^\d]/g, '');
  e.target.value = digits;
  wizard.supply = digits || '0';
  document.querySelectorAll('#wizSupplyChips button').forEach(x => x.classList.toggle('active', x.dataset.supply === digits));
  setHint('wizHint2', '');
  renderTokenomics();
  refreshPreview();
});
document.getElementById('wizDecimals')?.addEventListener('change', e => {
  wizard.decimals = Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0));
  setHint('wizHint2', '');
  renderTokenomics();
});
document.getElementById('wizRevokeMint')?.addEventListener('change', e => {
  wizard.revokeMint = e.target.checked;
  renderTokenomics();
  renderScore();
});
document.getElementById('wizRevokeFreeze')?.addEventListener('change', e => {
  wizard.revokeFreeze = e.target.checked;
  renderTokenomics();
  renderScore();
});

// Step 3
document.querySelectorAll('#wizNetChips button').forEach(b => b.addEventListener('click', () => {
  window.LanternChain?.setNetwork(b.dataset.net);
  setWizardNetwork(b.dataset.net);
  const sel = document.getElementById('lpNetSelect');
  if (sel) sel.value = b.dataset.net;
}));
document.getElementById('wizConnectBtn')?.addEventListener('click', async () => {
  const c = window.LanternChain;
  if (!c) { setHint('wizHint3', 'Chain libraries are still loading — try again.'); return; }
  try {
    const addr = await c.connect();
    setHint('wizHint3', '');
    showToast('✓ Wallet connected: ' + shortAddr(addr));
  } catch (err) {
    launchErrorUi(err);
  }
});
document.getElementById('wizLaunchBtn')?.addEventListener('click', startLaunch);
document.getElementById('wizViewBtn')?.addEventListener('click', () => {
  closeLaunchWizard();
  showView('Launchpad');
});
document.getElementById('wizAgainBtn')?.addEventListener('click', () => {
  resetWizard();
  goWizardStep(1);
  refreshPreview();
});

renderGallery();
refreshPreview();

// Step 1: socials
[['wizSocialX', 'x'], ['wizSocialTg', 'tg'], ['wizSocialWeb', 'web']].forEach(([id, key]) => {
  document.getElementById(id)?.addEventListener('input', e => {
    wizard.socials[key] = e.target.value.trim();
    renderScore();
    if (wizard.step === 3) renderReview();
  });
});

// Step 2: creator fee + holder rain
document.getElementById('wizFee')?.addEventListener('input', e => {
  wizard.fee = parseFloat(e.target.value) || 0;
  renderFeeLabels();
  renderTokenomics();
  if (wizard.step === 3) renderReview();
});
document.getElementById('wizRain')?.addEventListener('input', e => {
  wizard.rain = parseInt(e.target.value, 10) || 0;
  renderFeeLabels();
  renderTokenomics();
  if (wizard.step === 3) renderReview();
});

// Step 3 → 4: first buy
document.getElementById('wizFirstBuyBtn')?.addEventListener('click', () => goWizardStep(4));

// Initial boot
renderCandleChart();
renderOverviewPerformance();
renderWallets();
renderMarketTable();

// Live market hydration: SOL callout stats, market table, discover grid,
// watchlist + the overview chart — then keep the numbers fresh every 60s.
hydrateMarketData();
loadOverviewCallout();
setInterval(() => {
  hydrateMarketData();
  scheduleCalloutRecheck.tries = 0; // fresh budget of supply-read retries per tick
  loadOverviewCallout();
}, 60000);

// Handle direct hash navigation
if (window.location.hash) {
  const hash = window.location.hash.slice(1);
  const map = {
    'overview': 'Overview',
    'discover': 'Discover',
    'pnl': 'PnL & cards',
    'portfolio': 'Portfolio',
    'watchlist': 'Watchlist',
    'ai-trading': 'AI Trading',
    'auto-snipe': 'Auto Snipe',
    'launchpad': 'Launchpad',
    'cabal': 'Cabal leaderboard',
    'holder-rewards': 'Holder rewards',
    'referrals': 'Referrals',
    'wallets': 'Wallets',
    'activity': 'Activity',
    'live-feed': 'Live feed',
    'token-lookup': 'Token lookup',
    'narratives': 'Narratives',
    'alerts': 'Alerts',
    'telegram': 'Telegram',
    'bridge': 'Bridge',
    'ai-advanced': 'AI Advanced',
    'strategy-lab': 'Strategy Lab',
    'proposals': 'Proposals',
    'public-calls': 'Public calls'
  };
  if (map[hash]) setTimeout(() => showView(map[hash]), 0);
}

// Re-render candle chart on viewport changes (rotate / resize)
let __crtResizeT;
window.addEventListener('resize', () => {
  clearTimeout(__crtResizeT);
  __crtResizeT = setTimeout(() => {
    const blk = document.getElementById('chartBlock');
    if (blk && blk.getBoundingClientRect().width > 0) renderCandleChart();
  }, 180);
});

/* =========================================================================
   LANTERN — REAL trading module (FLÈA-style lookup / swap / positions)
   Data: DexScreener · GeckoTerminal · Jupiter Price  (marketdata.js)
   Execution: Jupiter swap quotes + Solana RPC           (chain.js)
   ========================================================================= */
const T$ = id => document.getElementById(id);
const SOL_MINT = (window.LANTERN && window.LANTERN.data && window.LANTERN.data.SOL) || 'So11111111111111111111111111111111111111112';
const COST_KEY = 'lantern:costbasis';
const TRADES_KEY = 'lantern:trades';

const tradeState = {
  mint: null, pair: null, candles: [],
  tf: '15m', side: 'buy', decimals: null, sym: 'TOKEN',
  wired: false, busy: false, quoteTimer: null,
  tokenBal: 0, solUsd: null
};

const TRADE_TFS = {
  '5m': { tf: 'minute', agg: 5, limit: 96 },
  '15m': { tf: 'minute', agg: 15, limit: 96 },
  '1h': { tf: 'hour', agg: 1, limit: 96 },
  '6h': { tf: 'hour', agg: 6, limit: 96 },
  '1d': { tf: 'day', agg: 1, limit: 60 }
};

/* ---------------- formatting ---------------- */
function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—';
  const s = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return s + '$' + (a / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return s + '$' + (a / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return s + '$' + (a / 1e3).toFixed(1) + 'K';
  if (a >= 1) return s + '$' + a.toFixed(2);
  if (a === 0) return '$0.00';
  if (a >= 0.01) return s + '$' + a.toFixed(4);
  return s + '$' + a.toFixed(Math.min(12, Math.ceil(-Math.log10(a)) + 3));
}
function fmtPrice(v) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '$0';
  if (a >= 1000) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a >= 1) return '$' + v.toFixed(4);
  return '$' + v.toFixed(Math.min(12, Math.ceil(-Math.log10(a)) + 3));
}
function fmtPct(n) { return (n == null || isNaN(n)) ? '—' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }
function dirCls(n) { return (n == null || isNaN(n)) ? '' : (n >= 0 ? 'up' : 'down'); }
function fmtTok(n) {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return compactNum(n);
  if (a >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}
function ageLabelT(h) {
  if (h == null) return '—';
  if (h < 1) return Math.round(h * 60) + 'm';
  if (h < 48) return Math.round(h) + 'h';
  return Math.round(h / 24) + 'd';
}
function readCost() { try { return JSON.parse(localStorage.getItem(COST_KEY)) || {}; } catch (e) { return {}; } }
function writeCost(o) { try { localStorage.setItem(COST_KEY, JSON.stringify(o)); } catch (e) {} }
function readTrades() { try { return JSON.parse(localStorage.getItem(TRADES_KEY)) || []; } catch (e) { return []; } }
function writeTrades(a) { try { localStorage.setItem(TRADES_KEY, JSON.stringify(a.slice(-60))); } catch (e) {} }

/* ---------------- view state helpers ---------------- */
function setTradeMode(mode) {
  const e = T$('tradeEmpty'), l = T$('tradeLoading'), d = T$('tradeLoaded');
  if (e) e.hidden = mode !== 'empty';
  if (l) l.hidden = mode !== 'loading';
  if (d) d.hidden = mode !== 'loaded';
}
function setRpcNote(t) { const n = T$('wlRpcNote'); if (n) n.textContent = t; }
function paintRpcPills() {
  const ms = chainState.rpcMs;
  [['rpcPill', 'rpcMs'], ['wlRpcPill', 'wlRpcMs']].forEach(([p, i]) => {
    const pill = T$(p), val = T$(i);
    if (val) val.textContent = ms != null ? ms + ' ms' : '—';
    if (pill) {
      pill.classList.toggle('good', ms != null && ms < 600);
      pill.classList.toggle('bad', ms != null && ms >= 600);
      pill.title = chainState.rpcUrl ? 'RPC: ' + chainState.rpcUrl : 'RPC latency';
    }
  });
}

/* ---------------- trending grid ---------------- */
async function loadTrending() {
  const grid = T$('trendGrid');
  if (!grid) return;
  grid.innerHTML = '<span class="t-name">Loading live tokens…</span>';
  try {
    const list = await window.LANTERN.data.trending(8);
    if (!list.length) { grid.innerHTML = '<span class="t-name">Trending unavailable right now — paste a mint above.</span>'; return; }
    grid.innerHTML = list.map(t => {
      const i = t.info || {};
      const chg = i.change ? i.change.h24 : null;
      const pic = i.image || t.image;
      const sym = String(i.symbol || t.symbol || t.mint || '?').replace(/^\$+/g, '').trim().slice(0, 10).trim() || '?';
      const letter = escHtml(sym[0] || '?').toUpperCase();
      return `<button class="trend-card" data-mint="${escHtml(t.mint)}" type="button">
        <span class="token-pic">${pic ? `<img src="${escHtml(pic)}" alt="" loading="lazy">` : letter}</span>
        <span class="tc-body">
          <span class="tc-sym">$${escHtml(sym)}</span>
          <span class="tc-price">${fmtPrice(i.price)} <b class="tc-chg ${dirCls(chg)}">${fmtPct(chg)}</b></span>
        </span>
      </button>`;
    }).join('');
    grid.querySelectorAll('[data-mint]').forEach(b => {
      const img = b.querySelector('img');
      if (img) img.addEventListener('error', () => { img.replaceWith(document.createTextNode((b.textContent.trim()[0] || '?'))); });
      b.addEventListener('click', () => openTradeToken(b.dataset.mint));
    });
  } catch (e) {
    grid.innerHTML = '<span class="t-name">Trending unavailable — paste a mint above.</span>';
  }
}

/* ---------------- lookup ---------------- */
async function openTradeToken(q) {
  q = String(q || '').trim();
  if (!q) return;
  setTradeMode('loading');
  try {
    let mint = null;
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) mint = q;
    else {
      const res = await window.LANTERN.data.search(q, 1);
      if (res && res.length) mint = res[0].mint;
    }
    if (!mint) throw new Error('No Solana token matched that search.');
    await loadTradeToken(mint);
    showToast('✓ Loaded $' + tradeState.sym);
  } catch (e) {
    setTradeMode('empty');
    showToast('⚠ ' + (e && e.message ? e.message : 'Lookup failed.'));
  }
}

async function loadTradeToken(mint) {
  const D = window.LANTERN.data;
  const c = window.LanternChain;
  const info = await D.tokenInfo(mint);
  if (!info) throw new Error('No DEX pool found for that mint — it may not be tradable yet.');

  tradeState.mint = mint;
  tradeState.pair = info;
  tradeState.sym = info.symbol || 'TOKEN';
  tradeState.tf = '15m';
  tradeState.decimals = null;
  tradeState.quote = null;
  try { localStorage.setItem('lantern:lastTrade', mint); } catch (e) {}

  renderTradeHeader();
  renderTradeStats();
  setTradeMode('loaded');
  T$('tkTfRow').querySelectorAll('.tf-btn').forEach(b => b.classList.toggle('active', b.dataset.tf === '15m'));

  const t = TRADE_TFS['15m'];
  const [candles, mintInfo, holders, prices] = await Promise.all([
    D.ohlcv(info.pairAddress, t.tf, t.limit, t.agg).catch(() => []),
    (c && c.getMintInfo) ? c.getMintInfo(mint).catch(() => null) : Promise.resolve(null),
    (c && c.getTopHolders) ? c.getTopHolders(mint).catch(() => null) : Promise.resolve(null),
    D.prices([D.SOL])
  ]);
  tradeState.candles = candles;
  if (mintInfo && mintInfo.decimals != null) tradeState.decimals = mintInfo.decimals;
  if (prices && prices[D.SOL]) tradeState.solUsd = prices[D.SOL].usd;

  paintTradeChart();
  renderHolders(holders);

  const safety = (c && c.safetyScreen)
    ? await c.safetyScreen(mint, info, { mintInfo: mintInfo, holders: holders }).catch(() => null)
    : null;
  renderSafety(safety);

  scheduleTradeQuote(true);
  syncTpButton();
  updateTpBalance();
  renderTpPosition();
  renderTpHistory();
}

function renderTradeHeader() {
  const p = tradeState.pair;
  const letter = escHtml((tradeState.sym || '?')[0] || '?').toUpperCase();
  const pic = T$('tkPic');
  if (pic) {
    pic.innerHTML = p.image ? `<img src="${escHtml(p.image)}" alt="">` : letter;
    const img = pic.querySelector('img');
    if (img) img.addEventListener('error', () => { pic.textContent = letter; });
  }
  const set = (id, v) => { const el = T$(id); if (el) el.textContent = v; };
  set('tkSym', '$' + tradeState.sym);
  set('tkName', p.name || tradeState.sym);
  set('tkPrice', fmtPrice(p.price));
  const chg = T$('tkChange');
  if (chg) { chg.textContent = fmtPct(p.change && p.change.h24) + ' 24h'; chg.className = dirCls(p.change && p.change.h24); }
  set('tkMint', tradeState.mint);
  set('tkDex', (p.dexId || 'dex').toUpperCase());
  const ex = T$('tkExplorer');
  if (ex) ex.href = window.LANTERN.data.explorerToken(tradeState.mint, 'mainnet');
  const hint = T$('lookupHint');
  if (hint) hint.textContent = `$${tradeState.sym} · ${p.dexId ? p.dexId.toUpperCase() : 'DEX'} · Solana`;
}

function renderTradeStats() {
  const p = tradeState.pair;
  const set = (id, v) => { const el = T$(id); if (el) el.textContent = v; };
  set('tksMcap', fmtMoney(p.mcap));
  set('tksLiq', fmtMoney(p.liq));
  set('tksVol', fmtMoney(p.vol24));
  const tx = (p.buys24 != null || p.sells24 != null)
    ? `${compactNum((p.buys24 || 0) + (p.sells24 || 0))} <small class="t-name">${compactNum(p.buys24 || 0)}↑ ${compactNum(p.sells24 || 0)}↓</small>`
    : '—';
  const txEl = T$('tksTxns');
  if (txEl) txEl.innerHTML = tx;
  set('tksAge', ageLabelT(p.ageH));
  const chgEl = T$('tksChg');
  if (chgEl) {
    const c5 = p.change && p.change.m5, c1 = p.change && p.change.h1, c24 = p.change && p.change.h24;
    chgEl.innerHTML = `<span class="${dirCls(c5)}">${fmtPct(c5)}</span> · <span class="${dirCls(c1)}">${fmtPct(c1)}</span> · <span class="${dirCls(c24)}">${fmtPct(c24)}</span>`;
  }
}

/* ---------------- chart (real OHLCV) ---------------- */
function priceAxisDecimals(candles) {
  const lo = Math.min.apply(null, candles.map(c => c.l).filter(v => v > 0));
  if (!isFinite(lo) || lo <= 0) return 8;
  return Math.min(12, Math.max(2, Math.ceil(-Math.log10(lo)) + 2));
}
function paintTradeChart() {
  const el = T$('tkChart');
  if (!el) return;
  const candles = tradeState.candles;
  const foot = T$('tkChartFoot');
  if (!candles.length) {
    el.innerHTML = '<div class="chart-empty">No candles for this pool yet.</div>';
    if (foot) foot.textContent = 'No OHLCV data available';
    return;
  }
  const W = Math.max(560, Math.round(el.clientWidth || 800));
  const H = window.innerWidth <= 768 ? 260 : 340;
  const PAD = { t: 16, r: 78, b: 26, l: 10 };
  const iw = W - PAD.l - PAD.r;
  const totalH = H - PAD.t - PAD.b;
  const volH = Math.round(totalH * 0.17);
  const gap = 16;
  const priceH = totalH - volH - gap;
  const priceBottom = PAD.t + priceH;
  const volTop = priceBottom + gap;
  const volBottom = H - PAD.b;
  const dec = priceAxisDecimals(candles);

  const lo = Math.min.apply(null, candles.map(c => c.l));
  const hi = Math.max.apply(null, candles.map(c => c.h));
  const padP = (hi - lo) * 0.12 || hi * 0.05;
  const min = lo - padP, max = hi + padP;
  const y = v => PAD.t + (1 - (v - min) / (max - min)) * priceH;
  const slot = iw / candles.length;
  const bw = Math.max(3, slot * 0.6);
  const cx = i => PAD.l + slot * (i + 0.5);

  const closes = candles.map(c => c.c);
  const smaPts = period => {
    const out = [];
    for (let i = period - 1; i < closes.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      out.push({ x: cx(i), y: y(sum / period) });
    }
    return out;
  };
  const ma1Pts = smaPts(7);
  const ma2Pts = smaPts(25);
  const ma1Path = ma1Pts.length > 2 ? buildSmoothPath(ma1Pts) : '';
  const ma2Path = ma2Pts.length > 2 ? buildSmoothPath(ma2Pts) : '';

  let gridHtml = '';
  for (let t = 0; t <= 5; t++) {
    const v = min + (max - min) * (t / 5);
    const yy = y(v);
    gridHtml += `<line class="candle-grid" x1="${PAD.l}" y1="${yy.toFixed(1)}" x2="${W - PAD.r}" y2="${yy.toFixed(1)}"/>
      <text class="candle-axis" x="${W - PAD.r + 8}" y="${(yy + 3.5).toFixed(1)}">${v.toFixed(dec)}</text>`;
  }

  let timeHtml = '';
  for (let t = 0; t < 6; t++) {
    const i = Math.round(t * (candles.length - 1) / 5);
    const d = new Date(candles[i].t);
    const label = tradeState.tf === '1d'
      ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
      : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    timeHtml += `<line class="candle-grid" x1="${cx(i).toFixed(1)}" y1="${PAD.t}" x2="${cx(i).toFixed(1)}" y2="${volBottom}"/>
      <text class="candle-axis" x="${cx(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${label}</text>`;
  }

  const maxV = Math.max.apply(null, candles.map(c => c.v).concat([1e-9]));
  const candleHtml = candles.map((c, i) => {
    const up = c.c >= c.o;
    const x = cx(i);
    const yTop = y(Math.max(c.o, c.c));
    const yBot = y(Math.min(c.o, c.c));
    const bodyH = Math.max(1.5, yBot - yTop);
    const vh = Math.max(2, (c.v / maxV) * (volH - 6));
    return `<g class="candle-anim" style="animation-delay:${Math.min(i, 60) * 8}ms">
      <line class="${up ? 'candle-wick-up' : 'candle-wick-down'}" x1="${x.toFixed(1)}" y1="${y(c.h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y(c.l).toFixed(1)}" stroke-width="1.3"/>
      <rect class="${up ? 'candle-up' : 'candle-down'}" x="${(x - bw / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${bodyH.toFixed(1)}" rx="0.5"/>
      <rect class="${up ? 'vol-bar-up' : 'vol-bar-down'}" x="${(x - bw / 2).toFixed(1)}" y="${(volBottom - vh).toFixed(1)}" width="${bw.toFixed(1)}" height="${vh.toFixed(1)}" rx="0.5"/>
    </g>`;
  }).join('');

  const last = candles[candles.length - 1];
  const lastColor = last.c >= last.o ? '#00e5ff' : '#ff3b5c';
  const lastY = y(last.c);
  const priceLine = `<line x1="${PAD.l}" y1="${lastY.toFixed(1)}" x2="${W - PAD.r}" y2="${lastY.toFixed(1)}" stroke="${lastColor}" stroke-width="1" stroke-dasharray="5 4" opacity=".75"/>
    <rect x="${W - PAD.r + 3}" y="${(lastY - 8.5).toFixed(1)}" width="${PAD.r - 6}" height="17" rx="3" fill="${lastColor}"/>
    <text class="candle-price-tag" x="${W - PAD.r + 8}" y="${(lastY + 3.5).toFixed(1)}">${last.c.toFixed(dec)}</text>`;

  el.innerHTML = `
    <div class="candle-chart">
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:100%;height:${H}px;display:block;" role="img" aria-label="$${escHtml(tradeState.sym)} real candlestick chart">
        ${gridHtml}
        ${timeHtml}
        ${candleHtml}
        <path class="candle-ma2" d="${ma2Path}" pathLength="1"/>
        <path class="candle-ma1" d="${ma1Path}" pathLength="1"/>
        ${priceLine}
      </svg>
    </div>
    <div class="candle-legend">
      <span><i style="background:#ff8a5c"></i>MA 7</span>
      <span><i style="background:#8b93a7"></i>MA 25</span>
      <span><i style="background:#00e5ff"></i>Vol · up</span>
      <span><i style="background:#ff3b5c"></i>down</span>
      <span style="margin-left:auto;">${tradeState.tf} · ${candles.length} candles · GeckoTerminal</span>
    </div>`;
  if (foot) foot.textContent = `Real OHLCV via GeckoTerminal · ${tradeState.tf} · ${candles.length} candles`;
}

/* ---------------- safety + holders ---------------- */
function renderSafety(s) {
  const score = T$('safetyScore'), verdict = T$('safetyVerdict'), list = T$('safetyList');
  if (!s) {
    if (score) { score.textContent = '—'; score.className = 'safety-score'; }
    if (verdict) {
      verdict.className = 'safety-verdict';
      verdict.textContent = 'Screen unavailable — RPC rate-limited. Retry shortly, or set a custom RPC in Wallets.';
    }
    if (list) list.innerHTML = '';
    return;
  }
  if (score) { score.textContent = s.score + '/100'; score.className = 'safety-score ' + s.verdict.tone; }
  if (verdict) {
    verdict.className = 'safety-verdict ' + s.verdict.tone;
    verdict.innerHTML = `<b>${escHtml(s.verdict.text)}</b><span>&nbsp;· scored from ${s.checks.length} real on-chain &amp; DEX checks</span>`;
  }
  if (list) {
    list.innerHTML = s.checks.map(c => `
      <li class="${c.ok === true ? 'ok' : c.ok === false ? 'no' : 'unk'}">
        <span class="sl-dot">${c.ok === true ? '✓' : c.ok === false ? '✕' : '?'}</span>
        <span>${escHtml(c.label)}</span>
        <span class="sl-det">${escHtml(String(c.detail))}</span>
      </li>`).join('');
  }
}

function renderHolders(h) {
  const row = T$('holdersRow');
  if (!row) return;
  if (!h || !h.holders || !h.holders.length) {
    row.innerHTML = '<span class="t-name">Holder data rate-limited on public RPC.</span>' +
      '<button class="table-trade-btn" id="holdersRetry" type="button">Retry</button>';
    T$('holdersRetry')?.addEventListener('click', async () => {
      const c = window.LanternChain;
      if (!c || !tradeState.mint) return;
      row.innerHTML = '<span class="t-name"><span class="spin"></span> Loading holders…</span>';
      try {
        const hh = await c.getTopHolders(tradeState.mint);
        renderHolders(hh);
      } catch (e) {
        renderHolders(null);
      }
    });
    return;
  }
  const total = h.holders.reduce((s, x) => s + x.amount, 0) || 1;
  row.innerHTML = h.holders.slice(0, 8).map((x, i) => {
    const size = Math.round(28 + Math.min(20, (x.amount / total) * 80));
    return `<span class="holder-bubble" title="${escHtml(x.address)}">
      <span class="hb-orb" style="width:${size}px;height:${size}px">${i + 1}</span>
      <span class="hb-txt"><b>${fmtTok(x.amount)}</b><span>${shortAddr(x.address)}</span></span>
    </span>`;
  }).join('') + (h.top10Pct != null
    ? `<span class="holder-bubble"><span class="hb-orb" style="width:38px;height:38px;background:linear-gradient(135deg,#f59e0b,#ef4444)">Σ</span><span class="hb-txt"><b>${h.top10Pct.toFixed(1)}%</b><span>held by top 10</span></span></span>`
    : '');
}

/* ---------------- trade panel ---------------- */
function setTradeSide(side) {
  tradeState.side = side === 'sell' ? 'sell' : 'buy';
  document.querySelectorAll('.tp-tab').forEach(x => x.classList.toggle('active', x.dataset.side === tradeState.side));
  const unit = T$('tpUnit');
  if (unit) unit.textContent = tradeState.side === 'buy' ? 'SOL' : tradeState.sym;
  const presets = T$('tpPresets');
  if (presets) presets.hidden = tradeState.side === 'sell';
  const l1 = T$('tpQLbl1'), l2 = T$('tpQLbl2');
  if (l1) l1.textContent = tradeState.side === 'buy' ? 'You pay' : 'You sell';
  if (l2) l2.textContent = tradeState.side === 'buy' ? 'You get ≈' : 'You receive ≈';
  syncTpButton();
  updateTpBalance();
  scheduleTradeQuote(true);
}

function syncTpButton() {
  const btn = T$('tpExecute');
  if (!btn) return;
  const c = window.LanternChain;
  const connected = !!(c && c.getState().address);
  if (tradeState.busy) { btn.textContent = 'Working…'; btn.disabled = true; return; }
  btn.disabled = false;
  if (!connected) { btn.textContent = 'Connect wallet to trade'; return; }
  btn.textContent = tradeState.side === 'buy' ? `Buy $${tradeState.sym}` : `Sell $${tradeState.sym}`;
}

function updateTpBalance() {
  const balEl = T$('tpSolBal');
  const row = T$('tpBalanceRow');
  if (!balEl || !row) return;
  const label = row.querySelector('span');
  if (tradeState.side === 'buy') {
    if (label) label.textContent = 'SOL balance';
    balEl.textContent = chainState.mainnetBalance != null ? chainState.mainnetBalance.toFixed(4) : '—';
  } else {
    if (label) label.textContent = `Your $${tradeState.sym}`;
    balEl.textContent = tradeState.tokenBal ? fmtTok(tradeState.tokenBal) : '0';
  }
}

function tradeAmount() {
  const inp = T$('tpAmount');
  if (!inp) return null;
  const v = parseFloat(String(inp.value).replace(/[^0-9.]/g, ''));
  if (!v || v <= 0) return null;
  if (tradeState.side === 'buy') return { ui: v, raw: BigInt(Math.round(v * 1e9)) };
  if (tradeState.decimals == null) return null;
  return { ui: v, raw: BigInt(Math.round(v * Math.pow(10, tradeState.decimals))) };
}

function scheduleTradeQuote(immediate) {
  clearTimeout(tradeState.quoteTimer);
  tradeState.quoteTimer = setTimeout(updateTradeQuote, immediate ? 0 : 400);
}

async function updateTradeQuote() {
  const c = window.LanternChain;
  const box = T$('tpQuote');
  if (!c || !tradeState.mint || !box) return;
  const amt = tradeAmount();
  const fiat = T$('tpFiat');
  const px = tradeState.pair ? tradeState.pair.price : null;
  if (fiat) {
    const v = parseFloat(String(T$('tpAmount').value).replace(/[^0-9.]/g, '')) || 0;
    const usd = tradeState.side === 'buy'
      ? v * (tradeState.solUsd || 0)
      : v * (px || 0);
    fiat.textContent = '≈ ' + fmtMoney(usd);
  }
  if (!amt) { box.hidden = true; return; }
  const inputMint = tradeState.side === 'buy' ? SOL_MINT : tradeState.mint;
  const outputMint = tradeState.side === 'buy' ? tradeState.mint : SOL_MINT;
  const slippage = Number(T$('tpSlippage') && T$('tpSlippage').value) || 50;
  try {
    const q = await c.quote({ inputMint: inputMint, outputMint: outputMint, amountRaw: String(amt.raw), slippageBps: slippage });
    tradeState.quote = q;
    const dec = tradeState.decimals == null ? 9 : tradeState.decimals;
    const outTok = Number(q.outAmount) / (tradeState.side === 'buy' ? Math.pow(10, dec) : 1e9);
    const minTok = Number(q.otherAmountThreshold || 0) / (tradeState.side === 'buy' ? Math.pow(10, dec) : 1e9);
    // price impact computed against the DEX market price (currency-agnostic)
    let impact = null;
    if (px && tradeState.solUsd) {
      if (tradeState.side === 'buy') {
        const eff = (amt.ui * tradeState.solUsd) / (outTok || 1);
        impact = ((eff - px) / px) * 100;
      } else {
        const eff = (outTok * tradeState.solUsd) / (amt.ui || 1);
        impact = ((px - eff) / px) * 100;
      }
    }
    const set = (id, v) => { const el = T$(id); if (el) el.textContent = v; };
    set('tpPay', tradeState.side === 'buy' ? fmtTok(amt.ui) + ' SOL' : fmtTok(amt.ui) + ' ' + tradeState.sym);
    set('tpGet', tradeState.side === 'buy' ? '≈ ' + fmtTok(outTok) + ' ' + tradeState.sym : '≈ ' + outTok.toFixed(6) + ' SOL');
    const imp = T$('tpImpact');
    if (imp) {
      imp.textContent = impact != null ? fmtPct(impact) : '—';
      imp.className = (impact != null && Math.abs(impact) >= 3) ? 'down' : '';
    }
    set('tpMin', tradeState.side === 'buy' ? fmtTok(minTok) + ' ' + tradeState.sym : minTok.toFixed(6) + ' SOL');
    box.hidden = false;
  } catch (e) {
    box.hidden = true;
    const hint = T$('tpHint');
    if (hint) hint.textContent = '⚠ ' + (e && e.message ? e.message : 'No route for this pair.');
  }
}

function markTpProgress(order, stage) {
  const rows = document.querySelectorAll('#tpProgress .wp-row');
  if (stage === 'done') { rows.forEach(r => { r.classList.remove('active', 'err'); r.classList.add('done'); }); return; }
  const i = order.indexOf(stage);
  if (i < 0) return;
  rows.forEach((r, j) => {
    r.classList.toggle('done', j < i);
    r.classList.toggle('active', j === i);
    r.classList.remove('err');
  });
}

async function executeTrade() {
  const c = window.LanternChain;
  if (!c) { showToast('Chain module still loading — try again.'); return; }
  if (!tradeState.mint || tradeState.busy) return;
  const amt = tradeAmount();
  const hint = T$('tpHint');
  if (!amt) { if (hint) hint.textContent = 'Enter an amount first.'; return; }
  if (tradeState.side === 'sell' && tradeState.decimals == null) {
    if (hint) hint.textContent = 'Token decimals unknown (RPC unavailable) — sell is disabled until the RPC responds.';
    return;
  }
  if (tradeState.side === 'buy' && chainState.mainnetBalance != null && amt.ui > chainState.mainnetBalance - 0.001) {
    if (hint) hint.textContent = 'Not enough SOL — keep a small buffer for network fees.';
    return;
  }

  tradeState.busy = true;
  syncTpButton();
  const prog = T$('tpProgress');
  if (prog) prog.hidden = false;
  if (hint) hint.textContent = '';
  const order = ['quoting', 'building', 'signing', 'sending', 'confirming'];
  markTpProgress(order, 'quoting');

  try {
    if (!c.getState().address) await c.connect();
    const inputMint = tradeState.side === 'buy' ? SOL_MINT : tradeState.mint;
    const outputMint = tradeState.side === 'buy' ? tradeState.mint : SOL_MINT;
    const slippage = Number(T$('tpSlippage') && T$('tpSlippage').value) || 50;
    const res = await c.swap({
      inputMint: inputMint,
      outputMint: outputMint,
      amountRaw: String(amt.raw),
      slippageBps: slippage,
      side: tradeState.side,
      onProgress: p => markTpProgress(order, p.stage)
    });
    markTpProgress(order, 'done');

    const dec = tradeState.decimals == null ? 9 : tradeState.decimals;
    const outUi = tradeState.side === 'buy'
      ? Number(res.outAmount) / Math.pow(10, dec)
      : Number(res.outAmount) / 1e9;

    // cost basis + history (USD)
    const cb = readCost();
    const rec = cb[tradeState.mint] || { spentUsd: 0, tokens: 0 };
    if (tradeState.side === 'buy') {
      rec.spentUsd += amt.ui * (tradeState.solUsd || 0);
      rec.tokens += outUi;
    } else {
      const frac = rec.tokens > 0 ? Math.min(1, amt.ui / rec.tokens) : 0;
      rec.spentUsd = rec.spentUsd * (1 - frac);
      rec.tokens = Math.max(0, rec.tokens - Math.min(rec.tokens, amt.ui));
    }
    cb[tradeState.mint] = rec;
    writeCost(cb);

    const trades = readTrades();
    const solUsd = tradeState.solUsd || 0;
    // capture price + USD value so the history table can show real numbers
    const tokenAmount = tradeState.side === 'buy' ? outUi : amt.ui;
    const usdValue = tradeState.side === 'buy'
      ? amt.ui * solUsd
      : outUi * solUsd;
    trades.push({
      mint: tradeState.mint, sym: tradeState.sym, side: tradeState.side,
      outUi: outUi, outUnit: tradeState.side === 'buy' ? tradeState.sym : 'SOL',
      tokenAmount: tokenAmount,
      usdValue: usdValue > 0 ? usdValue : null,
      priceUsd: (tokenAmount > 0 && usdValue > 0) ? usdValue / tokenAmount : null,
      sig: res.signature, ts: Date.now(), explorer: res.explorer
    });
    writeTrades(trades);

    showToast(`✓ ${tradeState.side === 'buy' ? 'Bought' : 'Sold'} ${fmtTok(outUi)} ${tradeState.side === 'buy' ? tradeState.sym : 'SOL'} — ${shortAddr(res.signature)}`);
    if (hint) hint.innerHTML = `<a href="${escHtml(res.explorer)}" target="_blank" rel="noopener" style="color:var(--cyan)">View tx on Solscan ↗</a>`;

    c.refreshBalance();
    scheduleTradeQuote(true);
    renderTpPosition();
    renderTpHistory();
    updateTpBalance();
  } catch (e) {
    const rows = document.querySelectorAll('#tpProgress .wp-row');
    rows.forEach(r => { if (r.classList.contains('active')) { r.classList.remove('active'); r.classList.add('err'); } });
    if (hint) hint.textContent = '⚠ ' + (e && e.message ? e.message : 'Swap failed.');
    if (e && e.code === 'NO_WALLET') {
      const url = c.installUrl || 'https://phantom.app/download';
      if (hint) hint.innerHTML = `No wallet found. <a href="${url}" target="_blank" rel="noopener">Install Phantom ↗</a>`;
    }
    showToast('⚠ ' + (e && e.message ? e.message : 'Swap failed.'));
  } finally {
    tradeState.busy = false;
    syncTpButton();
    setTimeout(() => { const p = T$('tpProgress'); if (p) p.hidden = true; }, 2600);
  }
}

async function renderTpPosition() {
  const c = window.LanternChain;
  const set = (id, v) => { const el = T$(id); if (el) el.textContent = v; };
  const sellBtn = T$('posSellBtn');
  if (!c || !tradeState.mint || !chainState.address) {
    ['posAmount', 'posUsd', 'posCost', 'posPnl', 'posValue'].forEach(id => set(id, '—'));
    if (sellBtn) sellBtn.hidden = true;
    tradeState.tokenBal = 0;
    updateTpBalance();
    return;
  }
  let bal = 0;
  try { bal = await c.getTokenBalance(tradeState.mint); } catch (e) {}
  tradeState.tokenBal = bal;
  const px = tradeState.pair ? tradeState.pair.price : null;
  const usd = (px != null) ? bal * px : null;
  const cb = readCost()[tradeState.mint] || { spentUsd: 0, tokens: 0 };
  const ratio = cb.tokens > 0 ? Math.min(1, bal / cb.tokens) : 0;
  const basis = cb.spentUsd * ratio;
  const pnl = (usd != null && cb.tokens > 0) ? usd - basis : null;

  set('posAmount', bal ? fmtTok(bal) : '0');
  set('posValue', usd != null ? fmtMoney(usd) : '—');
  set('posUsd', usd != null ? fmtMoney(usd) : '—');
  set('posCost', cb.tokens > 0 ? fmtMoney(cb.spentUsd / cb.tokens) + ' / token' : '—');
  const pnlEl = T$('posPnl');
  if (pnlEl) {
    if (pnl == null) { pnlEl.textContent = '—'; pnlEl.className = ''; }
    else {
      pnlEl.textContent = (pnl >= 0 ? '+' : '-') + fmtMoney(Math.abs(pnl));
      pnlEl.className = pnl >= 0 ? 'up' : 'down';
    }
  }
  if (sellBtn) sellBtn.hidden = !(bal > 0);
  updateTpBalance();
}

function renderTpHistory() {
  const box = T$('tpHistory');
  if (!box) return;
  const list = readTrades().filter(t => t.mint === tradeState.mint).slice(-6).reverse();
  if (!list.length) {
    box.innerHTML = '<span class="t-name">Your swaps on this token land here.</span>';
    return;
  }
  box.innerHTML = list.map(t => `
    <div class="tp-h-row">
      <span class="th-side ${t.side}">${t.side.toUpperCase()}</span>
      <span class="th-amt">${t.side === 'buy' ? '+' + fmtTok(t.outUi) + ' ' + escHtml(t.sym) : '+' + t.outUi.toFixed(4) + ' SOL'}</span>
      <a href="${escHtml(t.explorer || '#')}" target="_blank" rel="noopener">${shortAddr(t.sig)}</a>
    </div>`).join('');
}

/* ---------------- trade view init (idempotent) ---------------- */
function initTradeView() {
  if (!tradeState.wired) {
    tradeState.wired = true;

    T$('lookupBtn')?.addEventListener('click', () => openTradeToken(T$('lookupInput') && T$('lookupInput').value));
    T$('lookupInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') openTradeToken(e.target.value); });
    T$('trendRefresh')?.addEventListener('click', loadTrending);
    T$('tkCopy')?.addEventListener('click', async () => {
      if (!tradeState.mint) return;
      try { await navigator.clipboard.writeText(tradeState.mint); showToast('✓ Mint address copied.'); }
      catch (e) { showToast(tradeState.mint); }
    });

    T$('tkTfRow')?.querySelectorAll('.tf-btn').forEach(b => b.addEventListener('click', async () => {
      if (!tradeState.pair) return;
      T$('tkTfRow').querySelectorAll('.tf-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      tradeState.tf = b.dataset.tf;
      const t = TRADE_TFS[tradeState.tf];
      const chart = T$('tkChart');
      if (chart) chart.innerHTML = '<div class="chart-empty"><span class="spin"></span></div>';
      const candles = await window.LANTERN.data.ohlcv(tradeState.pair.pairAddress, t.tf, t.limit, t.agg).catch(() => []);
      tradeState.candles = candles;
      paintTradeChart();
    }));

    document.querySelectorAll('.tp-tab').forEach(b => b.addEventListener('click', () => setTradeSide(b.dataset.side)));
    T$('tpAmount')?.addEventListener('input', () => scheduleTradeQuote());
    T$('tpSlippage')?.addEventListener('change', () => scheduleTradeQuote(true));
    T$('tpExecute')?.addEventListener('click', executeTrade);
    T$('posSellBtn')?.addEventListener('click', () => {
      if (!tradeState.tokenBal) return;
      setTradeSide('sell');
      T$('tpAmount').value = String(tradeState.tokenBal);
      scheduleTradeQuote(true);
      executeTrade();
    });
    T$('tpPresets')?.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      T$('tpPresets').querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      T$('tpAmount').value = b.dataset.sol;
      scheduleTradeQuote(true);
    }));

    // Wallets view wiring
    T$('wlConnectBtn')?.addEventListener('click', walletConnectToggle);
    T$('wlCopy')?.addEventListener('click', async () => {
      if (!chainState.address) { showToast('Connect a wallet first.'); return; }
      try { await navigator.clipboard.writeText(chainState.address); showToast('✓ Deposit address copied.'); }
      catch (e) { showToast(chainState.address); }
    });
    T$('wlRefresh')?.addEventListener('click', async () => {
      await window.LanternChain?.refreshBalance();
      renderWalletsView();
      showToast('✓ Balance refreshed.');
    });
    T$('wlNetSelect')?.addEventListener('change', e => {
      window.LanternChain?.setNetwork(e.target.value);
      renderWalletsView();
      showToast('Network set to ' + (e.target.value === 'mainnet' ? 'Mainnet' : 'Devnet') + '.');
    });
    T$('wlRpcSave')?.addEventListener('click', async () => {
      const c = window.LanternChain;
      if (!c) { showToast('Chain module still loading.'); return; }
      const url = T$('wlRpcInput').value.trim();
      if (url && !/^https?:\/\/.+/i.test(url)) { setRpcNote('RPC URL must start with https://'); return; }
      c.setRpc(url, chainState.network);
      setRpcNote('Saved — testing latency…');
      try {
        const ms = await c.pingRpc();
        setRpcNote(`✓ RPC live — ${ms} ms round trip.`);
        showToast('✓ RPC updated (' + ms + ' ms).');
      } catch (e) {
        setRpcNote('⚠ Saved, but unreachable — check the URL and try again.');
      }
      renderWalletsView();
    });
    T$('wlRpcReset')?.addEventListener('click', () => {
      const c = window.LanternChain;
      if (!c) return;
      c.setRpc('', chainState.network);
      setRpcNote('Using the public Solana RPC again.');
      c.pingRpc().then(ms => setRpcNote(`Public RPC — ${ms} ms round trip.`)).catch(() => {});
      renderWalletsView();
      showToast('✓ Back on public RPC.');
    });

    loadTrending();
    try {
      const last = localStorage.getItem('lantern:lastTrade');
      if (last && T$('lookupInput')) T$('lookupInput').value = last;
    } catch (e) {}
    window.LANTERN.data.prices([SOL_MINT]).then(p => {
      if (p && p[SOL_MINT]) tradeState.solUsd = p[SOL_MINT].usd;
    }).catch(() => {});
  } else if (!tradeState.mint) {
    loadTrending();
  }
}

async function walletConnectToggle() {
  const c = window.LanternChain;
  if (!c) { showToast('Chain module still loading — try again.'); return; }
  if (chainState.address) {
    await c.disconnect();
    showToast('Wallet disconnected.');
    renderWalletsView();
    return;
  }
  if (!chainState.hasWallet) { window.open(c.installUrl, '_blank', 'noopener'); return; }
  try {
    const addr = await c.connect();
    showToast('✓ Wallet connected: ' + shortAddr(addr));
  } catch (err) {
    showToast('⚠ ' + (err && err.message ? err.message : 'Connection failed.'));
    if (err && err.code === 'NO_WALLET') window.open(c.installUrl, '_blank', 'noopener');
  }
  renderWalletsView();
}

/* ---------------- Wallets view ---------------- */
function renderWalletsView() {
  const c = window.LanternChain;
  const connected = !!chainState.address;
  const set = (id, v) => { const el = T$(id); if (el) el.textContent = v; };

  set('wlAddr', connected ? chainState.address : 'Connect a wallet to see your address');
  const badge = T$('wlNetBadge');
  if (badge) badge.textContent = (chainState.network || 'devnet').toUpperCase();
  const btn = T$('wlConnectBtn');
  if (btn) btn.textContent = connected ? 'Disconnect' : (chainState.hasWallet ? 'Connect wallet' : 'Install Phantom');
  set('wlBal', chainState.balance != null ? chainState.balance.toFixed(4) : '—');
  set('wlStatus', connected
    ? 'Connected · ' + (chainState.walletName || 'wallet')
    : (chainState.hasWallet ? 'Detected — not connected' : 'No wallet detected'));
  set('wlNetwork', chainState.network === 'mainnet' ? 'Solana Mainnet' : 'Solana Devnet');
  set('wlUsd', (chainState.balance != null && tradeState.solUsd) ? fmtMoney(chainState.balance * tradeState.solUsd) : '—');

  const exp = T$('wlExplorer');
  if (exp) {
    if (connected) {
      exp.href = 'https://solscan.io/account/' + chainState.address + (chainState.network === 'mainnet' ? '' : '?cluster=devnet');
      exp.style.opacity = '';
    } else {
      exp.href = '#';
      exp.style.opacity = '.5';
    }
  }

  const rpcIn = T$('wlRpcInput');
  if (rpcIn && document.activeElement !== rpcIn && c && typeof c.getRpcUrl === 'function') {
    const url = c.getRpcUrl();
    const isPublic = /api\.(devnet|mainnet-beta)\.solana\.com/.test(url || '');
    rpcIn.value = (url && !isPublic) ? url : '';
  }
  const netSel = T$('wlNetSelect');
  if (netSel && netSel.value !== (chainState.network || 'devnet')) netSel.value = chainState.network || 'devnet';
  paintRpcPills();
  loadHoldings();
}

async function loadHoldings() {
  const body = T$('wlHoldBody');
  const count = T$('wlHoldCount');
  const c = window.LanternChain;
  if (!body) return;
  if (!c || !chainState.address) {
    body.innerHTML = '<tr><td colspan="4" class="t-name" style="text-align:center;padding:24px;">Connect a wallet to load your real on-chain balances.</td></tr>';
    if (count) count.textContent = '—';
    return;
  }
  body.innerHTML = '<tr><td colspan="4" class="t-name" style="text-align:center;padding:24px;"><span class="spin"></span> Reading token accounts…</td></tr>';
  try {
    const positions = await c.getPositions();
    if (count) count.textContent = positions.length + ' token account' + (positions.length === 1 ? '' : 's');
    if (!positions.length) {
      body.innerHTML = '<tr><td colspan="4" class="t-name" style="text-align:center;padding:24px;">No SPL tokens in this wallet yet.</td></tr>';
      return;
    }
    const mints = positions.map(p => p.mint);
    const [prices, infos] = await Promise.all([
      window.LANTERN.data.prices(mints),
      window.LANTERN.data.infoBatch(mints)
    ]);
    body.innerHTML = positions.map(p => {
      const info = infos[p.mint] || {};
      const sym = info.symbol || shortAddr(p.mint);
      const price = (prices[p.mint] && prices[p.mint].usd != null) ? prices[p.mint].usd : (info.price || null);
      const val = price != null ? p.amount * price : null;
      const letter = escHtml(String(sym)[0] || '?').toUpperCase();
      const pic = info.image
        ? `<img src="${escHtml(info.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : letter;
      return `<tr>
        <td><div class="token-cell"><div class="token-pic">${pic}</div><div class="token-info"><span class="t-sym">${escHtml(sym)}</span><span class="t-name">${shortAddr(p.mint)}</span></div></div></td>
        <td><span class="price-cell">${fmtTok(p.amount)}</span></td>
        <td><span class="price-cell">${val != null ? fmtMoney(val) : '—'}</span></td>
        <td><button class="table-trade-btn" data-opentrade="${escHtml(p.mint)}">Trade</button></td>
      </tr>`;
    }).join('');
    body.querySelectorAll('[data-opentrade]').forEach(b => b.addEventListener('click', () => {
      showView('Token lookup');
      openTradeToken(b.dataset.opentrade);
    }));
  } catch (e) {
    body.innerHTML = '<tr><td colspan="4" class="t-name" style="text-align:center;padding:24px;">Could not read balances — RPC rate-limited. Set a custom RPC above and retry.</td></tr>';
  }
}

/* ---------------- First buy (wizard step 4) ---------------- */
const fbState = { mint: null, record: null, info: null, decimals: null, quoteTimer: null, busy: false };

function initFirstBuy() {
  const rec = wizard.lastLaunch ? wizard.lastLaunch.record : null;
  if (!rec) return;
  fbState.mint = rec.mint;
  fbState.record = rec;
  fbState.info = null;
  fbState.decimals = null;

  const set = (id, v) => { const el = T$(id); if (el) el.textContent = v; };
  set('fbSym', '$' + rec.symbol);
  set('fbMint', rec.mint);
  set('fbNet', (rec.network || 'devnet').toUpperCase());
  const logo = T$('fbLogo');
  if (logo) {
    if (rec.image) {
      logo.innerHTML = `<img src="${escHtml(rec.image)}" alt="">`;
      const img = logo.querySelector('img');
      if (img) img.addEventListener('error', () => { logo.textContent = rec.symbol[0]; });
    } else if (rec.avatar && rec.avatar.e) {
      logo.innerHTML = `<span style="font-size:22px">${escHtml(rec.avatar.e)}</span>`;
    } else {
      logo.textContent = String(rec.symbol)[0] || '?';
    }
  }
  set('fbWallet', chainState.address ? shortAddr(chainState.address) : '—');
  set('fbBal', chainState.mainnetBalance != null ? chainState.mainnetBalance.toFixed(4) : '—');
  set('fbHint', '');
  T$('fbBuyBox').hidden = true;
  T$('fbNoPool').hidden = true;
  T$('fbStats').hidden = true;
  T$('fbQuote').hidden = true;

  const c = window.LanternChain;
  window.LANTERN.data.tokenInfo(rec.mint).then(async info => {
    if (fbState.mint !== rec.mint) return;
    if (!info) { T$('fbNoPool').hidden = false; return; }
    fbState.info = info;
    if (c && c.getMintInfo) {
      const mi = await c.getMintInfo(rec.mint).catch(() => null);
      if (mi && mi.decimals != null) fbState.decimals = mi.decimals;
    }
    T$('fbStats').hidden = false;
    T$('fbBuyBox').hidden = false;
    const set2 = (id, v) => { const el = T$(id); if (el) el.textContent = v; };
    set2('fbPrice', fmtPrice(info.price));
    set2('fbLiq', fmtMoney(info.liq));
    set2('fbMcap', fmtMoney(info.mcap));
    set2('fbVol', fmtMoney(info.vol24));
    scheduleFbQuote(true);
  }).catch(() => {
    if (fbState.mint === rec.mint) T$('fbNoPool').hidden = false;
  });
}

function scheduleFbQuote(immediate) {
  clearTimeout(fbState.quoteTimer);
  fbState.quoteTimer = setTimeout(updateFbQuote, immediate ? 0 : 400);
}

async function updateFbQuote() {
  const c = window.LanternChain;
  const box = T$('fbQuote');
  const set = (id, val) => { const el = T$(id); if (el) el.textContent = val; };
  if (!c || !fbState.info || !box) return;
  const v = parseFloat(String(T$('fbAmount').value).replace(/[^0-9.]/g, ''));
  if (!v || v <= 0) { box.hidden = true; return; }
  const slippage = Number(T$('fbSlippage') && T$('fbSlippage').value) || 50;
  try {
    const q = await c.quote({ inputMint: SOL_MINT, outputMint: fbState.mint, amountRaw: String(Math.round(v * 1e9)), slippageBps: slippage });
    fbState.quote = q;
    const dec = fbState.decimals == null ? 9 : fbState.decimals;
    const out = Number(q.outAmount) / Math.pow(10, dec);
    const min = Number(q.otherAmountThreshold || 0) / Math.pow(10, dec);
    const px = fbState.info.price;
    let impact = null;
    if (px && tradeState.solUsd) {
      const eff = (v * tradeState.solUsd) / (out || 1);
      impact = ((eff - px) / px) * 100;
    }
    set('fbPay', v + ' SOL');
    set('fbGet', '≈ ' + fmtTok(out) + ' ' + (fbState.record ? fbState.record.symbol : ''));
    set('fbImpact', impact != null ? fmtPct(impact) : '—');
    set('fbMin', fmtTok(min) + ' ' + (fbState.record ? fbState.record.symbol : ''));
    box.hidden = false;
  } catch (e) {
    box.hidden = true;
    set('fbHint', '⚠ ' + (e && e.message ? e.message : 'No route yet for this token.'));
  }
}

async function executeFirstBuy() {
  const c = window.LanternChain;
  if (!c || !fbState.info || fbState.busy) return;
  const hint = T$('fbHint');
  const v = parseFloat(String(T$('fbAmount').value).replace(/[^0-9.]/g, ''));
  if (!v || v <= 0) { if (hint) hint.textContent = 'Enter a SOL amount first.'; return; }
  if (chainState.mainnetBalance != null && v > chainState.mainnetBalance - 0.001) {
    if (hint) hint.textContent = 'Not enough SOL — keep a buffer for network fees.';
    return;
  }
  fbState.busy = true;
  const btn = T$('fbBuyBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Buying…'; }
  if (hint) hint.textContent = '';
  try {
    if (!c.getState().address) await c.connect();
    const slippage = Number(T$('fbSlippage') && T$('fbSlippage').value) || 50;
    const res = await c.swap({
      inputMint: SOL_MINT,
      outputMint: fbState.mint,
      amountRaw: String(Math.round(v * 1e9)),
      slippageBps: slippage,
      side: 'buy',
      onProgress: p => { if (hint && p.stage !== 'done') hint.textContent = '… ' + p.stage; }
    });
    const dec = fbState.decimals == null ? 9 : fbState.decimals;
    const outUi = Number(res.outAmount) / Math.pow(10, dec);

    const cb = readCost();
    const rec = cb[fbState.mint] || { spentUsd: 0, tokens: 0 };
    rec.spentUsd += v * (tradeState.solUsd || 0);
    rec.tokens += outUi;
    cb[fbState.mint] = rec;
    writeCost(cb);

    const trades = readTrades();
    trades.push({
      mint: fbState.mint, sym: fbState.record.symbol, side: 'buy',
      outUi: outUi, outUnit: fbState.record.symbol,
      sig: res.signature, ts: Date.now(), explorer: res.explorer
    });
    writeTrades(trades);

    if (hint) hint.innerHTML = `✓ First buy confirmed — <a href="${escHtml(res.explorer)}" target="_blank" rel="noopener" style="color:var(--cyan)">view on Solscan ↗</a>`;
    showToast('✓ First buy landed: ' + fmtTok(outUi) + ' $' + fbState.record.symbol);
    c.refreshBalance();
  } catch (e) {
    if (hint) hint.textContent = '⚠ ' + (e && e.message ? e.message : 'Swap failed.');
    showToast('⚠ ' + (e && e.message ? e.message : 'Swap failed.'));
  } finally {
    fbState.busy = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Buy now'; }
  }
}

/* ---------------- first-buy wiring (runs at load) ---------------- */
T$('fbAmount')?.addEventListener('input', () => scheduleFbQuote());
T$('fbSlippage')?.addEventListener('change', () => scheduleFbQuote(true));
T$('fbPresets')?.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  T$('fbPresets').querySelectorAll('button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  T$('fbAmount').value = b.dataset.sol;
  scheduleFbQuote(true);
}));
T$('fbMax')?.addEventListener('click', () => {
  const bal = chainState.mainnetBalance;
  if (bal == null) { showToast('Connect a wallet to use max.'); return; }
  T$('fbAmount').value = Math.max(0, bal - 0.01).toFixed(4);
  scheduleFbQuote(true);
});
T$('fbBuyBtn')?.addEventListener('click', executeFirstBuy);
T$('fbSkip')?.addEventListener('click', closeLaunchWizard);

/* ---------------- wallet/RPC events → live view refresh ---------------- */
document.addEventListener('lantern:wallet', e => {
  const s = (e && e.detail) || {};
  paintRpcPills();

  // first-buy wallet rows
  if (fbState.mint && T$('fbBal')) {
    const fbw = T$('fbWallet');
    if (fbw) fbw.textContent = s.address ? shortAddr(s.address) : '—';
    if (T$('fbBal')) T$('fbBal').textContent = s.mainnetBalance != null ? s.mainnetBalance.toFixed(4) : '—';
  }

  const tradeVisible = VIEWS['Token lookup'] && !VIEWS['Token lookup'].hidden;
  if (tradeVisible && tradeState.mint) {
    syncTpButton();
    updateTpBalance();
    renderTpPosition();
  }
  const wlVisible = VIEWS['Wallets'] && !VIEWS['Wallets'].hidden;
  if (wlVisible) renderWalletsView();
});

// SOL/USD reference price for fiat readouts
window.LANTERN.data.prices([SOL_MINT]).then(p => {
  if (p && p[SOL_MINT]) tradeState.solUsd = p[SOL_MINT].usd;
}).catch(() => {});
