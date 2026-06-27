# Market Setup Grader v8.0

Autonomous paper trading viewer and private admin console.

## Main change

v8.0 turns the app into a clearer operations console:

- `/` is the read-only viewer/dashboard.
- `/admin` is the private command center.
- The viewer now separates **current admin rules** from the **latest saved scan**.
- If the market is closed and cron skips scanning, the dashboard no longer makes it look like the bot is using the wrong universe.
- Admin now uses the same left-sidebar / center-workspace / right-inspector layout as the viewer.
- Added system profile and research-memory panels so you can see what the bot is doing without hunting through every setting.

## Safety

This remains paper-only. No real broker orders are placed.

## Deploy

Copy into your GitHub/Vercel project folder, commit, and push.

```powershell
robocopy "C:\Users\nicho\Downloads\market-setup-grader-v8-0\v8_0" "C:\Users\nicho\Downloads\market-setup-grader-v7-2\v7_2" /E /XD .git node_modules .next .vercel /XF .env .env.local package-lock.json

cd C:\Users\nicho\Downloads\market-setup-grader-v7-2\v7_2
git status
git add -A
git commit -m "Add v8.0 operations console clarity"
git push
```

No Supabase schema rerun should be needed if v7.7 schema was already applied.
