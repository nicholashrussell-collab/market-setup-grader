import { NextResponse } from "next/server";
import { getRuntimeCloudBotSettings } from "@/lib/bot-config";
import { getSimpleMarketStatus } from "@/lib/paper-bot";
import { getSupabaseConfigStatus, supabaseRest } from "@/lib/supabase-rest";
import { getAlpacaBrokerAccount, getAlpacaBrokerOrders, getAlpacaBrokerPositions, getBrokerConfigStatus } from "@/lib/alpaca-trading";

export const dynamic = "force-dynamic";

type BotEvent = { id: string; created_at: string; event_type: string; message: string; payload?: unknown };
type PaperTrade = { id: string; created_at: string; symbol: string; bias: string; status: string; entry?: number; stop?: number; target?: number; last_price?: number; unrealized_pnl?: number; result_dollars?: number; result_r?: number; notes?: string; execution_mode?: string; broker_order_id?: string; broker_status?: string };
type ScanRun = { id: string; created_at: string; universe_label?: string; timeframe?: string; candidates_count?: number; actionable_count?: number };

function settingsPayload(settings: Awaited<ReturnType<typeof getRuntimeCloudBotSettings>>) {
  return {
    universeLabel: settings.universeLabel,
    symbols: settings.symbols.length,
    symbolsList: settings.symbols,
    customSymbols: settings.customSymbols || "",
    timeframe: settings.timeframe,
    enabled: settings.enabled,
    maxOpenPositions: settings.maxOpenPositions,
    paperTradingEnabled: settings.paperTradingEnabled,
    startingEquity: settings.startingEquity,
    riskPct: settings.riskPct,
    scanLimit: settings.scanLimit,
    minScore: settings.minScore,
    maxScore: settings.maxScore,
    minRR: settings.minRR,
    maxStaleMinutes: settings.maxStaleMinutes,
    allowStaleSimulation: settings.allowStaleSimulation,
    brokerMode: settings.brokerMode,
    brokerPaperEnabled: settings.brokerPaperEnabled,
    brokerLiveEnabled: settings.brokerLiveEnabled,
    targetMode: settings.targetMode,
    fixedTargetR: settings.fixedTargetR,
    gradeProfile: settings.gradeProfile,
    directionFilter: settings.directionFilter,
    regimeFilter: settings.regimeFilter,
    sessionFilter: settings.sessionFilter,
    setupTypeFilter: settings.setupTypeFilter,
    strategyEngine: settings.strategyEngine,
    riskModel: settings.riskModel,
    cooldownMinutes: settings.cooldownMinutes,
    maxBarsToHold: settings.maxBarsToHold,
    warmupBars: settings.warmupBars,
    maxNewTradesPerRun: settings.maxNewTradesPerRun,
    maxTotalOpenRiskPct: settings.maxTotalOpenRiskPct,
    accountType: settings.accountType,
    marginMultiplier: settings.marginMultiplier,
    allowFractionalShares: settings.allowFractionalShares,
    allowShorts: settings.allowShorts,
    openStartMinutesEt: settings.openStartMinutesEt,
    openEndMinutesEt: settings.openEndMinutesEt,
    noOvernight: settings.noOvernight,
  };
}

export async function GET() {
  const status = getSupabaseConfigStatus();
  const settings = await getRuntimeCloudBotSettings();
  const market = getSimpleMarketStatus();
  const brokerConfig = getBrokerConfigStatus(settings.brokerMode);
  if (!status.configured) {
    return NextResponse.json({ ok: false, configured: false, message: status.message, settings: settingsPayload(settings), market, broker: brokerConfig });
  }
  try {
    const brokerEnabled = (settings.brokerMode === "Alpaca Paper" && settings.brokerPaperEnabled) || (settings.brokerMode === "Alpaca Live" && settings.brokerLiveEnabled);
    const brokerPromise = brokerEnabled
      ? Promise.all([
          getAlpacaBrokerAccount(settings.brokerMode),
          getAlpacaBrokerOrders(settings.brokerMode, "open", 50),
          getAlpacaBrokerPositions(settings.brokerMode),
        ]).then(([account, orders, positions]) => ({ ...brokerConfig, account, orders, positions }))
        .catch((err) => ({ ...brokerConfig, error: err instanceof Error ? err.message : "Broker status failed." }))
      : Promise.resolve(brokerConfig);
    const [events, openTrades, closedTrades, scans, broker] = await Promise.all([
      supabaseRest<BotEvent[]>("bot_events?select=*&order=created_at.desc&limit=15", { method: "GET" }).catch(() => []),
      supabaseRest<PaperTrade[]>("paper_trades?status=eq.Open&select=*&order=created_at.desc&limit=20", { method: "GET" }).catch(() => []),
      supabaseRest<PaperTrade[]>("paper_trades?status=eq.Closed&select=*&order=updated_at.desc&limit=20", { method: "GET" }).catch(() => []),
      supabaseRest<ScanRun[]>("scan_runs?select=*&order=created_at.desc&limit=10", { method: "GET" }).catch(() => []),
      brokerPromise,
    ]);
    return NextResponse.json({
      ok: true,
      configured: true,
      message: "Cloud bot status loaded.",
      market,
      settings: settingsPayload(settings),
      broker,
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
