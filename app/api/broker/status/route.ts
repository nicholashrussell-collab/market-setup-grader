import { NextResponse } from "next/server";
import { getAlpacaBrokerAccount, getAlpacaBrokerOrders, getAlpacaBrokerPositions, getBrokerConfigStatus } from "@/lib/alpaca-trading";
import { getRuntimeCloudBotSettings } from "@/lib/bot-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getRuntimeCloudBotSettings();
  const mode = settings.brokerMode;
  const config = getBrokerConfigStatus(mode);
  if (mode !== "Alpaca Paper" && mode !== "Alpaca Live") return NextResponse.json({ ok: true, ...config });
  if (!config.configured) return NextResponse.json({ ok: false, ...config }, { status: 400 });
  if (!config.canSubmitOrders) return NextResponse.json({ ok: false, ...config }, { status: 403 });
  try {
    const [account, orders, positions] = await Promise.all([
      getAlpacaBrokerAccount(mode),
      getAlpacaBrokerOrders(mode, "open", 50),
      getAlpacaBrokerPositions(mode),
    ]);
    return NextResponse.json({ ok: true, ...config, account, orders, positions });
  } catch (err) {
    return NextResponse.json({ ok: false, ...config, message: err instanceof Error ? err.message : "Could not load broker status." }, { status: 500 });
  }
}
