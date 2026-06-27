# Market Setup Grader v7.7

v7.7 turns the project into an autonomous paper-trading dashboard with a private admin control center.

- `/` is now the public/read-only viewer dashboard.
- `/admin` is the private control page for arming, pausing, tuning, and manually running the cloud paper bot.
- Vercel Cron can call `/api/bot/run` every 15 minutes.
- Supabase stores scans, signals, paper trades, bot events, and the admin-controlled `bot_control` row.
- Real broker orders are still locked off. This is cloud paper trading only.

After deploying v7.7:

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
