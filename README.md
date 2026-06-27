# Market Setup Grader v7.6

v7.6 adds the cloud paper-bot worker layer.

- Vercel hosts the dashboard.
- Supabase stores scans, paper trades, and bot events.
- `/api/bot/run` is a scheduled paper-bot endpoint.
- `vercel.json` schedules the endpoint every 15 minutes.
- Real-money order execution is still not included.

After deploying, run `supabase/schema.sql` in Supabase SQL Editor again so the new `bot_events` and paper-trade fields exist.
