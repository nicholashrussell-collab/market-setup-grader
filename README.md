# Market Setup Grader v7.5

Paper-live execution console. The main page is now closer to a real trading workstation: account tiles, execution arm/disarm state, data freshness, scan quality, ranked trade queue, selected chart, paper order ticket, open/closed paper portfolio, activity log, and cloud scan history.

This build still does **not** place real broker orders. It is paper/signals only.

## Deploy flow

Copy this version into the existing GitHub project folder, commit, push, and Vercel will redeploy automatically.

## Key operating idea

- Scan now = refresh the live trade queue.
- Arm paper bot = allow simulated entries only.
- Run bot cycle = scan, optionally open paper trades, save scan to Supabase.
- Stale simulation override = weekend/testing mode only, not real live behavior.
- Research lab = old backtester and diagnostics at `/research`.
