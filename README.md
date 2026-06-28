# Market Setup Grader v8.5 — Simplified Admin Control Panel

v8.5 fixes the admin save JSON error, simplifies execution into three clear modes, and adds an editable watchlist area.

## Main admin flow

1. Preflight shows connections/gates.
2. Execution command chooses Internal Paper, Alpaca Paper, or Alpaca Live.
3. Additional settings control risk, scan universe, scores, stale guard, and scan limit.
4. Tracked symbols can be viewed and optionally overridden with a custom list.

Run `supabase/schema.sql` once after deployment so `bot_control.custom_symbols` exists.
