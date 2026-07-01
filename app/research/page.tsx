"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { DEFAULT_TRACKED_SYMBOLS, parseTrackedSymbols } from "@/lib/watchlist";
import {
  BacktestSettings,
  BacktestSummary,
  Candle,
  DirectionFilter,
  GradeProfile,
  LeaderExitMode,
  RealisticAccountType,
  RegimeFilter,
  SessionFilter,
  SetupTypeFilter,
  StrategyEngine,
  Timeframe,
  runBacktest,
} from "@/lib/trading";

type BotSettings = {
  symbolsList?: string[];
  customSymbols?: string;
  timeframe?: Timeframe;
  minScore?: number;
  maxScore?: number;
  minRR?: number;
  scanLimit?: number;
  riskPct?: number;
  maxOpenPositions?: number;
  maxNewTradesPerRun?: number;
  maxTotalOpenRiskPct?: number;
  targetMode?: string;
  fixedTargetR?: number;
  gradeProfile?: GradeProfile;
  directionFilter?: DirectionFilter;
  regimeFilter?: RegimeFilter;
  sessionFilter?: SessionFilter;
  setupTypeFilter?: SetupTypeFilter;
  strategyEngine?: StrategyEngine;
  leaderExitMode?: LeaderExitMode;
  cooldownMinutes?: number;
  maxBarsToHold?: number;
  warmupBars?: number;
  maxPositionPct?: number;
  accountType?: RealisticAccountType;
  marginMultiplier?: number;
  allowFractionalShares?: boolean;
  allowShorts?: boolean;
  openStartMinutesEt?: number;
  openEndMinutesEt?: number;
};

type BotStatus = { ok: boolean; settings?: BotSettings };
type ProgressState = { running: boolean; current: number; total: number; symbol: string; message: string };
type ResearchForm = {
  timeframe: Timeframe;
  start: string;
  end: string;
  startingCapital: number;
  symbolsText: string;
  scanLimit: number;
  minScore: number;
  maxScore: number;
  minRR: number;
  fixedTargetR: number;
  riskPct: number;
  maxOpenTrades: number;
  maxNewTradesPerRun: number;
  maxTotalOpenRiskPct: number;
  cooldownMinutes: number;
  maxBarsToHold: number;
  warmupBars: number;
  maxPositionPct: number;
  entryStart: number;
  entryEnd: number;
  gradeProfile: GradeProfile;
  directionFilter: DirectionFilter;
  regimeFilter: RegimeFilter;
  sessionFilter: SessionFilter;
  setupTypeFilter: SetupTypeFilter;
  strategyEngine: StrategyEngine;
  leaderExitMode: LeaderExitMode;
  accountType: RealisticAccountType;
  marginMultiplier: number;
  allowFractionalShares: boolean;
  allowShorts: boolean;
};

type SymbolResult = {
  symbol: string;
  candles: number;
  trades: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  avgR: number;
  totalR: number;
  profitFactor: number;
  maxDrawdownR: number;
  returnPct: number;
};

type AggregateResult = {
  symbolsTested: number;
  symbolsWithTrades: number;
  candleCount: number;
  trades: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  totalR: number;
  avgR: number;
  positiveR: number;
  negativeR: number;
  profitFactor: number;
  avgReturnPct: number;
  best: SymbolResult[];
  worst: SymbolResult[];
  scoreBuckets: { label: string; trades: number; winRate: number; avgR: number; totalR: number; profitFactor: number }[];
  recentErrors: string[];
};

const DEFAULTS = {
  timeframe: "15Min" as Timeframe,
  start: "2026-05-31",
  end: new Date().toISOString().slice(0, 10),
  startingCapital: 100000,
  scanLimit: 100,
  minScore: 60,
  maxScore: 100,
  minRR: 1,
  fixedTargetR: 2.5,
  riskPct: 0.25,
  maxOpenTrades: 4,
  maxNewTradesPerRun: 1,
  maxTotalOpenRiskPct: 2,
  cooldownMinutes: 60,
  maxBarsToHold: 120,
  warmupBars: 200,
  maxPositionPct: 25,
  entryStart: 690,
  entryEnd: 960,
};

function defaultForm(): ResearchForm {
  return {
    timeframe: DEFAULTS.timeframe,
    start: DEFAULTS.start,
    end: DEFAULTS.end,
    startingCapital: DEFAULTS.startingCapital,
    symbolsText: DEFAULT_TRACKED_SYMBOLS,
    scanLimit: DEFAULTS.scanLimit,
    minScore: DEFAULTS.minScore,
    maxScore: DEFAULTS.maxScore,
    minRR: DEFAULTS.minRR,
    fixedTargetR: DEFAULTS.fixedTargetR,
    riskPct: DEFAULTS.riskPct,
    maxOpenTrades: DEFAULTS.maxOpenTrades,
    maxNewTradesPerRun: DEFAULTS.maxNewTradesPerRun,
    maxTotalOpenRiskPct: DEFAULTS.maxTotalOpenRiskPct,
    cooldownMinutes: DEFAULTS.cooldownMinutes,
    maxBarsToHold: DEFAULTS.maxBarsToHold,
    warmupBars: DEFAULTS.warmupBars,
    maxPositionPct: DEFAULTS.maxPositionPct,
    entryStart: DEFAULTS.entryStart,
    entryEnd: DEFAULTS.entryEnd,
    gradeProfile: "Pullback",
    directionFilter: "Long",
    regimeFilter: "Off",
    sessionFilter: "MiddayAfternoon",
    setupTypeFilter: "AdaptiveBest",
    strategyEngine: "UniversalAdaptiveProV3",
    leaderExitMode: "Fixed",
    accountType: "Cash",
    marginMultiplier: 1,
    allowFractionalShares: true,
    allowShorts: false,
  };
}

function num(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function pct(value: number) { return `${value.toFixed(2)}%`; }
function fmt(value: number, digits = 2) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }
function minutesToEt(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix} ET`;
}
function barsUrl(symbol: string, timeframe: Timeframe, start: string, end: string) {
  const startIso = new Date(`${start}T00:00:00-04:00`).toISOString();
  const endIso = new Date(`${end}T23:59:59-04:00`).toISOString();
  const url = new URL("/api/alpaca/bars", window.location.origin);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("mode", "range");
  url.searchParams.set("start", startIso);
  url.searchParams.set("end", endIso);
  url.searchParams.set("adjustment", "split");
  url.searchParams.set("limit", "10000");
  return `${url.pathname}${url.search}`;
}
async function fetchCandles(symbol: string, timeframe: Timeframe, start: string, end: string): Promise<Candle[]> {
  const res = await fetch(barsUrl(symbol, timeframe, start, end), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
  return data.bars || [];
}
function makeSettings(symbol: string, form: ResearchForm): BacktestSettings {
  return {
    symbol,
    timeframe: form.timeframe,
    minScore: form.minScore,
    maxScore: form.maxScore,
    minRR: form.minRR,
    cooldownMinutes: form.cooldownMinutes,
    maxBarsToHold: form.maxBarsToHold,
    warmupBars: form.warmupBars,
    onePositionAtATime: form.maxOpenTrades === 1,
    maxOpenTrades: form.maxOpenTrades,
    maxTotalOpenRiskPct: form.maxTotalOpenRiskPct,
    noOvernight: false,
    targetSettings: { mode: "FixedR", fixedR: form.fixedTargetR, atrMultiple: 2 },
    gradeSettings: { profile: form.gradeProfile },
    directionFilter: form.directionFilter,
    sessionFilter: form.sessionFilter,
    regimeFilter: form.regimeFilter,
    setupTypeFilter: form.setupTypeFilter,
    strategyEngine: form.strategyEngine,
    leaderExitMode: form.leaderExitMode,
    requestedStart: new Date(`${form.start}T00:00:00-04:00`).toISOString(),
    requestedEnd: new Date(`${form.end}T23:59:59-04:00`).toISOString(),
    portfolioSettings: { startingBalance: form.startingCapital, riskModel: "Percent", riskPercent: form.riskPct, fixedRiskDollars: 50 },
    realisticSettings: {
      enabled: true,
      accountType: form.accountType,
      allowFractionalShares: form.allowFractionalShares,
      allowShorts: form.allowShorts,
      marginMultiplier: form.marginMultiplier,
      maxPositionPct: form.maxPositionPct,
    },
  };
}
function symbolResult(symbol: string, summary: BacktestSummary, candles: number): SymbolResult {
  return { symbol, candles, trades: summary.totalTrades, wins: summary.wins, losses: summary.losses, timeouts: summary.timeouts, winRate: summary.winRate, avgR: summary.avgR, totalR: summary.cumulativeR, profitFactor: summary.profitFactor, maxDrawdownR: summary.maxDrawdownR, returnPct: summary.portfolio.returnPct };
}
function aggregate(results: SymbolResult[], summaries: BacktestSummary[], errors: string[]): AggregateResult {
  const traded = results.filter((r) => r.trades > 0);
  const trades = results.reduce((s, r) => s + r.trades, 0);
  const wins = results.reduce((s, r) => s + r.wins, 0);
  const losses = results.reduce((s, r) => s + r.losses, 0);
  const timeouts = results.reduce((s, r) => s + r.timeouts, 0);
  const totalR = results.reduce((s, r) => s + r.totalR, 0);
  const positiveR = results.reduce((s, r) => s + Math.max(0, r.totalR), 0);
  const negativeR = results.reduce((s, r) => s + Math.min(0, r.totalR), 0);
  const scoreMap = new Map<string, { label: string; trades: number; wins: number; positiveR: number; negativeR: number; totalR: number }>();
  summaries.forEach((summary) => summary.scoreRanges.forEach((bucket) => {
    const current = scoreMap.get(bucket.label) || { label: bucket.label, trades: 0, wins: 0, positiveR: 0, negativeR: 0, totalR: 0 };
    current.trades += bucket.trades;
    current.wins += bucket.wins;
    current.positiveR += bucket.positiveR;
    current.negativeR += bucket.negativeR;
    current.totalR += bucket.cumulativeR;
    scoreMap.set(bucket.label, current);
  }));
  return {
    symbolsTested: results.length,
    symbolsWithTrades: traded.length,
    candleCount: results.reduce((s, r) => s + r.candles, 0),
    trades, wins, losses, timeouts,
    winRate: trades ? (wins / trades) * 100 : 0,
    totalR,
    avgR: trades ? totalR / trades : 0,
    positiveR,
    negativeR,
    profitFactor: Math.abs(negativeR) > 0 ? positiveR / Math.abs(negativeR) : positiveR > 0 ? 99 : 0,
    avgReturnPct: traded.length ? traded.reduce((s, r) => s + r.returnPct, 0) / traded.length : 0,
    best: [...results].sort((a, b) => b.totalR - a.totalR).slice(0, 10),
    worst: [...results].sort((a, b) => a.totalR - b.totalR).slice(0, 10),
    scoreBuckets: Array.from(scoreMap.values()).map((b) => ({ label: b.label, trades: b.trades, winRate: b.trades ? (b.wins / b.trades) * 100 : 0, avgR: b.trades ? b.totalR / b.trades : 0, totalR: b.totalR, profitFactor: Math.abs(b.negativeR) > 0 ? b.positiveR / Math.abs(b.negativeR) : b.positiveR > 0 ? 99 : 0 })),
    recentErrors: errors.slice(-8),
  };
}
function SmallMetric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return <div className="dash-tile info"><span>{label}</span><strong>{value}</strong>{helper ? <small>{helper}</small> : null}</div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label>{label}{children}</label>; }

export default function ResearchPage() {
  const [form, setForm] = useState<ResearchForm>(() => defaultForm());
  const [adminLoaded, setAdminLoaded] = useState(false);
  const [status, setStatus] = useState("Ready to backtest an Admin-style profile.");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProgressState>({ running: false, current: 0, total: 0, symbol: "", message: "Idle" });
  const [rows, setRows] = useState<SymbolResult[]>([]);
  const [summary, setSummary] = useState<AggregateResult | null>(null);
  const symbols = useMemo(() => parseTrackedSymbols(form.symbolsText, 1000), [form.symbolsText]);
  const activeSymbols = useMemo(() => symbols.slice(0, Math.max(1, form.scanLimit)), [symbols, form.scanLimit]);
  const progressPct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;
  function patch(patchValue: Partial<ResearchForm>) { setForm((prev) => ({ ...prev, ...patchValue })); }
  async function loadAdminProfile() {
    setError(""); setStatus("Loading current Admin profile for backtest...");
    try {
      const res = await fetch("/api/bot/status", { cache: "no-store" });
      const data = (await res.json()) as BotStatus;
      if (!res.ok || !data.settings) throw new Error("Could not load current Admin settings.");
      const s = data.settings;
      patch({
        timeframe: s.timeframe || form.timeframe,
        symbolsText: s.customSymbols || (s.symbolsList || []).join(", ") || DEFAULT_TRACKED_SYMBOLS,
        scanLimit: num(s.scanLimit, form.scanLimit),
        minScore: num(s.minScore, form.minScore),
        maxScore: num(s.maxScore, form.maxScore),
        minRR: num(s.minRR, form.minRR),
        fixedTargetR: num(s.fixedTargetR, form.fixedTargetR),
        riskPct: num(s.riskPct, form.riskPct),
        maxOpenTrades: num(s.maxOpenPositions, form.maxOpenTrades),
        maxNewTradesPerRun: num(s.maxNewTradesPerRun, form.maxNewTradesPerRun),
        maxTotalOpenRiskPct: num(s.maxTotalOpenRiskPct, form.maxTotalOpenRiskPct),
        cooldownMinutes: num(s.cooldownMinutes, form.cooldownMinutes),
        maxBarsToHold: num(s.maxBarsToHold, form.maxBarsToHold),
        warmupBars: num(s.warmupBars, form.warmupBars),
        maxPositionPct: num(s.maxPositionPct, form.maxPositionPct),
        entryStart: num(s.openStartMinutesEt, form.entryStart),
        entryEnd: num(s.openEndMinutesEt, form.entryEnd),
        gradeProfile: s.gradeProfile || form.gradeProfile,
        directionFilter: s.directionFilter || form.directionFilter,
        regimeFilter: s.regimeFilter || form.regimeFilter,
        sessionFilter: s.sessionFilter || form.sessionFilter,
        setupTypeFilter: s.setupTypeFilter || form.setupTypeFilter,
        strategyEngine: s.strategyEngine || form.strategyEngine,
        leaderExitMode: s.leaderExitMode || form.leaderExitMode,
        accountType: s.accountType || form.accountType,
        marginMultiplier: num(s.marginMultiplier, form.marginMultiplier),
        allowFractionalShares: typeof s.allowFractionalShares === "boolean" ? s.allowFractionalShares : form.allowFractionalShares,
        allowShorts: typeof s.allowShorts === "boolean" ? s.allowShorts : form.allowShorts,
      });
      setAdminLoaded(true); setStatus("Loaded current Admin-style settings. Choose date range, then run the backtest.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load Admin profile."); setStatus("Admin profile load failed."); }
  }
  async function run() {
    setError(""); setRows([]); setSummary(null);
    const list = activeSymbols;
    if (!list.length) { setError("Add at least one symbol to the watchlist."); return; }
    setProgress({ running: true, current: 0, total: list.length, symbol: "", message: "Starting backtest..." });
    setStatus(`Running backtest on ${list.length} symbol(s).`);
    const nextRows: SymbolResult[] = []; const nextSummaries: BacktestSummary[] = []; const errors: string[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const sym = list[i];
      setProgress({ running: true, current: i, total: list.length, symbol: sym, message: `Fetching ${sym} candles...` });
      try {
        const candles = await fetchCandles(sym, form.timeframe, form.start, form.end);
        const bt = runBacktest(candles, makeSettings(sym, form));
        const row = symbolResult(sym, bt, candles.length);
        nextRows.push(row); nextSummaries.push(bt); setRows([...nextRows]);
        setProgress({ running: true, current: i + 1, total: list.length, symbol: sym, message: `${i + 1}/${list.length} complete · ${sym}: ${bt.totalTrades} trade(s)` });
      } catch (err) {
        errors.push(`${sym}: ${err instanceof Error ? err.message : "failed"}`);
        setProgress({ running: true, current: i + 1, total: list.length, symbol: sym, message: `${i + 1}/${list.length} complete · ${sym} failed` });
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    const agg = aggregate(nextRows, nextSummaries, errors);
    setSummary(agg);
    setProgress({ running: false, current: list.length, total: list.length, symbol: "", message: `Complete: ${agg.trades} trades across ${agg.symbolsWithTrades} symbol(s).` });
    setStatus(`Backtest complete. Tested ${agg.symbolsTested} symbols and ${agg.candleCount.toLocaleString()} candles.`);
  }
  return (
    <main className="dash-shell viewer-v89 research-v94">
      <div className="pro-app-shell">
        <aside className="viewer-sidebar">
          <div className="sidebar-brand"><div><strong>Research Lab</strong><small>Backtest control room</small></div></div>
          <nav className="sidebar-nav"><Link href="/">Viewer</Link><Link href="/chart-desk">Chart Desk</Link><Link href="/positions">Positions</Link><Link href="/research">Research</Link><Link href="/admin">Admin</Link></nav>
          <div className="sidebar-system-card"><strong>Simulation only</strong><small>No broker orders. No admin changes. Uses historical Alpaca candles.</small></div>
        </aside>
        <section className="page-viewer-main">
          <div className="viewer-topbar">
            <span className="eyebrow">v9.4 · Research only</span><h1>Backtest Control Room</h1>
            <p>Test the same style of settings used in Admin over a historical date range. This answers: if the bot had run these rules in the past, what would the simulated results look like?</p>
            <div className="actions"><button onClick={() => void loadAdminProfile()} disabled={progress.running}>{adminLoaded ? "Reload Admin-style profile" : "Load Admin-style profile"}</button><button onClick={() => void run()} disabled={progress.running}>{progress.running ? "Running backtest..." : "Run backtest"}</button></div>
            <p className="status-line">{status}</p>{error ? <div className="error-box">{error}</div> : null}
          </div>
          <div className="mini-grid wide"><SmallMetric label="Mode" value="Backtest" helper="Historical simulation only" /><SmallMetric label="Date range" value={`${form.start} → ${form.end}`} helper="Historical candles" /><SmallMetric label="Universe" value={`${activeSymbols.length}/${symbols.length}`} helper="Scanned / saved symbols" /><SmallMetric label="Timeframe" value={form.timeframe} helper="Same concept as Admin" /><SmallMetric label="Target" value={`${form.fixedTargetR}R`} helper="Fixed target mode" /><SmallMetric label="Progress" value={progress.total ? `${progress.current}/${progress.total}` : "0/0"} helper={progress.message} /></div>
          <section className="panel"><div className="section-heading-row"><div><h2>Backtest setup</h2><p className="muted small">This mirrors Admin settings, but adds a historical date range and simulated starting capital.</p></div><span className="badge">Alpaca candles · no execution</span></div><div className="form-grid backtest-grid"><Field label="Start date"><input type="date" value={form.start} onChange={(e) => patch({ start: e.target.value })} /></Field><Field label="End date"><input type="date" value={form.end} onChange={(e) => patch({ end: e.target.value })} /></Field><Field label="Starting capital"><input type="number" value={form.startingCapital} onChange={(e) => patch({ startingCapital: num(e.target.value, form.startingCapital) })} /></Field><Field label="Timeframe"><select value={form.timeframe} onChange={(e) => patch({ timeframe: e.target.value as Timeframe })}><option>1Min</option><option>5Min</option><option>15Min</option><option>30Min</option><option>1Hour</option></select></Field><Field label="Scan limit"><input type="number" value={form.scanLimit} onChange={(e) => patch({ scanLimit: num(e.target.value, form.scanLimit) })} /></Field><Field label="Min score"><input type="number" value={form.minScore} onChange={(e) => patch({ minScore: num(e.target.value, form.minScore) })} /></Field><Field label="Max score"><input type="number" value={form.maxScore} onChange={(e) => patch({ maxScore: num(e.target.value, form.maxScore) })} /></Field><Field label="Min R/R"><input type="number" step="0.1" value={form.minRR} onChange={(e) => patch({ minRR: num(e.target.value, form.minRR) })} /></Field><Field label="Fixed target R"><input type="number" step="0.1" value={form.fixedTargetR} onChange={(e) => patch({ fixedTargetR: num(e.target.value, form.fixedTargetR) })} /></Field><Field label="Risk per trade %"><input type="number" step="0.05" value={form.riskPct} onChange={(e) => patch({ riskPct: num(e.target.value, form.riskPct) })} /></Field><Field label="Max open trades"><input type="number" value={form.maxOpenTrades} onChange={(e) => patch({ maxOpenTrades: num(e.target.value, form.maxOpenTrades) })} /></Field><Field label="Max new trades/run"><input type="number" value={form.maxNewTradesPerRun} onChange={(e) => patch({ maxNewTradesPerRun: num(e.target.value, form.maxNewTradesPerRun) })} /></Field><Field label="Max total open risk %"><input type="number" step="0.5" value={form.maxTotalOpenRiskPct} onChange={(e) => patch({ maxTotalOpenRiskPct: num(e.target.value, form.maxTotalOpenRiskPct) })} /></Field><Field label="Cooldown minutes"><input type="number" value={form.cooldownMinutes} onChange={(e) => patch({ cooldownMinutes: num(e.target.value, form.cooldownMinutes) })} /></Field><Field label="Max bars to hold"><input type="number" value={form.maxBarsToHold} onChange={(e) => patch({ maxBarsToHold: num(e.target.value, form.maxBarsToHold) })} /></Field><Field label="Warmup bars"><input type="number" value={form.warmupBars} onChange={(e) => patch({ warmupBars: num(e.target.value, form.warmupBars) })} /></Field></div></section>
          <section className="panel"><h2>Strategy rules</h2><div className="form-grid backtest-grid"><Field label="Grader profile"><select value={form.gradeProfile} onChange={(e) => patch({ gradeProfile: e.target.value as GradeProfile })}><option>Pullback</option><option>Balanced</option><option>Breakout</option></select></Field><Field label="Direction"><select value={form.directionFilter} onChange={(e) => patch({ directionFilter: e.target.value as DirectionFilter })}><option value="Long">Long Only</option><option value="Short">Short Only</option><option value="All">All</option></select></Field><Field label="Session filter"><select value={form.sessionFilter} onChange={(e) => patch({ sessionFilter: e.target.value as SessionFilter })}><option>MiddayAfternoon</option><option>RegularHours</option><option>Morning</option><option>Midday</option><option>Afternoon</option><option>All</option></select></Field><Field label="Strategy engine"><select value={form.strategyEngine} onChange={(e) => patch({ strategyEngine: e.target.value as StrategyEngine })}><option>UniversalAdaptiveProV3</option><option>UniversalAdaptiveProV4</option><option>UniversalAdaptiveProV5</option><option>UniversalAdaptiveProV6</option><option>Manual</option></select></Field><Field label="Regime filter"><select value={form.regimeFilter} onChange={(e) => patch({ regimeFilter: e.target.value as RegimeFilter })}><option>Off</option><option>BlockLongBear</option><option>LongBullOnly</option><option>ShortBearOnly</option><option>LongBullShortBear</option></select></Field><Field label="Setup type"><select value={form.setupTypeFilter} onChange={(e) => patch({ setupTypeFilter: e.target.value as SetupTypeFilter })}><option>AdaptiveBest</option><option>Pullback</option><option>Continuation</option><option>ContinuationPullback</option><option>ExcludeBreakoutChase</option><option>All</option></select></Field><Field label="Entry start"><input type="number" value={form.entryStart} onChange={(e) => patch({ entryStart: num(e.target.value, form.entryStart) })} /></Field><Field label="Entry end"><input type="number" value={form.entryEnd} onChange={(e) => patch({ entryEnd: num(e.target.value, form.entryEnd) })} /></Field></div><p className="muted small">Entry window: {minutesToEt(form.entryStart)} to {minutesToEt(form.entryEnd)}. These fields still use minutes after midnight so they match the bot settings.</p></section>
          <section className="panel"><div className="section-heading-row"><div><h2>Tracked symbols</h2><p className="muted small">The backtester scans from the top of this list, just like Admin. Reorder the list to prioritize names.</p></div><span className="badge">{activeSymbols.length} active / {symbols.length} saved</span></div><textarea value={form.symbolsText} onChange={(e) => patch({ symbolsText: e.target.value })} /></section>
          <section className="panel"><h2>Progress</h2><div className="research-progress-track"><div style={{ width: `${progressPct}%` }} /></div><p className="status-line">{progress.total ? `${progress.current}/${progress.total} symbols · ${progressPct}% · ${progress.message}` : progress.message}</p></section>
          {summary ? <section className="panel backtest-results"><h2>Backtest results</h2><div className="mini-grid wide"><SmallMetric label="Symbols tested" value={summary.symbolsTested} helper={`${summary.symbolsWithTrades} had trades`} /><SmallMetric label="Trades" value={summary.trades} helper={`${summary.wins} wins · ${summary.losses} losses`} /><SmallMetric label="Win rate" value={pct(summary.winRate)} helper="All simulated trades" /><SmallMetric label="Total R" value={fmt(summary.totalR)} helper={`Avg ${fmt(summary.avgR)}R/trade`} /><SmallMetric label="Profit factor" value={fmt(summary.profitFactor)} helper="Gross R ratio" /><SmallMetric label="Avg return" value={pct(summary.avgReturnPct)} helper="Avg by traded symbol" /></div><div className="grid two diagnostic-grid"><div className="breakdown-card"><h3>Score buckets</h3><div className="table-wrap compact"><table><thead><tr><th>Bucket</th><th>Trades</th><th>Win rate</th><th>Avg R</th><th>Total R</th><th>PF</th></tr></thead><tbody>{summary.scoreBuckets.map((b) => <tr key={b.label}><td>{b.label}</td><td>{b.trades}</td><td>{pct(b.winRate)}</td><td>{fmt(b.avgR)}</td><td>{fmt(b.totalR)}</td><td>{fmt(b.profitFactor)}</td></tr>)}</tbody></table></div></div><div className="breakdown-card"><h3>Notes</h3><p className="muted small">This is a historical simulation using Alpaca candles. It does not place broker orders and does not change Admin settings.</p>{summary.recentErrors.length ? <div className="warning-box">Some symbols failed:<br />{summary.recentErrors.join("\n")}</div> : <p className="muted small">No recent fetch errors.</p>}</div></div><div className="grid two diagnostic-grid"><div className="breakdown-card"><h3>Best symbols</h3><ResultTable rows={summary.best} /></div><div className="breakdown-card"><h3>Worst symbols</h3><ResultTable rows={summary.worst} /></div></div></section> : null}
        </section>
        <aside className="viewer-inspector-v88"><div className="rail-title-v88"><span>Research rail</span><h2>What this page does</h2><p>Backtests an Admin-style profile over selected historical dates. No broker execution.</p></div><div className="rail-card-v88 dash-panel"><h2>Current test</h2><div className="rail-stack-v88"><div className="rail-row-v88 info"><span>Profile</span><strong>{form.gradeProfile} · {form.directionFilter}</strong><small>{form.strategyEngine}</small></div><div className="rail-row-v88 info"><span>Window</span><strong>{form.start} → {form.end}</strong><small>{form.timeframe} candles</small></div><div className="rail-row-v88 info"><span>Session</span><strong>{minutesToEt(form.entryStart)} → {minutesToEt(form.entryEnd)}</strong><small>{form.sessionFilter}</small></div><div className="rail-row-v88 good"><span>Safety</span><strong>Backtest only</strong><small>No orders. No Admin changes.</small></div></div></div><div className="rail-card-v88 dash-panel"><h2>Progress</h2><strong>{progress.total ? `${progress.current}/${progress.total}` : "Idle"}</strong><p className="muted small">{progress.message}</p><div className="research-progress-track"><div style={{ width: `${progressPct}%` }} /></div></div><div className="rail-card-v88 dash-panel"><h2>Result focus</h2><p className="muted small">Use this to see if Admin-style rules worked historically. Main checks: total trades, score buckets, avg R, profit factor, and worst symbols.</p></div></aside>
      </div>
    </main>
  );
}
function ResultTable({ rows }: { rows: SymbolResult[] }) {
  return <div className="table-wrap compact"><table><thead><tr><th>Symbol</th><th>Trades</th><th>Win</th><th>Total R</th><th>Avg R</th><th>PF</th></tr></thead><tbody>{rows.map((r) => <tr key={r.symbol}><td>{r.symbol}</td><td>{r.trades}</td><td>{pct(r.winRate)}</td><td>{fmt(r.totalR)}</td><td>{fmt(r.avgR)}</td><td>{fmt(r.profitFactor)}</td></tr>)}</tbody></table></div>;
}
