# Market Setup Grader v8.7

Tracked-watchlist control room for the autonomous cloud bot.

## Highlights

- Removes Tracked/Core preset controls from Admin and the public viewer.
- The editable Tracked Symbols list is now the cloud bot watchlist.
- Admin shows only how many symbols are active/saved, not preset names.
- Wider, more readable right rail with scrollable panels.
- Better 100% zoom layout so the side panels stay readable.
- Keeps the same risk defaults and broker execution modes from v8.5.

## Deploy

Copy this folder into your existing GitHub/Vercel project, commit, and push.

Run `supabase/schema.sql` once if you want the database row updated to the v8.7 tracked-symbol defaults.
