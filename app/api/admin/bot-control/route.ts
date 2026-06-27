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
  const created = await supabaseRest<any[]>("bot_control", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(initial),
  }).catch(() => [initial]);
  return created[0] || initial;
}

export async function GET() {
  if (!isAdminRequest()) return unauthorized();
  const status = getSupabaseConfigStatus();
  if (!status.configured) return NextResponse.json({ ok: false, configured: false, message: status.message }, { status: 400 });
  const control = await readControl();
  return NextResponse.json({ ok: true, configured: true, control });
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
  ];
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) allowed[key] = body[key];
  }
  const rows = await supabaseRest<any[]>("bot_control", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(allowed),
  });
  return NextResponse.json({ ok: true, control: rows[0] || allowed });
}
