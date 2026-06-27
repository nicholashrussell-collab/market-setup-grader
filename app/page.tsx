"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TradingChart from "@/components/TradingChart";
import { Candle, GradeResult, Timeframe, formatDateTime, gradeSetup } from "@/lib/trading";

type BotEvent = { id: string; created_at: string; event_type: string; message: string };
type PaperTrade = { id: string; created_at: string; symbol: string; bias: string; status: string; entry?: number; stop?: number; target?: number; last_price?: number; unrealized_pnl?: number; result_dollars?: number; result_r?: number; notes?: string };
type CloudBotStatus = {
  ok: boolean;
  configured: boolean;
  message: string;
  market?: { isOpen: boolean; label: string; reason: string };
  settings?: { universeLabel: string; symbols: number; timeframe: string; maxOpenPositions: number; paperTradingEnabled: boolean };
  lastEvent?: BotEvent | null;
  events?: BotEvent[];
  openTrades?: PaperTrade[];
  closedTrades?: PaperTrade[];
  scans?: ScanRun[];
};
type ScanRun = { id: string; created_at: string; universe_label?: string; timeframe?: string; candidates_count?: number; actionable_count?: number };
type ScanSignal = { id: string; symbol: string; score?: number; bias?: string; setup?: string; rr?: number; entry?: number; stop?: number; target?: number; latest_time?: string; stale_minutes?: number; actionable?: boolean; warnings?: string[]; reasons?: string[]; raw?: any };
type LatestSignals = { ok: boolean; configured: boolean; message?: string; scan: ScanRun | null; signals: ScanSignal[] };

function money(value: number) {
  const prefix = value < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function formatPrice(value?: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n >= 100 ? n.toFixed(2) : n.toFixed(3);
}

function StatTile({ label, value, helper, tone }: { label: string; value: string | number; helper?: string; tone?: "good" | "warn" | "bad" }) {
  return <div className={`dash-tile ${tone || ""}`}><span>{label}</span><strong>{value}</strong>{helper ? <small>{helper}</small> : null}</div>;
}

function signalStatus(row: ScanSignal) {
  if (row.actionable) return "Executable paper signal";
  if (row.stale_minutes && row.stale_minutes > 30) return "Blocked: stale / market closed";
  if (row.warnings?.[0]) return row.warnings[0];
  if (row.reasons?.[0]) return row.reasons[0];
  return "Watched";
}

async function fetchBars(symbol: string, timeframe: Timeframe) {
  const params = new URLSearchParams({ symbol, timeframe, mode: "latest", limit: "250" });
  const res = await fetch(`/api/alpaca/bars?${params.toString()}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Could not load chart.");
  return (data.bars || []) as Candle[];
}

export default function PublicDashboard() {
  const [bot, setBot] = useState<CloudBotStatus | null>(null);
  const [latest, setLatest] = useState<LatestSignals | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("SPY");
  const [selectedCandles, setSelectedCandles] = useState<Candle[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeResult | null>(null);
  const [status, setStatus] = useState("Loading autonomous dashboard...");
  const [error, setError] = useState("");
  const chartCache = useRef(new Map<string, { candles: Candle[]; grade: GradeResult | null; loadedAt: number }>());

  const openTrades = bot?.openTrades || [];
  const closedTrades = bot?.closedTrades || [];
  const events = bot?.events || [];
  const scans = bot?.scans || [];
  const signals = latest?.signals || [];
  const latestScan = latest?.scan || scans[0] || null;
  const realizedPnl = closedTrades.reduce((sum, trade) => sum + Number(trade.result_dollars || 0), 0);
  const unrealizedPnl = openTrades.reduce((sum, trade) => sum + Number(trade.unrealized_pnl || 0), 0);
  const paperEquity = 5000 + realizedPnl + unrealizedPnl;
  const selectedSignal = signals.find((s) => s.symbol === selectedSymbol);

  const loadDashboard = useCallback(async () => {
    try {
      const [botRes, latestRes] = await Promise.all([
        fetch("/api/bot/status", { cache: "no-store" }),
        fetch("/api/cloud/latest-signals", { cache: "no-store" }),
      ]);
      const botData = await botRes.json();
      const latestData = await latestRes.json();
      setBot(botData);
      setLatest(latestData);
      const firstSymbol = latestData?.signals?.[0]?.symbol || botData?.openTrades?.[0]?.symbol || selectedSymbol;
      if (firstSymbol && firstSymbol !== selectedSymbol && !selectedCandles.length) setSelectedSymbol(firstSymbol);
      setStatus(`Dashboard synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh dashboard.");
    }
  }, [selectedCandles.length, selectedSymbol]);

  const loadChart = useCallback(async (symbol: string) => {
    const normalized = symbol.toUpperCase();
    setSelectedSymbol(normalized);
    const timeframe = ((bot?.settings?.timeframe || latest?.scan?.timeframe || "15Min") as Timeframe);
    const cacheKey = `${normalized}|${timeframe}`;
    const cached = chartCache.current.get(cacheKey);
    if (cached && Date.now() - cached.loadedAt < 60_000) {
      setSelectedCandles(cached.candles);
      setSelectedGrade(cached.grade);
      return;
    }
    try {
      const candles = await fetchBars(normalized, timeframe);
      const grade = gradeSetup(candles, timeframe, new Date(), { mode: "Structure", fixedR: 1.6, atrMultiple: 2 }, { profile: "Pullback" });
      setSelectedCandles(candles);
      setSelectedGrade(grade);
      chartCache.current.set(cacheKey, { candles, grade, loadedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load chart.");
    }
  }, [bot?.settings?.timeframe, latest?.scan?.timeframe]);

  useEffect(() => {
    void loadDashboard();
    const id = window.setInterval(() => void loadDashboard(), 30_000);
    return () => window.clearInterval(id);
  }, [loadDashboard]);

  useEffect(() => {
    void loadChart(selectedSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  const botRunning = Boolean(bot?.settings?.paperTradingEnabled);
  const marketOpen = Boolean(bot?.market?.isOpen);
  const connected = Boolean(bot?.configured && latest?.configured !== false);

  return (
    <main className="dash-shell public-shell">
      <header className="dash-header hero-readonly">
        <div>
          <span className="eyebrow">Autonomous paper trading viewer</span>
          <h1>Market Setup Grader v7.7</h1>
          <p>This is the read-only dashboard. The cloud bot runs from the scheduled worker, saves its decisions to Supabase, and this page simply watches what happened. Real broker orders are still locked off.</p>
        </div>
        <div className="dash-header-actions">
          <Link className="ghost-link" href="/admin">Admin</Link>
          <Link className="ghost-link" href="/research">Research lab</Link>
        </div>
      </header>

      <section className="console-topline">
        <div className={`console-state ${botRunning ? "armed" : "warn"}`}><span>Autopilot</span><strong>{botRunning ? "Armed for paper" : "Paper entries paused"}</strong><small>{botRunning ? "Cron can open cloud paper trades when rules pass." : "The bot can scan, but paper entries are disabled from admin."}</small></div>
        <div className={`console-state ${marketOpen ? "armed" : "warn"}`}><span>Market</span><strong>{bot?.market?.label || "Loading"}</strong><small>{bot?.market?.reason || "Checking market guard."}</small></div>
        <div className={`console-state ${connected ? "armed" : "warn"}`}><span>Cloud worker</span><strong>{connected ? "Scheduled" : "Not connected"}</strong><small>{bot?.lastEvent ? `Last: ${formatDateTime(bot.lastEvent.created_at)}` : "Waiting for the next cron/manual run."}</small></div>
        <div className="console-state safe"><span>Latest scan</span><strong>{latestScan ? `${latestScan.actionable_count || 0}/${latestScan.candidates_count || 0} actionable` : "No scan yet"}</strong><small>{latestScan ? `${formatDateTime(latestScan.created_at)} · ${latestScan.universe_label || "cloud bot"}` : "Once cron runs, scan quality appears here."}</small></div>
      </section>

      <section className="dash-status-row">
        <StatTile label="Paper equity" value={money(paperEquity)} helper={`${money(realizedPnl)} realized · ${money(unrealizedPnl)} open`} tone={paperEquity >= 5000 ? "good" : "bad"} />
        <StatTile label="Open positions" value={openTrades.length} helper={`${closedTrades.length} recent closed trades loaded`} />
        <StatTile label="Universe" value={bot?.settings?.universeLabel || "—"} helper={`${bot?.settings?.symbols || 0} symbols · ${bot?.settings?.timeframe || "15Min"}`} />
        <StatTile label="Cloud DB" value={connected ? "Connected" : "Not ready"} helper={bot?.message || latest?.message || "Supabase status"} tone={connected ? "good" : "warn"} />
      </section>

      {error ? <div className="error-box">{error}</div> : <div className="execution-note">{status} Public viewers cannot change risk, arm the bot, clear trades, or manually run the worker.</div>}

      <section className="dash-main-grid viewer-grid">
        <div className="dash-left-column">
          <section className="dash-panel chart-panel">
            <div className="panel-heading-row">
              <div><h2>{selectedSymbol} chart</h2><p>{selectedGrade ? `${selectedGrade.bias} · score ${selectedGrade.score} · ${selectedGrade.setupType}` : "Click a signal, open trade, or symbol to inspect."}</p></div>
              <span className="small-pill">Read-only</span>
            </div>
            <TradingChart candles={selectedCandles} grade={selectedGrade} />
          </section>

          <section className="dash-panel">
            <div className="panel-heading-row"><div><h2>Latest ranked signals</h2><p>These are the newest cloud-saved scan results from Supabase.</p></div><span className="small-pill">{signals.length} loaded</span></div>
            <div className="table-wrap compact live-table">
              <table>
                <thead><tr><th>Symbol</th><th>Score</th><th>Bias</th><th>Setup</th><th>R/R</th><th>Entry</th><th>Status</th></tr></thead>
                <tbody>
                  {signals.length ? signals.slice(0, 50).map((row) => (
                    <tr key={row.id} className={`${row.symbol === selectedSymbol ? "selected-row" : ""} ${row.actionable ? "action-row" : ""}`} onClick={() => void loadChart(row.symbol)}>
                      <td><button className="text-button">{row.symbol}</button></td>
                      <td>{row.score ?? "—"}</td>
                      <td>{row.bias || "—"}</td>
                      <td>{row.setup || "—"}</td>
                      <td>{row.rr ? Number(row.rr).toFixed(2) : "—"}</td>
                      <td>{formatPrice(row.entry)}</td>
                      <td>{signalStatus(row)}</td>
                    </tr>
                  )) : <tr><td colSpan={7}>No cloud scan signals yet. Wait for the next cron run or run once from /admin.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="dash-right-column">
          <section className="dash-panel selected-card">
            <h2>{selectedSymbol}</h2>
            <div className="selected-score"><span>{selectedSignal?.score ?? selectedGrade?.score ?? "—"}</span><div><strong>{selectedSignal?.bias || selectedGrade?.bias || "Watch"}</strong><small>{selectedSignal?.setup || selectedGrade?.setupType || "No current signal"}</small></div></div>
            <div className="mini-stack">
              <StatTile label="Entry" value={formatPrice(selectedSignal?.entry ?? selectedGrade?.entry)} />
              <StatTile label="Stop" value={formatPrice(selectedSignal?.stop ?? selectedGrade?.stop)} />
              <StatTile label="Target" value={formatPrice(selectedSignal?.target ?? selectedGrade?.target)} />
              <StatTile label="R/R" value={selectedSignal?.rr ? `${Number(selectedSignal.rr).toFixed(2)}:1` : selectedGrade ? `${selectedGrade.rr}:1` : "—"} />
            </div>
            <p className="setup-summary">{selectedSignal ? signalStatus(selectedSignal) : "No cloud signal selected yet."}</p>
          </section>

          <section className="dash-panel cloud-bot-panel">
            <div className="panel-heading-row"><div><h2>Open cloud paper trades</h2><p>These are server-side paper trades. No broker orders were placed.</p></div><span className="small-pill">{openTrades.length}</span></div>
            <div className="position-list">
              {openTrades.length ? openTrades.map((p) => (
                <div key={p.id} className="position-row open" onClick={() => void loadChart(p.symbol)}>
                  <div><strong>{p.symbol}</strong><span>{p.bias} · cloud paper</span></div>
                  <div><strong>{money(Number(p.unrealized_pnl || 0))}</strong><span>{formatPrice(p.last_price)} last</span></div>
                </div>
              )) : <p className="muted">No open cloud paper trades yet.</p>}
            </div>
          </section>

          <section className="dash-panel">
            <h2>Cloud bot activity</h2>
            <div className="activity-list">
              {events.length ? events.slice(0, 12).map((event) => <div key={event.id}>{formatDateTime(event.created_at)} · {event.message}</div>) : <p className="muted">No cloud events yet.</p>}
            </div>
          </section>

          <section className="dash-panel">
            <h2>Recent closed trades</h2>
            <div className="position-list">
              {closedTrades.length ? closedTrades.slice(0, 10).map((p) => (
                <div key={p.id} className="position-row closed" onClick={() => void loadChart(p.symbol)}>
                  <div><strong>{p.symbol}</strong><span>{p.bias} · {p.notes || "closed"}</span></div>
                  <div><strong>{money(Number(p.result_dollars || 0))}</strong><span>{p.result_r !== undefined ? `${p.result_r}R` : "closed"}</span></div>
                </div>
              )) : <p className="muted">No closed cloud paper trades loaded.</p>}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
