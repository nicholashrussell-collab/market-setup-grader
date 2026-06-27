# Market Setup Grader v7.8

v7.8 polishes the autonomous paper-trading dashboard and fixes the confusing scan/bot timing labels.

- `/` is the public/read-only viewer dashboard with a cleaner mission-control layout.
- `/admin` is the private control page for arming, pausing, tuning, and manually running the cloud paper bot.
- Vercel Cron can call `/api/bot/run` every 15 minutes.
- Supabase stores scans, signals, paper trades, bot events, and the admin-controlled `bot_control` row.
- The viewer now separates “latest bot run” from “latest saved scan,” so market-closed cron skips do not look like stale settings.
- Latest ranked signals can show Top 50 / 100 / 250 / 500 and clearly says “displayed of scanned.”
- Real broker orders are still locked off. This is cloud paper trading only.

After deploying v7.8:

1. Add `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel Environment Variables.
2. Run `supabase/schema.sql` again in Supabase SQL Editor.
3. Open `/admin`, log in, save the settings, and arm paper trading when you are ready.
4. Share `/` as the read-only dashboard, not `/admin`.

Recommended starting settings:

- Universe: Super Wide 100 or Super Wide 500
- Timeframe: 15Min
- Paper execution: disarmed until you intentionally arm it
- Stale simulation: off for real paper-live tests
- Risk per trade: 1%
- Max open trades: 4

No real-money execution is included in this version.
