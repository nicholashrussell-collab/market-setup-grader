"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { DEFAULT_TRACKED_SYMBOLS, parseTrackedSymbols } from "@/lib/watchlist";
import {
  Candle,
  DirectionFilter,
  GradeProfile,
  JournalTrade,
  LeaderExitMode,
  RealisticAccountType,
  RegimeFilter,
  SessionFilter,
  SetupTypeFilter,
  StrategyEngine,
  Timeframe,
  createJournalTrade,
  gradeSetup,
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
type ProgressState = { running: boolean; current: number; total: number; symbol: string; message: string; phase: "idle" | "fetch" | "simulate" | "done" };

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

type OpenPosition = { trade: JournalTrade; openedIndex: number; barsHeld: number; openedMs: number };
type EquityPoint = { time: string; value: number; r: number };
type SymbolStats = { symbol: string; trades: number; wins: number; losses: number; totalR: number; positiveR: number; negativeR: number };
type BucketStats = { label: string; trades: number; wins: number; totalR: number; positiveR: number; negativeR: number };
type SimResult = {
  mode: "global-portfolio";
  symbolsTested: number;
  symbolsWithCandles: number;
  candles: number;
  timelineBars: number;
  trades: JournalTrade[];
  wins: number;
  losses: number;
  timeouts: number;
  ambiguous: number;
  totalR: number;
  avgR: number;
  positiveR: number;
  negativeR: number;
  profitFactor: number;
  winRate: number;
  endingEquity: number;
  returnPct: number;
  maxDrawdownR: number;
  maxDrawdownPct: number;
  equity: EquityPoint[];
  skippedMaxOpen: number;
  skippedMaxRisk: number;
  skippedMaxNewRun: number;
  candidatesSeen: number;
  best: SymbolStats[];
  worst: SymbolStats[];
  buckets: BucketStats[];
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
function profitFactor(pos: number, neg: number) { return Math.abs(neg) > 0 ? pos / Math.abs(neg) : pos > 0 ? Infinity : 0; }
function displayPf(value: number) { return value === Infinity ? "∞" : fmt(value); }
function minutesToEt(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix} ET`;
}
function etMinutes(value: string) {
  const d = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return h * 60 + m;
}
function inEntryWindow(value: string, start: number, end: number) {
  const mins = etMinutes(value);
  return mins >= start && mins <= end;
}
function barsUrl(symbol: string, timeframe: Timeframe, start: string, end: string, warmupBars: number) {
  const msPerBar = timeframe === "1Min" ? 60_000 : timeframe === "5Min" ? 300_000 : timeframe === "30Min" ? 1_800_000 : timeframe === "1Hour" ? 3_600_000 : 900_000;
  const warmupPad = Math.max(7, Math.ceil((warmupBars * msPerBar) / 86_400_000) + 5);
  const startDate = new Date(`${start}T00:00:00-04:00`);
  startDate.setUTCDate(startDate.getUTCDate() - warmupPad);
  const startIso = startDate.toISOString();
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
async function fetchCandles(symbol: string, timeframe: Timeframe, start: string, end: string, warmupBars: number): Promise<Candle[]> {
  const res = await fetch(barsUrl(symbol, timeframe, start, end, warmupBars), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
  return (data.bars || []).sort((a: Candle, b: Candle) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
function scoreBucket(score: number) {
  if (score < 60) return "Under 60";
  if (score < 70) return "60-69";
  if (score < 80) return "70-79";
  if (score < 90) return "80-89";
  return "90-100";
}
function resultRAtClose(trade: JournalTrade, close: number) {
  const risk = trade.bias === "Long" ? trade.entry - trade.stop : trade.stop - trade.entry;
  return trade.bias === "Long" ? (close - trade.entry) / Math.max(risk, 0.000001) : (trade.entry - close) / Math.max(risk, 0.000001);
}
function tryResolve(trade: JournalTrade, candle: Candle, barsHeld: number, maxBars: number): JournalTrade | null {
  const hitTarget = trade.bias === "Long" ? candle.high >= trade.target : candle.low <= trade.target;
  const hitStop = trade.bias === "Long" ? candle.low <= trade.stop : candle.high >= trade.stop;
  if (hitTarget && hitStop) return { ...trade, status: "Ambiguous", resolvedAt: candle.time, resultR: 0, note: `Backtest: both target and stop touched in ${candle.time}.` };
  if (hitTarget) return { ...trade, status: "Win", resolvedAt: candle.time, resultR: Number((trade.rr || 0).toFixed(2)), note: `Backtest: target hit on ${candle.time}.` };
  if (hitStop) return { ...trade, status: "Loss", resolvedAt: candle.time, resultR: -1, note: `Backtest: stop hit on ${candle.time}.` };
  if (barsHeld >= maxBars) return { ...trade, status: "Timeout", resolvedAt: candle.time, resultR: Number(resultRAtClose(trade, candle.close).toFixed(2)), note: `Backtest: max hold reached after ${maxBars} bars.` };
  return null;
}
function regimeAllows(filter: RegimeFilter, bias: string, regime: string) {
  if (filter === "Off") return true;
  if (filter === "BlockLongBear") return !(bias === "Long" && (regime === "Bear" || regime === "Panic"));
  if (filter === "LongBullOnly") return bias === "Long" && regime === "Bull";
  if (filter === "ShortBearOnly") return bias === "Short" && (regime === "Bear" || regime === "Panic");
  if (filter === "LongBullShortBear") return (bias === "Long" && regime === "Bull") || (bias === "Short" && (regime === "Bear" || regime === "Panic"));
  return true;
}
function setupAllows(filter: SetupTypeFilter, setupType: string) {
  if (filter === "All" || filter === "AdaptiveBest") return true;
  if (filter === "ExcludeBreakoutChase") return !/breakout|chase/i.test(setupType);
  return setupType.toLowerCase().includes(filter.toLowerCase().replace("long", "").replace("short", ""));
}
function maxDd(values: number[]) {
  let peak = values[0] || 0;
  let max = 0;
  for (const v of values) { peak = Math.max(peak, v); max = Math.max(max, peak - v); }
  return max;
}
function summarize(trades: JournalTrade[], form: ResearchForm, symbolsTested: number, symbolsWithCandles: number, candles: number, timelineBars: number, errors: string[], skipped: { maxOpen: number; maxRisk: number; maxNew: number; candidates: number }): SimResult {
  const wins = trades.filter((t) => t.status === "Win").length;
  const losses = trades.filter((t) => t.status === "Loss").length;
  const timeouts = trades.filter((t) => t.status === "Timeout").length;
  const ambiguous = trades.filter((t) => t.status === "Ambiguous").length;
  const totalR = trades.reduce((s, t) => s + (t.resultR || 0), 0);
  const positiveR = trades.reduce((s, t) => s + Math.max(0, t.resultR || 0), 0);
  const negativeR = trades.reduce((s, t) => s + Math.min(0, t.resultR || 0), 0);
  let runningR = 0;
  const equity: EquityPoint[] = [{ time: form.start, value: form.startingCapital, r: 0 }];
  for (const t of [...trades].sort((a, b) => new Date(a.resolvedAt || a.signalTime).getTime() - new Date(b.resolvedAt || b.signalTime).getTime())) {
    runningR += t.resultR || 0;
    equity.push({ time: t.resolvedAt || t.signalTime, r: Number(runningR.toFixed(2)), value: Number((form.startingCapital * (1 + (runningR * form.riskPct) / 100)).toFixed(2)) });
  }
  const endingEquity = equity[equity.length - 1]?.value || form.startingCapital;
  const ddR = maxDd(equity.map((p) => p.r));
  const ddDollars = maxDd(equity.map((p) => p.value));
  const bySymbol = new Map<string, SymbolStats>();
  const byBucket = new Map<string, BucketStats>();
  for (const t of trades) {
    const r = t.resultR || 0;
    const sym = bySymbol.get(t.symbol) || { symbol: t.symbol, trades: 0, wins: 0, losses: 0, totalR: 0, positiveR: 0, negativeR: 0 };
    sym.trades += 1; sym.wins += t.status === "Win" ? 1 : 0; sym.losses += t.status === "Loss" ? 1 : 0; sym.totalR += r; sym.positiveR += Math.max(0, r); sym.negativeR += Math.min(0, r); bySymbol.set(t.symbol, sym);
    const label = scoreBucket(t.score);
    const b = byBucket.get(label) || { label, trades: 0, wins: 0, totalR: 0, positiveR: 0, negativeR: 0 };
    b.trades += 1; b.wins += t.status === "Win" ? 1 : 0; b.totalR += r; b.positiveR += Math.max(0, r); b.negativeR += Math.min(0, r); byBucket.set(label, b);
  }
  const symbolRows = Array.from(bySymbol.values()).map((s) => ({ ...s, totalR: Number(s.totalR.toFixed(2)), positiveR: Number(s.positiveR.toFixed(2)), negativeR: Number(s.negativeR.toFixed(2)) }));
  const bucketRows = ["Under 60", "60-69", "70-79", "80-89", "90-100"].map((label) => byBucket.get(label) || { label, trades: 0, wins: 0, totalR: 0, positiveR: 0, negativeR: 0 });
  return {
    mode: "global-portfolio",
    symbolsTested,
    symbolsWithCandles,
    candles,
    timelineBars,
    trades,
    wins,
    losses,
    timeouts,
    ambiguous,
    totalR: Number(totalR.toFixed(2)),
    avgR: trades.length ? Number((totalR / trades.length).toFixed(2)) : 0,
    positiveR: Number(positiveR.toFixed(2)),
    negativeR: Number(negativeR.toFixed(2)),
    profitFactor: profitFactor(positiveR, negativeR),
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    endingEquity,
    returnPct: ((endingEquity - form.startingCapital) / form.startingCapital) * 100,
    maxDrawdownR: Number(ddR.toFixed(2)),
    maxDrawdownPct: (ddDollars / Math.max(form.startingCapital, 1)) * 100,
    equity,
    skippedMaxOpen: skipped.maxOpen,
    skippedMaxRisk: skipped.maxRisk,
    skippedMaxNewRun: skipped.maxNew,
    candidatesSeen: skipped.candidates,
    best: [...symbolRows].sort((a, b) => b.totalR - a.totalR).slice(0, 10),
    worst: [...symbolRows].sort((a, b) => a.totalR - b.totalR).slice(0, 10),
    buckets: bucketRows,
    recentErrors: errors.slice(-8),
  };
}

function SmallMetric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return <div className="dash-tile info"><span>{label}</span><strong>{value}</strong>{helper ? <small>{helper}</small> : null}</div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label>{label}{children}</label>; }

export default function ResearchPage() {
  const [form, setForm] = useState<ResearchForm>(() => defaultForm());
  const [status, setStatus] = useState("Ready to run a true Admin-style portfolio backtest.");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProgressState>({ running: false, current: 0, total: 0, symbol: "", message: "Idle", phase: "idle" });
  const [summary, setSummary] = useState<SimResult | null>(null);
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
        scanLimit: num(s.scanLimit, form.scanLimit), minScore: num(s.minScore, form.minScore), maxScore: num(s.maxScore, form.maxScore), minRR: num(s.minRR, form.minRR), fixedTargetR: num(s.fixedTargetR, form.fixedTargetR), riskPct: num(s.riskPct, form.riskPct), maxOpenTrades: num(s.maxOpenPositions, form.maxOpenTrades), maxNewTradesPerRun: num(s.maxNewTradesPerRun, form.maxNewTradesPerRun), maxTotalOpenRiskPct: num(s.maxTotalOpenRiskPct, form.maxTotalOpenRiskPct), cooldownMinutes: num(s.cooldownMinutes, form.cooldownMinutes), maxBarsToHold: num(s.maxBarsToHold, form.maxBarsToHold), warmupBars: num(s.warmupBars, form.warmupBars), maxPositionPct: num(s.maxPositionPct, form.maxPositionPct), entryStart: num(s.openStartMinutesEt, form.entryStart), entryEnd: num(s.openEndMinutesEt, form.entryEnd),
        gradeProfile: s.gradeProfile || form.gradeProfile, directionFilter: s.directionFilter || form.directionFilter, regimeFilter: s.regimeFilter || form.regimeFilter, sessionFilter: s.sessionFilter || form.sessionFilter, setupTypeFilter: s.setupTypeFilter || form.setupTypeFilter, strategyEngine: s.strategyEngine || form.strategyEngine, leaderExitMode: s.leaderExitMode || form.leaderExitMode, accountType: s.accountType || form.accountType, marginMultiplier: num(s.marginMultiplier, form.marginMultiplier), allowFractionalShares: typeof s.allowFractionalShares === "boolean" ? s.allowFractionalShares : form.allowFractionalShares, allowShorts: typeof s.allowShorts === "boolean" ? s.allowShorts : form.allowShorts,
      });
      setStatus("Loaded current Admin-style settings. Choose date range, then run the portfolio backtest.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load Admin profile."); setStatus("Admin profile load failed."); }
  }

  async function run() {
    setError(""); setSummary(null);
    const list = activeSymbols;
    if (!list.length) { setError("Add at least one symbol to the watchlist."); return; }
    setStatus(`Fetching candles for ${list.length} symbol(s)...`);
    setProgress({ running: true, current: 0, total: list.length, symbol: "", message: "Fetching candles...", phase: "fetch" });
    const bySymbol = new Map<string, Candle[]>();
    const errors: string[] = [];
    let candleCount = 0;
    for (let i = 0; i < list.length; i += 1) {
      const sym = list[i];
      setProgress({ running: true, current: i, total: list.length, symbol: sym, message: `Fetching ${sym} candles...`, phase: "fetch" });
      try {
        const candles = await fetchCandles(sym, form.timeframe, form.start, form.end, form.warmupBars);
        if (candles.length) { bySymbol.set(sym, candles); candleCount += candles.length; }
        setProgress({ running: true, current: i + 1, total: list.length, symbol: sym, message: `${i + 1}/${list.length} fetched · ${sym}: ${candles.length} candles`, phase: "fetch" });
      } catch (err) {
        errors.push(`${sym}: ${err instanceof Error ? err.message : "failed"}`);
        setProgress({ running: true, current: i + 1, total: list.length, symbol: sym, message: `${i + 1}/${list.length} fetched · ${sym} failed`, phase: "fetch" });
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const requestedStartMs = new Date(`${form.start}T00:00:00-04:00`).getTime();
    const requestedEndMs = new Date(`${form.end}T23:59:59-04:00`).getTime();
    const timeline = Array.from(new Set(Array.from(bySymbol.values()).flatMap((rows) => rows.map((c) => c.time))))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .filter((t) => { const ms = new Date(t).getTime(); return ms >= requestedStartMs && ms <= requestedEndMs; });
    const indexBySymbol = new Map<string, Map<string, number>>();
    bySymbol.forEach((rows, sym) => indexBySymbol.set(sym, new Map(rows.map((c, idx) => [c.time, idx]))));

    const trades: JournalTrade[] = [];
    let open: OpenPosition[] = [];
    const lastEntryBySymbol = new Map<string, number>();
    const skipped = { maxOpen: 0, maxRisk: 0, maxNew: 0, candidates: 0 };
    setStatus(`Simulating one shared portfolio across ${timeline.length.toLocaleString()} bars...`);
    for (let ti = 0; ti < timeline.length; ti += 1) {
      const time = timeline[ti];
      const timeMs = new Date(time).getTime();
      setProgress({ running: true, current: ti, total: timeline.length, symbol: "", message: `Simulating ${ti + 1}/${timeline.length} bars · open ${open.length} · trades ${trades.length}`, phase: "simulate" });

      const stillOpen: OpenPosition[] = [];
      for (const pos of open) {
        const rows = bySymbol.get(pos.trade.symbol) || [];
        const idx = indexBySymbol.get(pos.trade.symbol)?.get(time);
        if (idx === undefined || timeMs <= pos.openedMs) { stillOpen.push(pos); continue; }
        const barsHeld = pos.barsHeld + 1;
        const resolved = tryResolve(pos.trade, rows[idx], barsHeld, form.maxBarsToHold);
        if (resolved) trades.push(resolved); else stillOpen.push({ ...pos, barsHeld });
      }
      open = stillOpen;

      if (!inEntryWindow(time, form.entryStart, form.entryEnd)) { continue; }
      const room = Math.max(0, Math.min(form.maxNewTradesPerRun, form.maxOpenTrades - open.length));
      if (room <= 0) { skipped.maxOpen += 1; continue; }
      const candidates: { symbol: string; trade: JournalTrade; score: number; rr: number }[] = [];
      for (const sym of list) {
        if (open.some((p) => p.trade.symbol === sym)) continue;
        const last = lastEntryBySymbol.get(sym) || 0;
        if (last && (timeMs - last) / 60000 < form.cooldownMinutes) continue;
        const rows = bySymbol.get(sym); const idx = indexBySymbol.get(sym)?.get(time);
        if (!rows || idx === undefined || idx < Math.max(form.warmupBars, 50)) continue;
        const contextBars = form.strategyEngine === "UniversalAdaptiveProV5" || form.strategyEngine === "UniversalAdaptiveProV6" ? 4000 : 1000;
        const window = rows.slice(Math.max(0, idx - contextBars + 1), idx + 1);
        const grade = gradeSetup(window, form.timeframe, new Date(time), { mode: "FixedR", fixedR: form.fixedTargetR, atrMultiple: 2 }, { profile: form.gradeProfile });
        if (!grade || grade.bias === "Neutral") continue;
        if (grade.score < form.minScore || grade.score > form.maxScore || grade.rr < form.minRR) continue;
        if (form.directionFilter !== "All" && grade.bias !== form.directionFilter) continue;
        if (!regimeAllows(form.regimeFilter, grade.bias, grade.marketRegime)) continue;
        if (!setupAllows(form.setupTypeFilter, grade.setupType)) continue;
        const trade = createJournalTrade({ symbol: sym, timeframe: form.timeframe, mode: "Research", source: "Backtest", grade, noOvernight: false });
        if (trade) candidates.push({ symbol: sym, trade, score: grade.score, rr: grade.rr });
      }
      skipped.candidates += candidates.length;
      candidates.sort((a, b) => b.score - a.score || b.rr - a.rr || a.symbol.localeCompare(b.symbol));
      const allowedByRisk = Math.floor(form.maxTotalOpenRiskPct > 0 && form.riskPct > 0 ? form.maxTotalOpenRiskPct / form.riskPct : 9999);
      let openedThisRun = 0;
      for (const candidate of candidates) {
        if (openedThisRun >= form.maxNewTradesPerRun) { skipped.maxNew += candidates.length - openedThisRun; break; }
        if (open.length >= form.maxOpenTrades) { skipped.maxOpen += 1; break; }
        if (open.length + 1 > allowedByRisk) { skipped.maxRisk += 1; break; }
        const rows = bySymbol.get(candidate.symbol) || [];
        const idx = indexBySymbol.get(candidate.symbol)?.get(time) || 0;
        open.push({ trade: candidate.trade, openedIndex: idx, barsHeld: 0, openedMs: timeMs });
        lastEntryBySymbol.set(candidate.symbol, timeMs);
        openedThisRun += 1;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    const lastTime = timeline[timeline.length - 1] || new Date().toISOString();
    for (const pos of open) {
      const rows = bySymbol.get(pos.trade.symbol) || [];
      const last = rows[rows.length - 1];
      if (last) trades.push({ ...pos.trade, status: "Timeout", resolvedAt: last.time || lastTime, resultR: Number(resultRAtClose(pos.trade, last.close).toFixed(2)), note: "Backtest: end of date range." });
    }
    const result = summarize(trades, form, list.length, bySymbol.size, candleCount, timeline.length, errors, skipped);
    setSummary(result);
    setProgress({ running: false, current: timeline.length, total: timeline.length, symbol: "", message: `Complete: ${result.trades.length} trades · ${result.totalR.toFixed(2)}R`, phase: "done" });
    setStatus(`True portfolio backtest complete. ${result.trades.length} trades across ${new Set(result.trades.map((t) => t.symbol)).size} symbol(s).`);
  }

  return (
    <main className="dash-shell viewer-v89 research-v94">
      <div className="pro-app-shell">
        <aside className="viewer-sidebar">
          <div className="sidebar-brand"><div><strong>Research Lab</strong><small>Backtest control room</small></div></div>
          <nav className="sidebar-nav"><Link href="/">Viewer</Link><Link href="/chart-desk">Chart Desk</Link><Link href="/positions">Positions</Link><Link href="/research">Research</Link><Link href="/admin">Admin</Link></nav>
          <div className="sidebar-system-card"><strong>True portfolio simulation</strong><small>One shared timeline. Max new trades/run and max open trades are enforced globally.</small></div>
        </aside>
        <section className="page-viewer-main">
          <div className="viewer-topbar"><span className="eyebrow">v9.5 · Research only</span><h1>Backtest Control Room</h1><p>If the Admin bot had run these settings over the selected dates, what would the shared portfolio have done?</p><div className="hero-actions"><button onClick={loadAdminProfile} disabled={progress.running}>Reload Admin-style profile</button><button className="primary" onClick={run} disabled={progress.running}>{progress.running ? "Running..." : "Run portfolio backtest"}</button></div><p className="status-line">{status}</p>{error ? <p className="warning-box">{error}</p> : null}</div>
          <div className="mini-grid wide"><SmallMetric label="Mode" value="Portfolio backtest" helper="Global Admin-style simulation" /><SmallMetric label="Date range" value={`${form.start} → ${form.end}`} helper="Historical candles" /><SmallMetric label="Universe" value={`${activeSymbols.length}/${symbols.length}`} helper="Scanned / saved symbols" /><SmallMetric label="Timeframe" value={form.timeframe} helper="Same concept as Admin" /><SmallMetric label="Target" value={`${form.fixedTargetR}R`} helper="Fixed target mode" /><SmallMetric label="Progress" value={progress.total ? `${progress.current}/${progress.total}` : "Idle"} helper={progress.message} /></div>
          <section className="panel"><div className="section-heading-row"><div><h2>Backtest setup</h2><p className="muted small">This mirrors Admin controls, but runs them through a historical shared-portfolio simulator.</p></div><span className="badge">Alpaca candles · no execution</span></div><div className="form-grid backtest-grid"><Field label="Start date"><input type="date" value={form.start} onChange={(e) => patch({ start: e.target.value })} /></Field><Field label="End date"><input type="date" value={form.end} onChange={(e) => patch({ end: e.target.value })} /></Field><Field label="Starting capital"><input type="number" value={form.startingCapital} onChange={(e) => patch({ startingCapital: num(e.target.value, form.startingCapital) })} /></Field><Field label="Timeframe"><select value={form.timeframe} onChange={(e) => patch({ timeframe: e.target.value as Timeframe })}><option>1Min</option><option>5Min</option><option>15Min</option><option>30Min</option><option>1Hour</option></select></Field><Field label="Scan limit"><input type="number" value={form.scanLimit} onChange={(e) => patch({ scanLimit: num(e.target.value, form.scanLimit) })} /></Field><Field label="Min score"><input type="number" value={form.minScore} onChange={(e) => patch({ minScore: num(e.target.value, form.minScore) })} /></Field><Field label="Max score"><input type="number" value={form.maxScore} onChange={(e) => patch({ maxScore: num(e.target.value, form.maxScore) })} /></Field><Field label="Min R/R"><input type="number" step="0.1" value={form.minRR} onChange={(e) => patch({ minRR: num(e.target.value, form.minRR) })} /></Field><Field label="Fixed target R"><input type="number" step="0.1" value={form.fixedTargetR} onChange={(e) => patch({ fixedTargetR: num(e.target.value, form.fixedTargetR) })} /></Field><Field label="Risk per trade %"><input type="number" step="0.05" value={form.riskPct} onChange={(e) => patch({ riskPct: num(e.target.value, form.riskPct) })} /></Field><Field label="Max open trades"><input type="number" value={form.maxOpenTrades} onChange={(e) => patch({ maxOpenTrades: num(e.target.value, form.maxOpenTrades) })} /></Field><Field label="Max new trades/run"><input type="number" value={form.maxNewTradesPerRun} onChange={(e) => patch({ maxNewTradesPerRun: num(e.target.value, form.maxNewTradesPerRun) })} /></Field><Field label="Max total open risk %"><input type="number" step="0.5" value={form.maxTotalOpenRiskPct} onChange={(e) => patch({ maxTotalOpenRiskPct: num(e.target.value, form.maxTotalOpenRiskPct) })} /></Field><Field label="Cooldown minutes"><input type="number" value={form.cooldownMinutes} onChange={(e) => patch({ cooldownMinutes: num(e.target.value, form.cooldownMinutes) })} /></Field><Field label="Max bars to hold"><input type="number" value={form.maxBarsToHold} onChange={(e) => patch({ maxBarsToHold: num(e.target.value, form.maxBarsToHold) })} /></Field><Field label="Warmup bars"><input type="number" value={form.warmupBars} onChange={(e) => patch({ warmupBars: num(e.target.value, form.warmupBars) })} /></Field></div></section>
          <section className="panel"><h2>Strategy rules</h2><div className="form-grid backtest-grid"><Field label="Grader profile"><select value={form.gradeProfile} onChange={(e) => patch({ gradeProfile: e.target.value as GradeProfile })}><option>Pullback</option><option>Balanced</option><option>Breakout</option></select></Field><Field label="Direction"><select value={form.directionFilter} onChange={(e) => patch({ directionFilter: e.target.value as DirectionFilter })}><option value="Long">Long Only</option><option value="Short">Short Only</option><option value="All">All</option></select></Field><Field label="Session filter"><select value={form.sessionFilter} onChange={(e) => patch({ sessionFilter: e.target.value as SessionFilter })}><option>MiddayAfternoon</option><option>RegularHours</option><option>Morning</option><option>Midday</option><option>Afternoon</option><option>All</option></select></Field><Field label="Strategy engine"><select value={form.strategyEngine} onChange={(e) => patch({ strategyEngine: e.target.value as StrategyEngine })}><option>UniversalAdaptiveProV3</option><option>UniversalAdaptiveProV4</option><option>UniversalAdaptiveProV5</option><option>UniversalAdaptiveProV6</option><option>Manual</option></select></Field><Field label="Regime filter"><select value={form.regimeFilter} onChange={(e) => patch({ regimeFilter: e.target.value as RegimeFilter })}><option>Off</option><option>BlockLongBear</option><option>LongBullOnly</option><option>ShortBearOnly</option><option>LongBullShortBear</option></select></Field><Field label="Setup type"><select value={form.setupTypeFilter} onChange={(e) => patch({ setupTypeFilter: e.target.value as SetupTypeFilter })}><option>AdaptiveBest</option><option>Pullback</option><option>Continuation</option><option>ContinuationPullback</option><option>ExcludeBreakoutChase</option><option>All</option></select></Field><Field label="Entry start"><input type="number" value={form.entryStart} onChange={(e) => patch({ entryStart: num(e.target.value, form.entryStart) })} /></Field><Field label="Entry end"><input type="number" value={form.entryEnd} onChange={(e) => patch({ entryEnd: num(e.target.value, form.entryEnd) })} /></Field></div><p className="muted small">Entry window: {minutesToEt(form.entryStart)} to {minutesToEt(form.entryEnd)}. The simulator only opens new trades inside this ET window.</p></section>
          <section className="panel"><div className="section-heading-row"><div><h2>Tracked symbols</h2><p className="muted small">The simulator scans from the top of this list, just like Admin.</p></div><span className="badge">{activeSymbols.length} active / {symbols.length} saved</span></div><textarea value={form.symbolsText} onChange={(e) => patch({ symbolsText: e.target.value })} /></section>
          <section className="panel"><h2>Progress</h2><div className="research-progress-track"><div style={{ width: `${progressPct}%` }} /></div><p className="status-line">{progress.total ? `${progress.current}/${progress.total} · ${progressPct}% · ${progress.message}` : progress.message}</p></section>
          {summary ? <section className="panel backtest-results"><h2>Backtest results</h2><p className="muted small">This is now a true shared-portfolio simulation. The trade count is capped by max new trades/run, max open trades, cooldown, and risk controls across the whole universe.</p><div className="mini-grid wide"><SmallMetric label="Symbols loaded" value={`${summary.symbolsWithCandles}/${summary.symbolsTested}`} helper={`${summary.candles.toLocaleString()} candles`} /><SmallMetric label="Timeline bars" value={summary.timelineBars.toLocaleString()} helper="Shared scan times" /><SmallMetric label="Trades" value={summary.trades.length} helper={`${summary.wins} wins · ${summary.losses} losses`} /><SmallMetric label="Win rate" value={pct(summary.winRate)} helper="All simulated trades" /><SmallMetric label="Total R" value={fmt(summary.totalR)} helper={`Avg ${fmt(summary.avgR)}R/trade`} /><SmallMetric label="Profit factor" value={displayPf(summary.profitFactor)} helper="Gross R ratio" /><SmallMetric label="Ending equity" value={`$${summary.endingEquity.toLocaleString()}`} helper={pct(summary.returnPct)} /><SmallMetric label="Max drawdown" value={`${fmt(summary.maxDrawdownR)}R`} helper={pct(summary.maxDrawdownPct)} /></div><div className="grid two diagnostic-grid"><div className="breakdown-card"><h3>Score buckets</h3><div className="table-wrap compact"><table><thead><tr><th>Bucket</th><th>Trades</th><th>Win rate</th><th>Avg R</th><th>Total R</th><th>PF</th></tr></thead><tbody>{summary.buckets.map((b) => <tr key={b.label}><td>{b.label}</td><td>{b.trades}</td><td>{pct(b.trades ? (b.wins / b.trades) * 100 : 0)}</td><td>{fmt(b.trades ? b.totalR / b.trades : 0)}</td><td>{fmt(b.totalR)}</td><td>{displayPf(profitFactor(b.positiveR, b.negativeR))}</td></tr>)}</tbody></table></div></div><div className="breakdown-card"><h3>Portfolio guardrails</h3><p className="muted small">Candidates seen: {summary.candidatesSeen.toLocaleString()}</p><p className="muted small">Skipped by max-open: {summary.skippedMaxOpen}</p><p className="muted small">Skipped by risk cap: {summary.skippedMaxRisk}</p><p className="muted small">Skipped by max-new/run: {summary.skippedMaxNewRun}</p>{summary.recentErrors.length ? <div className="warning-box">Some symbols failed:<br />{summary.recentErrors.join("\n")}</div> : <p className="muted small">No recent fetch errors.</p>}</div></div><div className="grid two diagnostic-grid"><div className="breakdown-card"><h3>Best symbols</h3><ResultTable rows={summary.best} /></div><div className="breakdown-card"><h3>Worst symbols</h3><ResultTable rows={summary.worst} /></div></div></section> : null}
        </section>
        <aside className="viewer-inspector-v88"><div className="rail-title-v88"><span>Research rail</span><h2>True Admin-style test</h2><p>Backtests one shared portfolio instead of independent per-symbol tests.</p></div><div className="rail-card-v88 dash-panel"><h2>Current test</h2><div className="rail-stack-v88"><div className="rail-row-v88 info"><span>Profile</span><strong>{form.gradeProfile} · {form.directionFilter}</strong><small>{form.strategyEngine}</small></div><div className="rail-row-v88 info"><span>Window</span><strong>{form.start} → {form.end}</strong><small>{form.timeframe} candles</small></div><div className="rail-row-v88 info"><span>Session</span><strong>{minutesToEt(form.entryStart)} → {minutesToEt(form.entryEnd)}</strong><small>{form.sessionFilter}</small></div><div className="rail-row-v88 good"><span>Safety</span><strong>Backtest only</strong><small>No orders. No Admin changes.</small></div></div></div><div className="rail-card-v88 dash-panel"><h2>Progress</h2><strong>{progress.total ? `${progress.current}/${progress.total}` : "Idle"}</strong><p className="muted small">{progress.message}</p><div className="research-progress-track"><div style={{ width: `${progressPct}%` }} /></div></div><div className="rail-card-v88 dash-panel"><h2>Result focus</h2><p className="muted small">This should answer whether the Admin bot could have actually taken those trades with one shared portfolio and max 1 new trade/run.</p></div></aside>
      </div>
    </main>
  );
}
function ResultTable({ rows }: { rows: SymbolStats[] }) {
  return <div className="table-wrap compact"><table><thead><tr><th>Symbol</th><th>Trades</th><th>Win</th><th>Total R</th><th>Avg R</th><th>PF</th></tr></thead><tbody>{rows.map((r) => <tr key={r.symbol}><td>{r.symbol}</td><td>{r.trades}</td><td>{pct(r.trades ? (r.wins / r.trades) * 100 : 0)}</td><td>{fmt(r.totalR)}</td><td>{fmt(r.trades ? r.totalR / r.trades : 0)}</td><td>{displayPf(profitFactor(r.positiveR, r.negativeR))}</td></tr>)}</tbody></table></div>;
}
