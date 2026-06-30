import { getAlpacaBrokerAccount, getAlpacaBrokerPositions, type AlpacaAccount, type AlpacaBrokerMode, type AlpacaPosition } from "@/lib/alpaca-trading";
import { supabaseRest } from "@/lib/supabase-rest";

type OpenTradeRow = {
  id: string;
  symbol: string;
  status: string;
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  shares?: number | null;
  last_price?: number | null;
  unrealized_pnl?: number | null;
  result_dollars?: number | null;
  notes?: string | null;
  execution_mode?: string | null;
  broker_status?: string | null;
};

function n(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function appendNote(existing: string | null | undefined, note: string) {
  const base = (existing || "").trim();
  return base ? `${base}\n${note}` : note;
}

async function logBotEvent(event_type: string, message: string, payload: Record<string, unknown> = {}) {
  try {
    await supabaseRest("bot_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ event_type, message, payload }),
    });
  } catch {}
}

export async function getBrokerEquitySnapshot(mode: AlpacaBrokerMode) {
  if (mode !== "Alpaca Paper" && mode !== "Alpaca Live") return null;
  const account = await getAlpacaBrokerAccount(mode);
  const equity = n(account.equity ?? account.portfolio_value, 0);
  const buyingPower = n(account.buying_power, 0);
  const cash = n(account.cash, 0);
  return { account, equity, buyingPower, cash, source: mode };
}

export async function reconcileOpenAppTradesWithBroker(mode: AlpacaBrokerMode) {
  if (mode !== "Alpaca Paper" && mode !== "Alpaca Live") {
    return { ok: true, mode, checked: 0, closed: 0, matched: 0, message: "Broker reconciliation skipped because no broker execution route is active." };
  }

  const [openTrades, positions] = await Promise.all([
    supabaseRest<OpenTradeRow[]>("paper_trades?status=eq.Open&select=*&order=created_at.desc&limit=200", { method: "GET" }).catch(() => []),
    getAlpacaBrokerPositions(mode).catch(() => [] as AlpacaPosition[]),
  ]);

  const positionSymbols = new Set(positions.map((p) => String(p.symbol || "").toUpperCase()).filter(Boolean));
  let closed = 0;
  let matched = 0;
  const staleSymbols: string[] = [];

  for (const trade of openTrades) {
    const symbol = String(trade.symbol || "").toUpperCase();
    if (positionSymbols.has(symbol)) {
      matched += 1;
      continue;
    }

    staleSymbols.push(symbol);
    closed += 1;
    const closePrice = n(trade.last_price, n(trade.entry, 0)) || null;
    const resultDollars = trade.unrealized_pnl == null ? trade.result_dollars ?? null : Number(trade.unrealized_pnl);
    await supabaseRest(`paper_trades?id=eq.${trade.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        updated_at: new Date().toISOString(),
        status: "Closed",
        close_time: new Date().toISOString(),
        close_price: closePrice,
        result_dollars: resultDollars,
        broker_status: "broker_no_position_reconciled",
        notes: appendNote(trade.notes, `v9.3 broker reconciliation: app showed this trade open, but the connected ${mode} account has no matching broker position. Marked closed/stale.`),
        raw: {
          reconciliation: {
            version: "v9.3",
            mode,
            reason: "no_matching_broker_position",
            reconciledAt: new Date().toISOString(),
          },
        },
      }),
    });
  }

  if (closed > 0) {
    await logBotEvent("broker_reconciliation_closed_stale_trades", `v9.3 broker reconciliation closed ${closed} stale app-open trade record(s).`, { mode, staleSymbols, brokerPositions: positions.map((p) => p.symbol) });
  }

  return {
    ok: true,
    mode,
    checked: openTrades.length,
    closed,
    matched,
    brokerPositions: positions.length,
    staleSymbols,
    message: closed ? `Closed ${closed} stale app-open trade record(s) with no matching broker position.` : "App-open trades match broker positions.",
  };
}

export async function startNewPaperTestDay(mode: AlpacaBrokerMode) {
  if (mode !== "Alpaca Paper") throw new Error("Start new paper test day only works in Alpaca Paper mode.");
  const [snapshot, openTrades] = await Promise.all([
    getBrokerEquitySnapshot(mode),
    supabaseRest<OpenTradeRow[]>("paper_trades?status=eq.Open&select=*&order=created_at.desc&limit=500", { method: "GET" }).catch(() => []),
  ]);

  const now = new Date().toISOString();
  let archived = 0;
  for (const trade of openTrades) {
    archived += 1;
    await supabaseRest(`paper_trades?id=eq.${trade.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        updated_at: now,
        status: "Archived",
        close_time: now,
        broker_status: "archived_new_paper_test_day",
        notes: appendNote(trade.notes, "v9.3 Start new paper test day: archived old app-open trade record. Alpaca Paper account is the clean source of truth."),
      }),
    });
  }

  if (snapshot?.equity) {
    await supabaseRest("bot_control?id=eq.main", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ updated_at: now, starting_equity: snapshot.equity, notes: `v9.3 paper test day reset at ${now}. Broker equity source synced to Alpaca Paper equity ${snapshot.equity.toFixed(2)}.` }),
    }).catch(() => null);
  }

  await logBotEvent("paper_test_day_reset", `v9.3 new paper test day started. Archived ${archived} app-open trade record(s).`, { archived, brokerEquity: snapshot?.equity, brokerBuyingPower: snapshot?.buyingPower });

  return {
    ok: true,
    archived,
    brokerEquity: snapshot?.equity ?? null,
    brokerBuyingPower: snapshot?.buyingPower ?? null,
    message: `Started a new paper test day. Archived ${archived} old app-open record(s).`,
  };
}
