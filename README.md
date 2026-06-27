# Market Setup Grader v8.1

Professional navigation layout for the autonomous paper trading viewer.

## What changed in v8.1

- Public viewer now uses real route-based navigation:
  - `/` Home / overview
  - `/chart-desk`
  - `/signals`
  - `/positions`
  - `/activity`
- Left sidebar stays pinned to the side on desktop.
- Right inspector stays pinned separately from the main content.
- Cleaner professional color system: navy, charcoal, black, white, beige/tan.
- Main content is split into focused pages instead of one long scrolling page.
- Admin page keeps the same professional shell and is marked v8.1.
- No trading-rule changes. This is still cloud paper trading only.

## Install over the current project

```powershell
robocopy "C:\Users\nicho\Downloads\market-setup-grader-v8-1\v8_1" "C:\Users\nicho\Downloads\market-setup-grader-v7-2\v7_2" /E /XD .git node_modules .next .vercel /XF .env .env.local package-lock.json

cd C:\Users\nicho\Downloads\market-setup-grader-v7-2\v7_2
git status
git add -A
git commit -m "Add v8.1 professional navigation shell"
git push
```

No Supabase schema rerun is required for v8.1.
