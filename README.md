# Market Setup Grader v8.4 — Broker-Ready Admin Source of Truth

v8.4 removes the one-click preset button. The private `/admin` settings are now the source of truth for the scheduled cloud bot.

The system can run in three practical modes:

- `Supabase Simulation` — no broker orders; Supabase tracks simulated trades.
- `Alpaca Paper` — the same saved admin rules can submit Alpaca paper bracket orders.
- `Alpaca Live` — the same saved admin rules can submit Alpaca live bracket orders only when separate live credentials and explicit environment unlock gates are configured.

The public viewer remains read-only. The admin page controls the cloud bot.

## v8.4 behavior

- No preset button that overwrites your settings.
- Save settings once in `/admin`; cron uses them every cycle.
- Paper and live broker modes use the same risk %, score range, R/R, universe, scan limit, and max-open settings saved in admin.
- Alpaca Live is wired but blocked unless live-specific environment variables are configured.
- Real-money mode is not automatically enabled by deploying this build.

## Required for paper mode

```env
APCA_API_KEY_ID=your_paper_or_data_key
APCA_API_SECRET_KEY=your_paper_or_data_secret
ALPACA_DATA_FEED=iex
APCA_API_BASE_URL=https://paper-api.alpaca.markets
```

Optional paper-specific names are also supported:

```env
ALPACA_PAPER_API_KEY_ID=your_paper_key
ALPACA_PAPER_API_SECRET_KEY=your_paper_secret
ALPACA_PAPER_BASE_URL=https://paper-api.alpaca.markets
```

## Required for live-broker readiness

Only add these when you intentionally want the live broker route available:

```env
ALPACA_LIVE_API_KEY_ID=your_live_key
ALPACA_LIVE_API_SECRET_KEY=your_live_secret
ALPACA_LIVE_BASE_URL=https://api.alpaca.markets
LIVE_TRADING_UNLOCKED=true
LIVE_TRADING_CONFIRMATION=I_UNDERSTAND_REAL_MONEY_RISK
```

If those live unlock values are missing or wrong, `Alpaca Live` mode will refuse to submit broker orders.

## Supabase

Run `supabase/schema.sql` after deploying v8.4. It adds `broker_live_enabled` to `bot_control` if it does not already exist.

## Safe workflow

1. Deploy v8.4.
2. Run the schema.
3. Open `/admin`.
4. Set the saved bot rules.
5. Choose `Supabase Simulation` or `Alpaca Paper`.
6. Arm trade execution.
7. Let Vercel Cron run every 15 minutes.
8. Only consider `Alpaca Live` after paper broker logs are clean.
