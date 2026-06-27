# Market Setup Grader v7.2

v7.1 is an active-only Super Wide 100 scanner with a rolling symbol-quality gate. It keeps the live/paper workflow clean and pushes sleeve diagnostics into Research View.

## Main defaults

- Super Wide 100 universe
- Active-only scanner as the paper-live default
- Rolling active-quality gate using only previously closed trades
- Cash account / 1x buying power
- Long only, shorts blocked
- 25% max position size
- 4 max open trades
- 1% risk/trade
- 4% max total open risk
- Start date: 2020-09-15
- End date: 2026-05-31

## What changed from v7.0

- Removed the sleeve from the main workflow.
- Added a past-data-only rolling quality gate that can pause deteriorating symbols.
- Added a rolling quality gate audit table in Research View.
- Kept Super Wide 100 as the main benchmark before paper-live testing.

## Important

This app does not place broker orders. Use the Live Watchlist Scanner and paper journal before considering any broker integration.

## Run locally

```bash
npm install
npm run dev
```

Then open the localhost URL shown in your terminal.

## Cloud hosting

See `CLOUD_DEPLOYMENT.md` for the cloud/VPS plan. Localhost will not run when your computer sleeps or shuts down.


## v7.2 notes

- Adds a Super Wide 500 stress-test preset.
- Raises symbol processing caps to 600 so the 500-stock universe is not clipped.
- Keeps active-only as the default benchmark; sleeve remains research-only.
- 100-stock mode remains the paper-live benchmark; 500-stock mode is a research/cloud-readiness stress test.
