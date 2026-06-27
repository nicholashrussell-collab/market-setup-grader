# Market Setup Grader v8.3 — Alpaca Paper Broker Bridge

This version keeps the public dashboard read-only and adds a one-click autonomous paper setup flow from the private `/admin` page. It can still run in Supabase-only simulation mode, or it can submit Alpaca paper bracket orders when explicitly enabled. Real broker execution remains locked.

## One-click setup

In `/admin`, use **Start Autonomous Paper Bot**. It runs pre-flight checks, verifies Supabase, verifies Alpaca Paper, saves the Stable Autonomous Paper Preset, arms paper execution, and keeps real broker orders locked.

Stable preset:

- Universe: Super Wide 100
- Timeframe: 15Min
- Scan limit: 100
- Risk per trade: 1%
- Max open trades: 4
- Min score: 80
- Min R/R: 1.0
- Stale simulation: OFF
- Execution mode: Alpaca Paper

## Modes

- **Supabase Simulation**: bot opens simulated paper trades only in Supabase.
- **Alpaca Paper**: bot submits Alpaca paper bracket orders and also saves an audit row in Supabase.
- **Real Locked**: visible safety mode; real trading is not enabled in this build.

## Required setup for Alpaca Paper

In Vercel Environment Variables, keep/add:

```text
APCA_API_KEY_ID=your Alpaca paper key
APCA_API_SECRET_KEY=your Alpaca paper secret
APCA_API_BASE_URL=https://paper-api.alpaca.markets
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
```

Run `supabase/schema.sql` once after deploying v8.3 so the broker columns and control settings exist.

## Safety

This app refuses broker-order submission unless the Alpaca base URL contains `paper-api.alpaca.markets`. Use Alpaca Paper for several weeks before considering any real-money order system.
