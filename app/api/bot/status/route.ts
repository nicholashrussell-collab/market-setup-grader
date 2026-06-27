import { NextResponse } from "next/server";
import { getCloudBotSettings } from "@/lib/bot-config";
import { getSimpleMarketStatus } from "@/lib/paper-bot";
import { getSupabaseConfigStatus, supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type BotEvent = { id: string; created_at: string; event_type: string; message: string; payload?: unknown };
type PaperTrade = { id: string; created_at: string; symbol: string; bias: string; status: string; entry?: number; stop?: number; target?: number; last_price?: number; unrealized_pnl?: number; result_dollars?: number; result_r?: number; notes?: string };
type ScanRun = { id: string; created_at: string; universe_label?: string; timeframe?: string; candidates_count?: number; actionable_count?: number };

export async function GET() {
  const status = getSupabaseConfigStatus();
  const settings = getCloudBotSettings();
  const market = getSimpleMarketStatus();
  if (!status.configured) {
    return NextResponse.json({ ok: false, configured: false, message: status.message, settings: { universeLabel: settings.universeLabel, symbols: settings.symbols.length, timeframe: settings.timeframe }, market });
  }
  try {
    const [events, openTrades, closedTrades, scans] = await Promise.all([
      supabaseRest<BotEvent[]>("bot_events?select=*&order=created_at.desc&limit=15", { method: "GET" }).catch(() => []),
      supabaseRest<PaperTrade[]>("paper_trades?status=eq.Open&select=*&order=created_at.desc&limit=20", { method: "GET" }).catch(() => []),
      supabaseRest<PaperTrade[]>("paper_trades?status=eq.Closed&select=*&order=updated_at.desc&limit=20", { method: "GET" }).catch(() => []),
      supabaseRest<ScanRun[]>("scan_runs?select=*&order=created_at.desc&limit=10", { method: "GET" }).catch(() => []),
    ]);
    return NextResponse.json({
      ok: true,
      configured: true,
      message: "Cloud bot status loaded.",
      market,
      settings: { universeLabel: settings.universeLabel, symbols: settings.symbols.length, timeframe: settings.timeframe, maxOpenPositions: settings.maxOpenPositions, paperTradingEnabled: settings.paperTradingEnabled },
      lastEvent: events[0] || null,
      events,
      openTrades,
      closedTrades,
      scans,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, configured: true, message: err instanceof Error ? err.message : "Could not load bot status." }, { status: 500 });
  }
}
