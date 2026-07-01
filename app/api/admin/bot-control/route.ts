import { NextResponse } from "next/server";
import { defaultBotControlRow } from "@/lib/bot-config";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseConfigStatus, supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
}

async function readControl() {
  const rows = await supabaseRest<any[]>("bot_control?id=eq.main&select=*&limit=1", { method: "GET" }).catch(() => []);
  if (rows[0]) return rows[0];
  const initial = defaultBotControlRow();
  const created = await supabaseRest<any[]>("bot_control?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(initial),
  }).catch(() => [initial]);
  return created[0] || initial;
}

function jsonError(message: string, status = 500, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

export async function GET() {
  if (!isAdminRequest()) return unauthorized();
  const status = getSupabaseConfigStatus();
  if (!status.configured) return NextResponse.json({ ok: false, configured: false, message: status.message }, { status: 400 });
  try {
    const control = await readControl();
    return NextResponse.json({ ok: true, configured: true, control });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not load bot control settings.");
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest()) return unauthorized();
  const status = getSupabaseConfigStatus();
  if (!status.configured) return NextResponse.json({ ok: false, configured: false, message: status.message }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const allowed: Record<string, unknown> = { id: "main", updated_at: new Date().toISOString() };
  const keys = [
    "bot_enabled",
    "paper_trading_enabled",
    "universe_label",
    "timeframe",
    "min_score",
    "max_score",
    "min_rr",
    "max_open_positions",
    "starting_equity",
    "risk_pct",
    "max_position_pct",
    "max_stale_minutes",
    "allow_stale_simulation",
    "scan_limit",
    "notes",
    "broker_mode",
    "broker_paper_enabled",
    "broker_live_enabled",
    "custom_symbols",
    "target_mode",
    "fixed_target_r",
    "atr_target_multiple",
    "grade_profile",
    "direction_filter",
    "regime_filter",
    "session_filter",
    "setup_type_filter",
    "strategy_engine",
    "leader_exit_mode",
    "risk_model",
    "fixed_risk_dollars",
    "cooldown_minutes",
    "max_bars_to_hold",
    "warmup_bars",
    "max_new_trades_per_run",
    "max_total_open_risk_pct",
    "account_type",
    "margin_multiplier",
    "allow_fractional_shares",
    "allow_shorts",
    "open_start_minutes_et",
    "open_end_minutes_et",
    "no_new_trades_first_minutes",
    "no_new_trades_last_minutes",
    "no_overnight",
  ];
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) allowed[key] = body[key];
  }
  // v9.7 Admin is broker-only. Legacy internal/simulation saves are normalized to Alpaca Paper unless Live is explicitly selected.
  if (allowed.broker_mode !== "Alpaca Live" && allowed.broker_live_enabled !== true) {
    allowed.broker_mode = "Alpaca Paper";
    allowed.broker_paper_enabled = true;
    allowed.broker_live_enabled = false;
  }
  try {
    const rows = await supabaseRest<any[]>("bot_control?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(allowed),
    });
    return NextResponse.json({ ok: true, control: rows[0] || allowed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save settings.";
    const schemaHint = message.includes("broker_live_enabled") || message.includes("custom_symbols") || message.includes("max_new_trades_per_run") || message.includes("fixed_target_r") || message.includes("column")
      ? "Run the latest supabase/schema.sql once in Supabase SQL Editor, then try saving again."
      : undefined;
    return jsonError(message, 500, schemaHint ? { schemaHint } : {});
  }
}
