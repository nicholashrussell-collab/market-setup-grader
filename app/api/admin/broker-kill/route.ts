import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { cancelAlpacaBrokerOrders, closeAlpacaBrokerPositions, getBrokerConfigStatus } from "@/lib/alpaca-trading";
import { getRuntimeCloudBotSettings } from "@/lib/bot-config";
import { supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

async function logBotEvent(event_type: string, message: string, payload: Record<string, unknown> = {}) {
  try {
    await supabaseRest("bot_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ event_type, message, payload }),
    });
  } catch {}
}

export async function POST(req: Request) {
  if (!isAdminRequest()) return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const settings = await getRuntimeCloudBotSettings();
  const mode = settings.brokerMode;
  if (mode !== "Alpaca Paper" && mode !== "Alpaca Live") {
    return NextResponse.json({ ok: false, message: "Broker kill switch only applies to Alpaca Paper or Alpaca Live modes." }, { status: 400 });
  }
  const config = getBrokerConfigStatus(mode);
  if (!config.canSubmitOrders) return NextResponse.json({ ok: false, message: config.message, broker: config }, { status: 403 });
  if (mode === "Alpaca Live") {
    return NextResponse.json({ ok: false, message: "Live broker kill actions are intentionally blocked in this admin route for now. Use Alpaca directly for live accounts unless you explicitly build live controls later." }, { status: 403 });
  }
  try {
    if (action === "cancel_orders") {
      const result = await cancelAlpacaBrokerOrders(mode);
      await logBotEvent("paper_kill_cancel_orders", "Admin paper kill switch: canceled open broker orders.", { mode, result });
      return NextResponse.json({ ok: true, action, message: "Open Alpaca Paper orders canceled.", result });
    }
    if (action === "close_positions") {
      const result = await closeAlpacaBrokerPositions(mode, true);
      await logBotEvent("paper_kill_close_positions", "Admin paper kill switch: closed paper positions and canceled open orders.", { mode, result });
      return NextResponse.json({ ok: true, action, message: "Alpaca Paper positions close request sent. Open orders were canceled first.", result });
    }
    return NextResponse.json({ ok: false, message: "Unknown action. Use cancel_orders or close_positions." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Broker kill switch failed.";
    await logBotEvent("paper_kill_error", message, { mode, action });
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
