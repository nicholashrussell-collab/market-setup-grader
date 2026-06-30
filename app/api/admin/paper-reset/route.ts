import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getRuntimeCloudBotSettings } from "@/lib/bot-config";
import { reconcileOpenAppTradesWithBroker, startNewPaperTestDay } from "@/lib/broker-sync";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdminRequest()) return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const settings = await getRuntimeCloudBotSettings();
  try {
    if (action === "reconcile") {
      const result = await reconcileOpenAppTradesWithBroker(settings.brokerMode);
      return NextResponse.json(result);
    }
    if (action === "start_new_test_day") {
      const result = await startNewPaperTestDay(settings.brokerMode);
      return NextResponse.json(result);
    }
    return NextResponse.json({ ok: false, message: "Unknown action. Use reconcile or start_new_test_day." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : "Paper reset action failed." }, { status: 500 });
  }
}
