import { NextResponse } from "next/server";
import { getAlpacaPaperAccount, getAlpacaPaperOrders, getAlpacaPaperPositions, getBrokerConfigStatus } from "@/lib/alpaca-trading";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getBrokerConfigStatus();
  if (!config.configured) return NextResponse.json({ ok: false, ...config }, { status: 400 });
  if (!config.isPaper) return NextResponse.json({ ok: false, ...config }, { status: 403 });
  try {
    const [account, orders, positions] = await Promise.all([
      getAlpacaPaperAccount(),
      getAlpacaPaperOrders("open", 50),
      getAlpacaPaperPositions(),
    ]);
    return NextResponse.json({ ok: true, ...config, account, orders, positions });
  } catch (err) {
    return NextResponse.json({ ok: false, ...config, message: err instanceof Error ? err.message : "Could not load broker status." }, { status: 500 });
  }
}
