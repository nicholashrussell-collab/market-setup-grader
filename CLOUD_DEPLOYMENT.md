# v7.0 Cloud / VPS paper-live notes

Localhost only runs while your computer, terminal, and browser/server are awake. For unattended paper-live scanning, deploy the app to a cloud host and run a scheduled worker.

## Safe deployment approach

1. Keep the app as a paper-trading scanner first. Do not connect broker order placement yet.
2. Deploy the Next.js app to a host such as Vercel, Render, Railway, Fly.io, or a small VPS.
3. Store API keys as environment variables, never inside the code:
   - `ALPACA_API_KEY_ID`
   - `ALPACA_API_SECRET_KEY`
   - optional Massive/Polygon-style keys if used
4. Add a small database later for journaled live scans. Good simple options are Supabase, Neon/Postgres, SQLite on a VPS, or a hosted key-value store.
5. Run the live scanner on a schedule, such as every 5 minutes during market hours.
6. Save scan results and paper trades with timestamps, symbol, score, entry, stop, target, setup, stale minutes, and whether it was actionable.

## What v7.0 is meant to prove

- Tracked symbols are the admin source of truth. Use scan limit to control each cron run.
- The live watchlist scanner uses the same visible symbol universe as the backtest.
- The dynamic sleeve stays in Research View because the 100-stock test showed active-only was stronger than sleeve exposure.
- No real orders are placed.

## Suggested first paper-live rule

Run the scanner for at least 2 to 4 weeks before any live-money use. Save actionable candidates to the paper journal and check whether the live/paper results resemble the backtest behavior after spreads, stale candles, and real-time execution delays.
