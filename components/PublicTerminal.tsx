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
  settings?: {
    enabled?: boolean;
    universeLabel: string;
    symbols: number;
    timeframe: string;
    maxOpenPositions: number;
    paperTradingEnabled: boolean;
    startingEquity?: number;
    riskPct?: number;
    scanLimit?: number;
    minScore?: number;
    maxScore?: number;
    minRR?: number;
    maxStaleMinutes?: number;
    allowStaleSimulation?: boolean;
  };
  lastEvent?: BotEvent | null;
  events?: BotEvent[];
  openTrades?: PaperTrade[];
  closedTrades?: PaperTrade[];
  scans?: ScanRun[];
};
type ScanRun = { id: string; created_at: string; universe_label?: string; timeframe?: string; symbols_count?: number; candidates_count?: number; actionable_count?: number; source?: string; reason?: string };
type ScanSignal = { id: string; symbol: string; score?: number; bias?: string; setup?: string; rr?: number; entry?: number; stop?: number; target?: number; latest_time?: string; stale_minutes?: number; actionable?: boolean; warnings?: string[]; reasons?: string[]; raw?: any };
type LatestSignals = { ok: boolean; configured: boolean; message?: string; scan: ScanRun | null; signals: ScanSignal[]; displayed?: number; requestedLimit?: number; totalCandidates?: number };

type ActiveView = "overview" | "chart" | "signals" | "positions" | "activity";

const navItems: { id: ActiveView; label: string; href: string; helper: string }[] = [
  { id: "overview", label: "Home", href: "/", helper: "System status" },
  { id: "chart", label: "Chart Desk", href: "/chart-desk", helper: "Inspect setups" },
  { id: "signals", label: "Signals", href: "/signals", helper: "Ranked watchlist" },
  { id: "positions", label: "Positions", href: "/positions", helper: "Paper portfolio" },
  { id: "activity", label: "Activity", href: "/activity", helper: "Bot timeline" },
];

function money(value: number) {
  const prefix = value < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function formatPrice(value?: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n >= 100 ? n.toFixed(2) : n.toFixed(3);
}

function percent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function StatTile({ label, value, helper, tone }: { label: string; value: string | number; helper?: string; tone?: "good" | "warn" | "bad" }) {
  return <div className={`dash-tile ${tone || ""}`}><span>{label}</span><strong>{value}</strong>{helper ? <small>{helper}</small> : null}</div>;
}

function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "neutral" | "info" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

function signalStatus(row: ScanSignal) {
  if (row.actionable) return "Executable paper signal";
  if (row.stale_minutes && row.stale_minutes > 30) return "Blocked: stale / market closed";
  if (row.warnings?.[0]) return row.warnings[0];
  if (row.reasons?.[0]) return row.reasons[0];
  return "Watched";
}

function signalTone(row: ScanSignal): "good" | "warn" | "bad" | "neutral" {
  if (row.actionable) return "good";
  if (row.stale_minutes && row.stale_minutes > 30) return "warn";
  if (row.warnings?.[0]) return "bad";
  return "neutral";
}

function cleanUniverseLabel(label?: string) {
  return (label || "—").replace(/ · v\d+\.\d+.*$/i, "");
}

async function fetchBars(symbol: string, timeframe: Timeframe) {
  const params = new URLSearchParams({ symbol, timeframe, mode: "latest", limit: "250" });
  const res = await fetch(`/api/alpaca/bars?${params.toString()}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Could not load chart.");
  return (data.bars || []) as Candle[];
}

export default function PublicTerminal({ activeView = "overview" }: { activeView?: ActiveView }) {
  const [bot, setBot] = useState<CloudBotStatus | null>(null);
  const [latest, setLatest] = useState<LatestSignals | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("SPY");
  const [selectedCandles, setSelectedCandles] = useState<Candle[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeResult | null>(null);
  const [status, setStatus] = useState("Loading autonomous dashboard...");
  const [error, setError] = useState("");
  const [signalLimit, setSignalLimit] = useState(activeView === "signals" ? 250 : 100);
  const chartCache = useRef(new Map<string, { candles: Candle[]; grade: GradeResult | null; loadedAt: number }>());

  const openTrades = bot?.openTrades || [];
  const closedTrades = bot?.closedTrades || [];
  const events = bot?.events || [];
  const scans = bot?.scans || [];
  const signals = latest?.signals || [];
  const latestScan = latest?.scan || scans[0] || null;
  const lastBotEvent = bot?.lastEvent || null;
  const startingEquity = Number(bot?.settings?.startingEquity || 5000);
  const realizedPnl = closedTrades.reduce((sum, trade) => sum + Number(trade.result_dollars || 0), 0);
  const unrealizedPnl = openTrades.reduce((sum, trade) => sum + Number(trade.unrealized_pnl || 0), 0);
  const paperEquity = startingEquity + realizedPnl + unrealizedPnl;
  const returnPct = startingEquity ? ((paperEquity - startingEquity) / startingEquity) * 100 : 0;
  const selectedSignal = signals.find((s) => s.symbol === selectedSymbol);

  const scanStats = useMemo(() => {
    const total = Number(latestScan?.candidates_count || latest?.totalCandidates || signals.length || 0);
    const actionable = Number(latestScan?.actionable_count || signals.filter((s) => s.actionable).length || 0);
    const stale = signals.filter((s) => s.stale_minutes && s.stale_minutes > 30).length;
    const shown = signals.length;
    return { total, actionable, stale, shown };
  }, [latestScan, latest, signals]);

  const loadDashboard = useCallback(async () => {
    try {
      const [botRes, latestRes] = await Promise.all([
        fetch("/api/bot/status", { cache: "no-store" }),
        fetch(`/api/cloud/latest-signals?limit=${signalLimit}`, { cache: "no-store" }),
      ]);
      const botData = await botRes.json();
      const latestData = await latestRes.json();
      setBot(botData);
      setLatest(latestData);
      const firstSymbol = latestData?.signals?.[0]?.symbol || botData?.openTrades?.[0]?.symbol || selectedSymbol;
      if (firstSymbol && firstSymbol !== selectedSymbol && !selectedCandles.length) setSelectedSymbol(firstSymbol);
      setStatus(`Synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}. Viewer is read-only.`);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh dashboard.");
    }
  }, [selectedCandles.length, selectedSymbol, signalLimit]);

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

  const botEngineRunning = bot?.settings?.enabled !== false;
  const paperArmed = Boolean(bot?.settings?.paperTradingEnabled);
  const marketOpen = Boolean(bot?.market?.isOpen);
  const connected = Boolean(bot?.configured && latest?.configured !== false);
  const selectedStatus = selectedSignal ? signalStatus(selectedSignal) : "No cloud signal selected yet.";
  const currentUniverse = bot?.settings?.universeLabel || "—";
  const currentTimeframe = bot?.settings?.timeframe || "15Min";
  const currentScanLimit = bot?.settings?.scanLimit || bot?.settings?.symbols || 0;
  const latestScanUniverse = cleanUniverseLabel(latestScan?.universe_label);
  const latestScanTime = latestScan?.created_at ? formatDateTime(latestScan.created_at) : "No saved scan yet";
  const scanUniverseDiffers = Boolean(latestScan && latestScanUniverse !== "—" && currentUniverse !== "—" && latestScanUniverse !== currentUniverse);
  const scanSourceNote = scanUniverseDiffers
    ? `Latest saved scan used ${latestScanUniverse}; current admin rules are ${currentUniverse}. The saved scan will update after the next completed scan.`
    : "Latest saved scan matches the current saved-scan source, or no saved scan is loaded yet.";
  const activeLabel = navItems.find((item) => item.id === activeView)?.label || "Home";

  const metrics = (
    <>
      <section className="viewer-metrics-grid">
        <StatTile label="Bot engine" value={botEngineRunning ? "Running" : "Paused"} helper={botEngineRunning ? "Cron can run scheduled cycles." : "Cron will skip until resumed in admin."} tone={botEngineRunning ? "good" : "warn"} />
        <StatTile label="Paper execution" value={paperArmed ? "Armed" : "Disarmed"} helper={paperArmed ? "Paper trades may open when rules pass." : "Scanning is allowed; entries are blocked."} tone={paperArmed ? "good" : "warn"} />
        <StatTile label="Market" value={bot?.market?.label || "Loading"} helper={bot?.market?.reason || "Checking market guard."} tone={marketOpen ? "good" : "warn"} />
        <StatTile label="Cloud DB" value={connected ? "Connected" : "Not ready"} helper={bot?.message || latest?.message || "Supabase status"} tone={connected ? "good" : "warn"} />
      </section>

      <section className="viewer-metrics-grid secondary-metrics">
        <StatTile label="Paper equity" value={money(paperEquity)} helper={`${percent(returnPct)} total · ${money(realizedPnl)} realized · ${money(unrealizedPnl)} open`} tone={paperEquity >= startingEquity ? "good" : "bad"} />
        <StatTile label="Open cloud trades" value={openTrades.length} helper={`${closedTrades.length} recent closed trades loaded`} />
        <StatTile label="Latest bot run" value={lastBotEvent ? formatDateTime(lastBotEvent.created_at) : "Waiting"} helper={lastBotEvent?.event_type || "No event yet"} />
        <StatTile label="Latest saved scan" value={`${scanStats.actionable}/${scanStats.total} actionable`} helper={`${latestScanTime} · ${latestScanUniverse}`} tone={scanStats.actionable > 0 ? "good" : "warn"} />
      </section>
    </>
  );

  const chartPanel = (
    <section id="chart" className="dash-panel chart-panel pro-chart-panel clean-chart-card">
      <div className="panel-heading-row"><div><h2>{selectedSymbol} chart</h2><p>{selectedGrade ? `${selectedGrade.bias} · score ${selectedGrade.score} · ${selectedGrade.setupType}` : "Click a signal, open trade, or symbol to inspect."}</p></div><div className="panel-actions-mini"><StatusBadge tone="info">Read-only</StatusBadge>{selectedSignal ? <StatusBadge tone={signalTone(selectedSignal)}>{selectedStatus}</StatusBadge> : null}</div></div>
      <TradingChart candles={selectedCandles} grade={selectedGrade} />
    </section>
  );

  const signalsPanel = (
    <section id="signals" className="dash-panel signals-panel-v79">
      <div className="signals-toolbar">
        <div><h2>Latest ranked signals</h2><p>Showing the top saved signals from the latest completed scan. This table includes its own scan timestamp so an old saved scan does not get confused with current admin settings.</p></div>
        <div className="toolbar-controls"><span className="small-pill">Top {signals.length} of {scanStats.total || signals.length}</span><select value={signalLimit} onChange={(e) => setSignalLimit(Number(e.target.value))} aria-label="Signal display limit"><option value={50}>Top 50</option><option value={100}>Top 100</option><option value={250}>Top 250</option><option value={500}>Top 500</option></select></div>
      </div>
      <div className="scan-clarity-row"><span>Current rules: <b>{currentUniverse}</b></span><span>Latest saved scan: <b>{latestScanUniverse}</b></span><span>Scan updated: <b>{latestScanTime}</b></span><span>Scan candidates: <b>{scanStats.total}</b></span><span>Executable: <b>{scanStats.actionable}</b></span><span>Displayed: <b>{signals.length}</b></span></div>{scanUniverseDiffers ? <div className="context-callout warn-callout">{scanSourceNote}</div> : <div className="context-callout">{scanSourceNote}</div>}
      <div className="table-wrap compact live-table pro-table signals-table-wrap">
        <table><thead><tr><th>Symbol</th><th>Score</th><th>Bias</th><th>Setup</th><th>R/R</th><th>Entry</th><th>Status</th></tr></thead><tbody>
          {signals.length ? signals.map((row) => (<tr key={row.id} className={`${row.symbol === selectedSymbol ? "selected-row" : ""} ${row.actionable ? "action-row" : ""}`} onClick={() => void loadChart(row.symbol)}><td><button className="text-button">{row.symbol}</button></td><td>{row.score ?? "—"}</td><td>{row.bias || "—"}</td><td>{row.setup || "—"}</td><td>{row.rr ? Number(row.rr).toFixed(2) : "—"}</td><td>{formatPrice(row.entry)}</td><td><StatusBadge tone={signalTone(row)}>{signalStatus(row)}</StatusBadge></td></tr>)) : <tr><td colSpan={7}>No cloud scan signals yet. Wait for the next cron run or run once from /admin.</td></tr>}
        </tbody></table>
      </div>
    </section>
  );

  const positionsPanel = (
    <section className="dashboard-page-stack">
      <section className="viewer-metrics-grid secondary-metrics">
        <StatTile label="Paper equity" value={money(paperEquity)} helper={`${percent(returnPct)} total return from the paper tracker`} tone={paperEquity >= startingEquity ? "good" : "bad"} />
        <StatTile label="Open trades" value={openTrades.length} helper="Server-side positions stored in Supabase" />
        <StatTile label="Realized P/L" value={money(realizedPnl)} helper={`${closedTrades.length} recent closed trades loaded`} tone={realizedPnl >= 0 ? "good" : "bad"} />
        <StatTile label="Unrealized P/L" value={money(unrealizedPnl)} helper="Open paper trade mark-to-market" tone={unrealizedPnl >= 0 ? "good" : "bad"} />
      </section>
      <section className="dash-panel"><div className="panel-heading-row"><div><h2>Open cloud paper trades</h2><p>These are server-side paper trades only. No broker orders are placed.</p></div><span className="small-pill">{openTrades.length}</span></div><div className="position-list page-position-list">{openTrades.length ? openTrades.map((p) => (<div key={p.id} className="position-row open" onClick={() => void loadChart(p.symbol)}><div><strong>{p.symbol}</strong><span>{p.bias} · cloud paper · opened {formatDateTime(p.created_at)}</span></div><div><strong>{money(Number(p.unrealized_pnl || 0))}</strong><span>{formatPrice(p.last_price)} last</span></div></div>)) : <p className="muted">No open cloud paper trades yet.</p>}</div></section>
      <section className="dash-panel"><div className="panel-heading-row"><div><h2>Recent closed trades</h2><p>Closed paper outcomes loaded from Supabase.</p></div><span className="small-pill">{closedTrades.length}</span></div><div className="position-list page-position-list">{closedTrades.length ? closedTrades.slice(0, 30).map((p) => (<div key={p.id} className="position-row closed" onClick={() => void loadChart(p.symbol)}><div><strong>{p.symbol}</strong><span>{p.bias} · {p.notes || "closed"}</span></div><div><strong>{money(Number(p.result_dollars || 0))}</strong><span>{p.result_r !== undefined ? `${p.result_r}R` : "closed"}</span></div></div>)) : <p className="muted">No closed cloud paper trades loaded.</p>}</div></section>
    </section>
  );

  const activityPanel = (
    <section className="dashboard-page-stack">
      <section className="dash-panel"><div className="panel-heading-row"><div><h2>Cloud bot activity</h2><p>Every scheduled and manual cloud-worker event appears here. This is the best place to verify that the system is running without you clicking anything.</p></div><span className="small-pill">{events.length} loaded</span></div><div className="activity-list timeline-list page-activity-list">{events.length ? events.slice(0, 40).map((event) => <div key={event.id}><b>{formatDateTime(event.created_at)} · {event.event_type}</b><span>{event.message}</span></div>) : <p className="muted">No cloud events yet.</p>}</div></section>
      <section className="dash-panel"><div className="panel-heading-row"><div><h2>Recent saved scans</h2><p>Completed scan records are separate from skipped bot events. If the market is closed, the bot can keep logging runs while the saved scan stays older.</p></div></div><div className="cloud-mini-list">{scans.length ? scans.slice(0, 12).map((scan) => <div key={scan.id}><strong>{formatDateTime(scan.created_at)} · {cleanUniverseLabel(scan.universe_label)}</strong><span>{scan.candidates_count || 0} candidates · {scan.actionable_count || 0} executable · {scan.timeframe || currentTimeframe}</span></div>) : <p className="muted">No recent saved scans loaded.</p>}</div></section>
    </section>
  );

  const overviewPanel = (
    <section className="dashboard-page-stack">
      {metrics}
      {error ? <div className="error-box">{error}</div> : <div className="execution-note upgraded-note">{status} Latest bot run and latest saved scan are separate. If the market is closed, cron can still run while the saved scan remains older.</div>}
      <div className="overview-grid-v81">
        {chartPanel}
        <section className="dash-panel system-snapshot-card"><h2>System snapshot</h2><div className="rule-stack"><div><span>Mode</span><strong>Autonomous cloud paper bot</strong><small>Cron runs every 15 minutes; viewer is read-only.</small></div><div><span>Active rules</span><strong>{currentUniverse}</strong><small>{currentScanLimit} max symbols · {currentTimeframe} · scores {bot?.settings?.minScore ?? 80}-{bot?.settings?.maxScore ?? 89}</small></div><div><span>Risk controls</span><strong>{bot?.settings?.riskPct || 1}% per paper trade</strong><small>{bot?.settings?.maxOpenPositions || 4} max open · min R/R {bot?.settings?.minRR || 1} · stale guard {bot?.settings?.maxStaleMinutes || 30} min</small></div><div><span>Research basis</span><strong>Active-only pullback/reclaim</strong><small>No sleeve, no real broker orders, cloud-paper validation first.</small></div></div></section>
      </div>
      {signalsPanel}
    </section>
  );

  return (
    <main className="dash-shell public-shell viewer-v79 viewer-v80 viewer-v81">
      <div className="terminal-workspace pro-app-shell">
        <aside className="viewer-sidebar" aria-label="Viewer navigation">
          <div className="sidebar-brand">
            <span className="brand-mark">MSG</span>
            <div><strong>Setup Grader</strong><small>Autonomous paper viewer</small></div>
          </div>
          <nav className="sidebar-nav route-nav">
            {navItems.map((item) => <Link key={item.id} href={item.href} className={activeView === item.id ? "active" : ""}><span>{item.label}</span><small>{item.helper}</small></Link>)}
          </nav>
          <div className="sidebar-system-card">
            <span className={`state-dot ${botEngineRunning ? "good" : "warn"}`} />
            <div><strong>{botEngineRunning ? "Engine running" : "Engine paused"}</strong><small>{paperArmed ? "Paper entries armed" : "Paper entries disarmed"}</small></div>
          </div>
          <div className="sidebar-links">
            <Link className="ghost-link compact-link" href="/admin">Admin login</Link>
            <Link className="ghost-link compact-link" href="/research">Research lab</Link>
          </div>
        </aside>

        <section className="viewer-main-area page-viewer-main">
          <header className="viewer-topbar page-header-v81">
            <div>
              <div className="viewer-version-row"><span className="eyebrow">Autonomous paper trading viewer</span><StatusBadge tone="info">v8.1</StatusBadge><StatusBadge tone="good">Read-only</StatusBadge></div>
              <h1>{activeLabel}</h1>
              <p>{activeView === "overview" ? "A professional monitoring desk for the scheduled cloud paper bot. The public site is view-only; the private admin page controls settings and execution." : "This page is part of the read-only viewer. Use the left navigation to move between dashboard sections without changing the bot."}</p>
            </div>
            <div className="topbar-rule-card"><span>Current admin rules</span><strong>{currentUniverse}</strong><small>{currentScanLimit} max symbols · {currentTimeframe} · {bot?.settings?.riskPct || 1}% risk · {bot?.settings?.maxOpenPositions || 4} max open</small></div>
          </header>

          {activeView === "overview" ? overviewPanel : null}
          {activeView === "chart" ? <section className="dashboard-page-stack">{metrics}{error ? <div className="error-box">{error}</div> : <div className="execution-note upgraded-note">{status}</div>}{chartPanel}</section> : null}
          {activeView === "signals" ? <section className="dashboard-page-stack">{metrics}{signalsPanel}</section> : null}
          {activeView === "positions" ? positionsPanel : null}
          {activeView === "activity" ? activityPanel : null}
        </section>

        <aside className="viewer-inspector" aria-label="Signal inspector">
          <section className="dash-panel selected-card pro-selected-card inspector-card"><h2>{selectedSymbol}</h2><div className="selected-score"><span>{selectedSignal?.score ?? selectedGrade?.score ?? "—"}</span><div><strong>{selectedSignal?.bias || selectedGrade?.bias || "Watch"}</strong><small>{selectedSignal?.setup || selectedGrade?.setupType || "No current signal"}</small></div></div><div className="mini-stack"><StatTile label="Entry" value={formatPrice(selectedSignal?.entry ?? selectedGrade?.entry)} /><StatTile label="Stop" value={formatPrice(selectedSignal?.stop ?? selectedGrade?.stop)} /><StatTile label="Target" value={formatPrice(selectedSignal?.target ?? selectedGrade?.target)} /><StatTile label="R/R" value={selectedSignal?.rr ? `${Number(selectedSignal.rr).toFixed(2)}:1` : selectedGrade ? `${selectedGrade.rr}:1` : "—"} /></div><p className="setup-summary">{selectedStatus}</p></section>

          <section className="dash-panel inspector-card system-snapshot-card compact-snapshot-v81">
            <h2>System snapshot</h2>
            <div className="rule-stack">
              <div><span>Mode</span><strong>Autonomous cloud paper bot</strong><small>Cron every 15 min; viewer is read-only.</small></div>
              <div><span>Active rules</span><strong>{currentUniverse}</strong><small>{currentScanLimit} max · {currentTimeframe}</small></div>
              <div><span>Risk</span><strong>{bot?.settings?.riskPct || 1}% per paper trade</strong><small>{bot?.settings?.maxOpenPositions || 4} max open · min R/R {bot?.settings?.minRR || 1}</small></div>
            </div>
          </section>

          <section id="positions" className="dash-panel cloud-bot-panel inspector-card"><div className="panel-heading-row"><div><h2>Open cloud paper trades</h2><p>Server-side paper trades saved in Supabase. No broker orders.</p></div><span className="small-pill">{openTrades.length}</span></div><div className="position-list">{openTrades.length ? openTrades.map((p) => (<div key={p.id} className="position-row open" onClick={() => void loadChart(p.symbol)}><div><strong>{p.symbol}</strong><span>{p.bias} · cloud paper</span></div><div><strong>{money(Number(p.unrealized_pnl || 0))}</strong><span>{formatPrice(p.last_price)} last</span></div></div>)) : <p className="muted">No open cloud paper trades yet.</p>}</div></section>

          <section id="activity" className="dash-panel event-panel-v78 inspector-card"><div className="panel-heading-row"><div><h2>Cloud bot activity</h2><p>Every cron/manual event appears here.</p></div></div><div className="activity-list timeline-list">{events.length ? events.slice(0, 12).map((event) => <div key={event.id}><b>{formatDateTime(event.created_at)}</b><span>{event.message}</span></div>) : <p className="muted">No cloud events yet.</p>}</div></section>
        </aside>
      </div>
    </main>
  );
}
