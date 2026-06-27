# v7.3 Cloud Database Prep

This version keeps the trading/scanner logic the same and adds cloud storage plumbing.

## What v7.3 adds

- Supabase schema for scan runs, scan signals, paper trades, and symbol quality state.
- Server-only Vercel API routes for Supabase health, recent scans, and saving live scan results.
- Dashboard controls to check cloud database status and save the latest live watchlist scan.
- No broker orders. This is still paper/signals only.

## Environment variables

Add these to Vercel Project Settings → Environment Variables:

```text
APCA_API_KEY_ID=...
APCA_API_SECRET_KEY=...
ALPACA_DATA_FEED=iex
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Never use `NEXT_PUBLIC_` for the Alpaca secret key or Supabase service role key.

## Supabase setup

1. Create a Supabase project.
2. Go to SQL Editor.
3. Paste and run `supabase/schema.sql` from this repo.
4. Add the Supabase env vars to Vercel.
5. Redeploy Vercel.
6. Open the dashboard and click `Check cloud DB`.
7. Run a live watchlist scan, then click `Save scan to cloud DB`.

## What this does not do yet

- It does not run scans automatically while your laptop is off.
- It does not place paper or real broker orders.
- It does not replace the future Railway worker.

Next phase: Railway background worker that runs the scanner every 5–15 minutes and writes to these same Supabase tables.
