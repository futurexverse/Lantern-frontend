# LANTERN — Frontend (Vercel-ready)

This is the **frontend-only** slice of the Lantern project, prepared for one-click hosting on Vercel.
The original `bot/` backend folder and its `node_modules/` were stripped — everything you need for the
landing page, login page, and dashboard UI to render and run is included here.

## What's inside

```
lantern-frontend/
├── index.html          # Landing page (entry point)
├── login.html          # Login / auth page
├── dashboard.html      # Main app dashboard
├── _mobile_test.html   # Optional iframe test harness (safe to delete)
├── style.css           # Shared styles (theme, header, footer, buttons)
├── login.css           # Login page styles
├── dashboard.css       # Dashboard styles
├── app.js              # Landing page logic
├── login.js            # Login page logic
├── dashboard.js        # Dashboard logic
├── marketdata.js       # Market data fetcher (CoinGecko / DexScreener / Jupiter)
├── chain.js            # On-chain module (Solana RPC + wallet)
├── launchchain.js      # Deprecated shim, kept for back-compat
├── assets/             # Logos, mascot, backgrounds, token icons
├── vercel.json         # Static hosting config (clean URLs + caching)
└── README.md
```

Total: 41 files, ~1.5 MB.

## Deploy to Vercel

### Option A — Git (recommended)
1. Push this folder to a GitHub repo (root level — no subfolder).
2. Go to <https://vercel.com/new>, import the repo.
3. Framework Preset: **Other** (Vercel auto-detects static files).
4. Build Command: leave empty.
5. Output Directory: leave empty (root is served).
6. Click **Deploy**.

### Option B — Vercel CLI
```bash
npm i -g vercel
cd lantern-frontend
vercel        # preview deploy
vercel --prod # production deploy
```

No environment variables, no build step, no server. Just static files.

## Runtime notes

The frontend talks directly (from the browser) to public APIs:
- Solana RPC (`api.mainnet-beta.solana.com`, `api.devnet.solana.com`, public RPCs)
- CoinGecko, DexScreener, GeckoTerminal, Jupiter
- Phantom wallet (`phantom.app/download`)

Social links point to `t.me/lantern_bot` and `x.com/lanternbot` — these expect the
actual Telegram bot / X account to exist (the bot source lives in the original `bot/`
folder and is **not** part of this static deployment).

## What was removed from the original repo

- `bot/` — Node.js backend (Discord/Telegram bot, RPC polling, alerts). Not needed for static hosting.
- `bot/node_modules/` — installed dependencies (~40 MB).
- `bot/.env` — secrets. Never deploy this; regenerate locally if you ever run the bot.

If you ever want the bot back, it's a separate Vercel Function / Render / Railway deployment,
not part of this static frontend.
