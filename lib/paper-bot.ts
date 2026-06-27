import { randomUUID } from "crypto";
import { fetchAlpacaBars } from "@/lib/alpaca-server";
import { getAlpacaPaperAccount, getAlpacaPaperOrders, getAlpacaPaperPositions, submitAlpacaPaperBracketOrder } from "@/lib/alpaca-trading";
import { CloudBotSettings, getRuntimeCloudBotSettings } from "@/lib/bot-config";
import { supabaseRest } from "@/lib/supabase-rest";
import { Bias, Candle, GradeResult, gradeSetup } from "@/lib/trading";

export type CloudBotCandidate = {
  symbol: string;
  score: number;
  bias: Bias | "Error";
  setup: string;
  regime: string;
  state: string;
  rr: number;
  entry: number;
  stop: number;
  target: number;
  latestTime: string;
  staleMinutes: number;
  actionable: boolean;
  priority: number;
  reasons: string[];
  warnings: string[];
  lastPrice: number;
};

type PaperTradeRow = {
  id: string;
  symbol: string;
  timeframe?: string;
  bias: "Long" | "Short";
  signal_time?: string;
  entry: number;
  stop: number;
  target: number;
  rr?: number;
  score?: number;
  status: string;
  shares?: number;
  risk_dollars?: number;
  position_value?: number;
  last_price?: number;
  unrealized_pnl?: number;
  result_r?: number;
  execution_mode?: string;
  broker_order_id?: string;
  broker_client_order_id?: string;
  broker_status?: string;
  broker_payload?: any;
  raw?: any;
};

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function latestPrice(candles: Candle[]) {
  return candles[candles.length - 1]?.close || 0;
}

function nowEtParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return { weekday: get("weekday"), hour: Number(get("hour")), minute: Number(get("minute")) };
}

export function getSimpleMarketStatus(date = new Date()) {
  const { weekday, hour, minute } = nowEtParts(date);
  const weekdayOpen = !["Sat", "Sun"].includes(weekday);
  const minutes = hour * 60 + minute;
  const isOpen = weekdayOpen && minutes >= 9 * 60 + 30 && minutes <= 16 * 60;
  return {
    isOpen,
    label: isOpen ? "Open" : "Closed",
    reason: isOpen ? "Regular session appears open." : "Outside regular US market hours. Holiday checks are not included in this simple guard.",
  };
}

async function logBotEvent(event_type: string, message: string, payload: Record<string, unknown> = {}) {
  try {
    await supabaseRest("bot_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ event_type, message, payload }),
    });
  } catch {
    // Do not fail the whole bot run because an optional log row failed.
  }
}

function makeCandidate(symbol: string, candles: Candle[], g: GradeResult, settings: CloudBotSettings): CloudBotCandidate {
  const latestTime = candles[candles.length - 1]?.time || g.latestCandleTime || "";
  const staleMinutes = latestTime ? Math.max(0, Math.round((Date.now() - new Date(latestTime).getTime()) / 60000)) : 999999;
  const rr = Number.isFinite(g.rr) ? g.rr : 0;
  const freshEnough = settings.allowStaleSimulation || staleMinutes <= settings.maxStaleMinutes;
  const directionAllowed = !settings.longOnly || g.bias !== "Short";
  const actionable = g.bias !== "Neutral" && directionAllowed && g.score >= settings.minScore && g.score <= settings.maxScore && rr >= settings.minRR && freshEnough;
  const priority = (actionable ? 1000 : 0) + g.score * 10 + rr - Math.min(staleMinutes, 500) / 100;
  return {
    symbol,
    score: g.score,
    bias: g.bias,
    setup: g.setupType,
    regime: g.marketRegime,
    state: g.marketRegime || "—",
    rr,
    entry: g.entry,
    stop: g.stop,
    target: g.target,
    latestTime,
    staleMinutes,
    actionable,
    priority,
    reasons: g.reasons || [],
    warnings: g.warnings || [],
    lastPrice: latestPrice(candles),
  };
}

async function saveScanRun(settings: CloudBotSettings, candidates: CloudBotCandidate[], startedAt: string, finishedAt: string, reason: string) {
  const actionableCount = candidates.filter((c) => c.actionable).length;
  const rows = await supabaseRest<{ id: string }[]>("scan_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      started_at: startedAt,
      finished_at: finishedAt,
      status: "saved",
      reason,
      source: settings.source,
      timeframe: settings.timeframe,
      universe_label: `${settings.universeLabel} · v8.3 broker bridge bot`,
      symbols_count: settings.symbols.length,
      candidates_count: candidates.length,
      actionable_count: actionableCount,
      settings: {
        version: "v8.3",
        executionMode: settings.brokerMode,
        brokerPaperEnabled: settings.brokerPaperEnabled,
        minScore: settings.minScore,
        maxScore: settings.maxScore,
        minRR: settings.minRR,
        maxOpenPositions: settings.maxOpenPositions,
        riskPct: settings.riskPct,
        maxPositionPct: settings.maxPositionPct,
        paperOnly: true,
        cloudWorker: true,
      },
      notes: settings.brokerMode === "Alpaca Paper" ? "Saved by v8.3 scheduled bot. Alpaca paper broker orders may be placed only when broker paper is enabled." : "Saved by v8.3 scheduled cloud paper bot. No broker orders placed in simulation mode.",
    }),
  });
  const scanRunId = rows[0]?.id;
  if (!scanRunId) throw new Error("Supabase did not return a scan run id.");
  if (candidates.length) {
    await supabaseRest("scan_signals", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(candidates.map((c) => ({
        scan_run_id: scanRunId,
        symbol: c.symbol,
        score: c.score,
        bias: c.bias,
        setup: c.setup,
        regime: c.regime,
        market_state: c.state,
        rr: c.rr,
        entry: c.entry,
        stop: c.stop,
        target: c.target,
        latest_time: c.latestTime || null,
        stale_minutes: c.staleMinutes,
        actionable: c.actionable,
        priority: c.priority,
        reasons: c.reasons,
        warnings: c.warnings,
        raw: c,
      }))),
    });
  }
  return scanRunId;
}

function calcPositionSizing(candidate: CloudBotCandidate, equity: number, settings: CloudBotSettings) {
  const riskPerShare = Math.abs(candidate.entry - candidate.stop);
  if (!Number.isFinite(riskPerShare) || riskPerShare <= 0) return null;
  const targetRisk = equity * (settings.riskPct / 100);
  const maxPositionValue = equity * (settings.maxPositionPct / 100);
  const shares = Math.max(0, Math.min(targetRisk / riskPerShare, maxPositionValue / Math.max(candidate.entry, 0.01)));
  if (!Number.isFinite(shares) || shares <= 0) return null;
  return {
    shares: Number(shares.toFixed(4)),
    riskDollars: Number((riskPerShare * shares).toFixed(2)),
    positionValue: Number((candidate.entry * shares).toFixed(2)),
  };
}

async function getOpenPaperTrades(): Promise<PaperTradeRow[]> {
  return await supabaseRest<PaperTradeRow[]>("paper_trades?status=eq.Open&select=*", { method: "GET" });
}

async function syncBrokerPaperState(settings: CloudBotSettings) {
  if (settings.brokerMode !== "Alpaca Paper" || !settings.brokerPaperEnabled) {
    return { enabled: false, account: null, orders: [], positions: [] };
  }
  try {
    const [account, orders, positions] = await Promise.all([
      getAlpacaPaperAccount(),
      getAlpacaPaperOrders("open", 50),
      getAlpacaPaperPositions(),
    ]);
    await logBotEvent("broker_sync", `Alpaca paper broker synced: ${positions.length} position(s), ${orders.length} open order(s).`, {
      buyingPower: account.buying_power,
      portfolioValue: account.portfolio_value,
      positions: positions.map((p) => ({ symbol: p.symbol, qty: p.qty, side: p.side, unrealized_pl: p.unrealized_pl })),
      orders: orders.map((o) => ({ id: o.id, symbol: o.symbol, status: o.status, side: o.side, client_order_id: o.client_order_id })),
    });
    return { enabled: true, account, orders, positions };
  } catch (err) {
    await logBotEvent("broker_sync_error", `Alpaca paper broker sync failed: ${err instanceof Error ? err.message : "unknown error"}`, {});
    return { enabled: true, account: null, orders: [], positions: [] };
  }
}


async function checkOpenTrades(settings: CloudBotSettings) {
  const open = await getOpenPaperTrades();
  let updated = 0;
  let closed = 0;
  for (const trade of open) {
    try {
      const candles = await fetchAlpacaBars({ symbol: trade.symbol, timeframe: settings.timeframe, mode: "latest", limit: 250 });
      const latest = latestPrice(candles);
      const shares = safeNumber(trade.shares ?? trade.raw?.shares, 0);
      const entry = safeNumber(trade.entry, 0);
      const direction = trade.bias === "Short" ? -1 : 1;
      let closePrice = 0;
      let closeReason = "";
      let closedAt = "";
      const signalTime = trade.signal_time ? new Date(trade.signal_time).getTime() : 0;
      for (const candle of candles) {
        if (signalTime && new Date(candle.time).getTime() < signalTime) continue;
        if (trade.bias === "Short") {
          if (candle.high >= trade.stop) { closePrice = trade.stop; closeReason = "Stop hit"; closedAt = candle.time; break; }
          if (candle.low <= trade.target) { closePrice = trade.target; closeReason = "Target hit"; closedAt = candle.time; break; }
        } else {
          if (candle.low <= trade.stop) { closePrice = trade.stop; closeReason = "Stop hit"; closedAt = candle.time; break; }
          if (candle.high >= trade.target) { closePrice = trade.target; closeReason = "Target hit"; closedAt = candle.time; break; }
        }
      }
      if (closePrice) {
        const realized = (closePrice - entry) * shares * direction;
        const riskDollars = safeNumber(trade.risk_dollars ?? trade.raw?.riskDollars, Math.abs(entry - trade.stop) * Math.max(shares, 1));
        await supabaseRest(`paper_trades?id=eq.${trade.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            updated_at: new Date().toISOString(),
            status: "Closed",
            close_time: closedAt || new Date().toISOString(),
            close_price: closePrice,
            result_dollars: Number(realized.toFixed(2)),
            result_r: Number((realized / Math.max(riskDollars, 0.01)).toFixed(2)),
            last_price: closePrice,
            unrealized_pnl: 0,
            notes: closeReason,
          }),
        });
        closed += 1;
        await logBotEvent("paper_trade_closed", `${trade.symbol} paper trade closed: ${closeReason}.`, { tradeId: trade.id, closePrice, closeReason });
      } else {
        const unrealized = (latest - entry) * shares * direction;
        await supabaseRest(`paper_trades?id=eq.${trade.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            updated_at: new Date().toISOString(),
            last_price: latest,
            unrealized_pnl: Number(unrealized.toFixed(2)),
          }),
        });
        updated += 1;
      }
    } catch (err) {
      await logBotEvent("paper_trade_check_error", `Could not check ${trade.symbol}: ${err instanceof Error ? err.message : "unknown error"}`, { tradeId: trade.id });
    }
  }
  return { openChecked: open.length, updated, closed };
}

async function openPaperTrades(settings: CloudBotSettings, candidates: CloudBotCandidate[]) {
  if (!settings.paperTradingEnabled) return { opened: 0, symbols: [] as string[], reason: "Paper trading disabled." };
  const open = await getOpenPaperTrades();
  const openSymbols = new Set(open.map((p) => p.symbol));
  const slots = Math.max(0, settings.maxOpenPositions - open.length);
  if (!slots) return { opened: 0, symbols: [] as string[], reason: "No open paper slots available." };
  const realizedClosed = await supabaseRest<{ result_dollars: number | null }[]>("paper_trades?status=eq.Closed&select=result_dollars", { method: "GET" }).catch(() => []);
  const realized = realizedClosed.reduce((sum, p) => sum + safeNumber(p.result_dollars), 0);
  const equity = settings.startingEquity + realized;
  const top = candidates.filter((c) => c.actionable && (c.bias === "Long" || c.bias === "Short") && !openSymbols.has(c.symbol)).slice(0, slots);
  const rows: any[] = [];
  const brokerErrors: string[] = [];

  for (const candidate of top) {
    const size = calcPositionSizing(candidate, equity, settings);
    if (!size) continue;
    const clientOrderId = `msg-v83-${candidate.symbol.toLowerCase()}-${randomUUID().slice(0, 18)}`;
    let brokerOrder: any = null;
    let executionMode = settings.brokerMode;
    let notes = "Opened by v8.3 cloud bot in Supabase simulation mode. No broker order was placed.";

    if (settings.brokerMode === "Alpaca Paper" && settings.brokerPaperEnabled) {
      try {
        brokerOrder = await submitAlpacaPaperBracketOrder({
          symbol: candidate.symbol,
          side: candidate.bias === "Short" ? "sell" : "buy",
          qty: size.shares,
          takeProfit: candidate.target,
          stopLoss: candidate.stop,
          clientOrderId,
        });
        notes = "Opened by v8.3 cloud bot using Alpaca paper broker bracket order. Real broker orders remain locked.";
        await logBotEvent("broker_paper_order_submitted", `${candidate.symbol} Alpaca paper bracket order submitted.`, { symbol: candidate.symbol, brokerOrderId: brokerOrder.id, clientOrderId, status: brokerOrder.status });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown broker error";
        brokerErrors.push(`${candidate.symbol}: ${message}`);
        await logBotEvent("broker_paper_order_error", `${candidate.symbol} Alpaca paper order failed: ${message}`, { symbol: candidate.symbol, clientOrderId });
        continue;
      }
    }

    rows.push({
      symbol: candidate.symbol,
      timeframe: settings.timeframe,
      bias: candidate.bias,
      signal_time: candidate.latestTime || new Date().toISOString(),
      entry: candidate.entry,
      stop: candidate.stop,
      target: candidate.target,
      rr: candidate.rr,
      score: candidate.score,
      status: "Open",
      shares: settings.brokerMode === "Alpaca Paper" && settings.brokerPaperEnabled ? Math.floor(size.shares) : size.shares,
      risk_dollars: size.riskDollars,
      position_value: size.positionValue,
      last_price: candidate.lastPrice || candidate.entry,
      unrealized_pnl: 0,
      execution_mode: executionMode,
      broker_order_id: brokerOrder?.id || null,
      broker_client_order_id: brokerOrder?.client_order_id || clientOrderId,
      broker_status: brokerOrder?.status || null,
      broker_payload: brokerOrder || null,
      notes,
      raw: { candidate, shares: size.shares, riskDollars: size.riskDollars, positionValue: size.positionValue, cloudBot: true, executionMode, brokerOrder },
    });
  }

  if (!rows.length) return { opened: 0, symbols: [] as string[], reason: brokerErrors.length ? `Broker orders failed: ${brokerErrors.slice(0, 2).join("; ")}` : "No sized paper trades could be opened." };
  await supabaseRest("paper_trades", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
  const symbols = rows.map((r: any) => r.symbol);
  await logBotEvent(settings.brokerMode === "Alpaca Paper" && settings.brokerPaperEnabled ? "broker_paper_trade_opened" : "paper_trade_opened", `Opened ${symbols.length} ${settings.brokerMode} trade(s): ${symbols.join(", ")}.`, { symbols, brokerErrors });
  return { opened: symbols.length, symbols, reason: settings.brokerMode === "Alpaca Paper" && settings.brokerPaperEnabled ? "Submitted Alpaca paper broker orders." : "Opened Supabase simulation trades." };
}

export async function runCloudPaperBot(reason = "scheduled") {
  const settings = await getRuntimeCloudBotSettings();
  const startedAt = new Date().toISOString();
  const market = getSimpleMarketStatus();
  if (!settings.enabled) {
    await logBotEvent("bot_skipped", "Cloud bot skipped: BOT_ENABLED is false.", { reason });
    return { ok: true, skipped: true, message: "Cloud bot disabled.", startedAt, finishedAt: new Date().toISOString(), market, settings: { universeLabel: settings.universeLabel } };
  }
  if (!market.isOpen && !settings.allowStaleSimulation) {
    await logBotEvent("bot_skipped_market_closed", "Cloud bot skipped: market appears closed.", { reason, market });
    return { ok: true, skipped: true, message: "Market closed; no scan or paper entries opened.", startedAt, finishedAt: new Date().toISOString(), market, settings: { universeLabel: settings.universeLabel } };
  }

  await logBotEvent("bot_started", `Cloud paper bot started (${reason}).`, { universe: settings.universeLabel, symbols: settings.symbols.length, timeframe: settings.timeframe });
  const brokerSync = await syncBrokerPaperState(settings);
  const tradeCheck = await checkOpenTrades(settings);
  const candidates: CloudBotCandidate[] = [];
  for (const symbol of settings.symbols) {
    try {
      const candles = await fetchAlpacaBars({ symbol, timeframe: settings.timeframe, mode: "latest", limit: 250 });
      const g = gradeSetup(candles, settings.timeframe, new Date(), { mode: settings.targetMode, fixedR: settings.fixedTargetR, atrMultiple: settings.atrTargetMultiple }, { profile: settings.gradeProfile });
      if (g) candidates.push(makeCandidate(symbol, candles, g, settings));
    } catch (err) {
      candidates.push({
        symbol,
        score: 0,
        bias: "Error",
        setup: "Data/API failure",
        regime: "—",
        state: "—",
        rr: 0,
        entry: 0,
        stop: 0,
        target: 0,
        latestTime: "",
        staleMinutes: 999999,
        actionable: false,
        priority: -1,
        reasons: [],
        warnings: [err instanceof Error ? err.message : "Failed to scan symbol"],
        lastPrice: 0,
      });
    }
  }
  const sorted = candidates.sort((a, b) => b.priority - a.priority || b.score - a.score);
  const finishedAt = new Date().toISOString();
  const scanRunId = await saveScanRun(settings, sorted, startedAt, finishedAt, reason);
  const openResult = await openPaperTrades(settings, sorted);
  const actionable = sorted.filter((c) => c.actionable).length;
  await logBotEvent("bot_completed", `Cloud bot completed: ${actionable}/${settings.symbols.length} actionable, ${openResult.opened} opened.`, { scanRunId, tradeCheck, brokerSync, openResult, actionable, scanned: sorted.length });
  return { ok: true, skipped: false, startedAt, finishedAt, scanRunId, scanned: sorted.length, actionable, tradeCheck, brokerSync, openResult, market, settings: { universeLabel: settings.universeLabel, timeframe: settings.timeframe, maxOpenPositions: settings.maxOpenPositions, paperTradingEnabled: settings.paperTradingEnabled, brokerMode: settings.brokerMode, brokerPaperEnabled: settings.brokerPaperEnabled } };
}
