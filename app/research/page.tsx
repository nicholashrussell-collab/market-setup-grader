"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TradingChart from "@/components/TradingChart";
import { DEFAULT_TRACKED_SYMBOLS } from "@/lib/watchlist";
import {
  AppMode,
  BacktestSettings,
  BacktestSummary,
  Candle,
  DiagnosticGroupStats,
  DirectionFilter,
  GradeProfile,
  GradeResult,
  JournalTrade,
  PortfolioSettings,
  RealisticAccountSettings,
  RealisticAccountType,
  RiskModel,
  RegimeFilter,
  SetupTypeFilter,
  StrategyEngine,
  LeaderExitMode,
  EquityPoint,
  SessionFilter,
  TargetMode,
  Timeframe,
  canAutoSave,
  candlesToCsv,
  createJournalTrade,
  evaluateTradeWithCandles,
  formatDateTime,
  gradeSetup,
  parseCsvCandles,
  runBacktest,
  sampleCsv,
  scoreRangeStats,
} from "@/lib/trading";

const JOURNAL_KEY = "market-setup-grader-v5-3-journal";
const STRATEGY_PRESET_KEY = "market-setup-grader-v9-3-backtest-preset";
const TIMEFRAMES: Timeframe[] = ["1Min", "5Min", "15Min", "30Min", "1Hour"];
const TRACKED_500_SYMBOLS = DEFAULT_TRACKED_SYMBOLS;
type ApiDataSource = "Alpaca" | "Massive";
type BacktestDataSource = ApiDataSource | "CSV";
type AlpacaAdjustment = "raw" | "split" | "dividend" | "all";
type BasketResult = {
  symbol: string;
  trades: number;
  cumulativeR: number;
  avgR: number;
  profitFactor: number;
  maxDrawdownR: number;
  consistency: number;
  endingBalance: number;
  buyHoldEndingBalance: number;
  strategyVsHold: number;
  realisticEnding: number;
  realisticReturnPct: number;
  realisticSkipped: number;
  recentThreeMonthR: number;
  bestDirection: string;
  bestRegime: string;
  bestSetup: string;
  worstRegime: string;
  bestState: string;
  worstState: string;
  failedLeaderR: number;
  bearTransitionR: number;
  bestYear: string;
  worstYear: string;
  dataStart: string;
  dataEnd: string;
  candleCount: number;
  personality: string;
  issue: string;
  suggestion: string;
  longR: number;
  shortR: number;
  shortDragR: number;
  beatHold: boolean;
  warning?: string;
};

type UniversalGroupStats = {
  label: string;
  trades: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
  cumulativeR: number;
  avgR: number;
};

type RejectedOpportunity = {
  symbol: string;
  time: string;
  reason: string;
  score: number;
  state: string;
  regime: string;
  setup: string;
  resultR: number;
  priority: number;
};

type RejectedGroupStats = {
  label: string;
  rejected: number;
  positiveRejected: number;
  totalRejectedR: number;
  avgRejectedR: number;
};

type AccountPolicy = "V53_STRICT" | "V54_SCORE_OVERRIDE" | "V54_BULL_TIGHT" | "V54_COMBO" | "V55_CONTROLLED" | "V57_QUALITY_FILTER" | "V59_OPPORTUNITY_FILTER" | "V60_LEADER_SWEEP" | "V61_SLEEVE_BENCHMARK" | "V62_REAL_SLEEVE" | "V63_SUPER_WIDE" | "V64_DYNAMIC_SLEEVE" | "V65_SUPER_WIDE_50" | "V66_SLEEVE_100_AUDIT" | "V67_LIVE_STYLE_SIM" | "V68_100_TRADE_READINESS" | "V69_LIVE_100_STOCK_SIM" | "V70_PAPER_LIVE_ACTIVE" | "V71_ACTIVE_QUALITY_GATE" | "V72_500_ACTIVE_QUALITY_GATE";

const ACCOUNT_POLICY_LABELS: Record<AccountPolicy, string> = {
  V53_STRICT: "v5.3 strict",
  V54_SCORE_OVERRIDE: "v5.4 score override",
  V54_BULL_TIGHT: "v5.4 bull-normal tight",
  V54_COMBO: "v5.4 combo",
  V55_CONTROLLED: "v5.5 controlled override",
  V57_QUALITY_FILTER: "v5.7 quality filter",
  V59_OPPORTUNITY_FILTER: "v5.9 opportunity filter",
  V60_LEADER_SWEEP: "v6.0 opportunity + sleeve sweep",
  V61_SLEEVE_BENCHMARK: "v6.1 practical 15% simulated sleeve",
  V62_REAL_SLEEVE: "v6.2 simulated 15% leader sleeve",
  V63_SUPER_WIDE: "v6.3 wide research + 25% sleeve benchmark",
  V64_DYNAMIC_SLEEVE: "v6.4 dynamic rotating 25% sleeve",
  V65_SUPER_WIDE_50: "v6.5 wide research 50 + dynamic 25% sleeve",
  V66_SLEEVE_100_AUDIT: "v6.6 wide research 50 + 0-100% sleeve audit",
  V67_LIVE_STYLE_SIM: "v6.7 live-style wide research 50 simulator",
  V68_100_TRADE_READINESS: "v6.8 100-trade live readiness simulator",
  V69_LIVE_100_STOCK_SIM: "v6.9 live 100-stock simulator",
  V70_PAPER_LIVE_ACTIVE: "v7.1 active quality gate",
  V71_ACTIVE_QUALITY_GATE: "v7.1 active quality gate",
  V72_500_ACTIVE_QUALITY_GATE: "v7.2 500-stock active quality gate",
};

type AccountPolicyComparison = {
  policy: AccountPolicy;
  label: string;
  endingBalance: number;
  returnPct: number;
  maxDrawdownPct: number;
  returnToDrawdown: number;
  profitFactor: number;
  acceptedTrades: number;
  totalR: number;
  rCurveConsistency: number;
  skippedStateCap: number;
  skippedMaxOpen: number;
  stateCapBypasses: number;
  bullNormalPnl: number;
  healthyLeaderPnl: number;
};

type RiskSweepRow = {
  riskPercent: number;
  maxTotalRiskPct: number;
  endingBalance: number;
  returnPct: number;
  maxDrawdownPct: number;
  returnToDrawdown: number;
  profitFactor: number;
  acceptedTrades: number;
  totalR: number;
  avgActualRiskPct: number;
  positionCapLimitedTrades: number;
};


type TradeWindowAudit = {
  label: string;
  trades: number;
  startTime: string;
  endTime: string;
  totalR: number;
  avgR: number;
  profitFactor: number;
  winRate: number;
  maxDrawdownR: number;
  longestLossStreak: number;
  grossProfitR: number;
  grossLossR: number;
  ready: boolean;
  note: string;
};

type LiveScanCandidate = {
  symbol: string;
  score: number;
  bias: string;
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
};

type CloudHealth = {
  configured: boolean;
  hasUrl?: boolean;
  hasServiceRoleKey?: boolean;
  urlHost?: string | null;
  message?: string;
  checkedAt?: string;
};

type CloudRunSummary = {
  id: string;
  created_at: string;
  finished_at: string | null;
  status: string;
  reason: string | null;
  source: string | null;
  timeframe: string | null;
  universe_label: string | null;
  symbols_count: number | null;
  candidates_count: number | null;
  actionable_count: number | null;
};

type AccountBatchConfig = {
  label: string;
  maxPositionPct: number;
  maxOpenTrades: number;
  riskPercent: number;
  maxTotalRiskPct: number;
  accountPolicy?: AccountPolicy;
};

type AccountBatchRow = AccountBatchConfig & {
  accountPolicy: AccountPolicy;
  endingBalance: number;
  returnPct: number;
  strategyVsBuyHold: number;
  maxDrawdownPct: number;
  returnToDrawdown: number;
  profitFactor: number;
  acceptedTrades: number;
  totalR: number;
  rCurveConsistency: number;
  avgCashUsedPct: number;
  avgActualRiskPct: number;
  targetRiskHitPct: number;
  positionCapLimitedTrades: number;
  skippedMaxOpen: number;
  skippedStateCap: number;
  stateCapBypasses: number;
  sleeve15Ending: number;
  sleeve15VsHold: number;
  selected: boolean;
};

type SymbolQualityFlag = "Core helper" | "Useful" | "Watch" | "Review/remove";

type SymbolQualityInfo = {
  symbol: string;
  flag: SymbolQualityFlag;
  qualityScore: number;
  avgR: number;
  cumulativeR: number;
  profitFactor: number;
  consistency: number;
  recentThreeMonthR: number;
  strategyVsHold: number;
  personality: string;
  issue: string;
  leaderCandidate: boolean;
};

type LeaderRotationEntry = {
  time: string;
  leaders: string;
  avgScore: number;
};

type DynamicLeaderSleeveSimulation = {
  sleeveEquityPoints: EquityPoint[];
  sleeveEndingBalance: number;
  sleeveMultiple: number;
  sleeveMaxDrawdownPct: number;
  rebalanceCount: number;
  leaderUsage: Array<{ symbol: string; periods: number; pct: number }>;
  rotationLog: LeaderRotationEntry[];
};

type LeaderSleeveRow = {
  sleevePct: number;
  activeAllocationPct: number;
  endingBalance: number;
  activeEnding: number;
  sleeveEnding: number;
  strategyVsHold: number;
  holdCapturePct: number;
  leaderCount: number;
  leaders: string;
  riskTier: string;
  capturePct: number;
  sleeveMaxDrawdownPct: number;
  combinedMaxDrawdownPct: number;
  rawHoldOverlayEnding: number;
  dynamic: boolean;
};

type CachedBasketReplay = {
  signature: string;
  trades: JournalTrade[];
  rows: BasketResult[];
  symbolQualityMap: Record<string, SymbolQualityInfo>;
  equalWeightBuyHold: number;
  equalWeightBuyHoldPoints?: EquityPoint[];
  symbolHistories?: Array<{ symbol: string; candles: Candle[] }>;
  symbolCount: number;
  candidateCount: number;
  label: string;
  createdAt: string;
};

type CachedBasketReplaySummary = {
  signature: string;
  symbolCount: number;
  candidateCount: number;
  label: string;
  createdAt: string;
};

type RollingQualityGateAudit = {
  symbol: string;
  skips: number;
  closedTrades: number;
  lastAvgR: number;
  lastPf: number;
  lastWinRate: number;
  maxRecentDrawdownR: number;
  reason: string;
};

type RollingSymbolStats = {
  results: number[];
  skips: number;
  lastReason: string;
};

type BasketPortfolioSummary = {
  startingBalance: number;
  endingBalance: number;
  netProfit: number;
  returnPct: number;
  maxDrawdownDollars: number;
  maxDrawdownPct: number;
  acceptedTrades: number;
  skippedTrades: number;
  skippedBuyingPower: number;
  skippedNoShorts: number;
  skippedWholeShare: number;
  skippedMaxOpen: number;
  skippedMaxRisk: number;
  skippedLowQuality: number;
  skippedRollingQuality: number;
  rollingQualityGateAudit: RollingQualityGateAudit[];
  skippedStateCap: number;
  maxOpenTrades: number;
  maxTotalRiskPct: number;
  riskPercent: number;
  accountPolicy: AccountPolicy;
  accountPolicyLabel: string;
  stateCapBypasses: number;
  avgActualRiskPct: number;
  targetRiskHitPct: number;
  positionCapLimitedTrades: number;
  buyingPowerLimitedTrades: number;
  accountType: RealisticAccountType;
  allowShorts: boolean;
  allowFractionalShares: boolean;
  maxPositionPct: number;
  avgCashUsedPct: number;
  maxCashUsedPct: number;
  avgUnusedCashPct: number;
  buyHoldEndingBalance: number;
  strategyVsBuyHold: number;
  buyHoldEquityPoints?: EquityPoint[];
  leaderSleeveEquityPoints?: EquityPoint[];
  leaderSleeveOnlyPoints?: EquityPoint[];
  leaderSleeveStats?: DynamicLeaderSleeveSimulation;
  profitFactor: number;
  winRate: number;
  avgTradePnl: number;
  totalR: number;
  returnToDrawdown: number;
  longTrades: number;
  shortTrades: number;
  equityPoints: EquityPoint[];
  bySymbol: UniversalGroupStats[];
  byState: UniversalGroupStats[];
  byRegime: UniversalGroupStats[];
  cumulativeRPoints: EquityPoint[];
  idealRPoints: EquityPoint[];
  rollingAvgR30: number;
  rollingProfitFactor50: number;
  tradeWindowAudits: TradeWindowAudit[];
  latest100TradeAudit?: TradeWindowAudit;
  worst100TradeAudit?: TradeWindowAudit;
  rollingDrawdownR: number;
  rCurveConsistency: number;
  top10ProfitPct: number;
  top25ProfitPct: number;
  bestSymbolProfitPct: number;
  topRejected: RejectedOpportunity[];
  rejectedByState: RejectedGroupStats[];
};

type ModelComparisonResult = {
  model: string;
  positiveSymbols: number;
  beatHoldSymbols: number;
  symbolsTested: number;
  totalR: number;
  avgPf: number;
  avgConsistency: number;
  totalLongR: number;
  totalShortR: number;
  bestSymbol: string;
  worstSymbol: string;
};

function barsApiUrl(source: ApiDataSource, params: Record<string, string | number>) {
  const url = new URL(`/api/${source.toLowerCase()}/bars`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return `${url.pathname}${url.search}`;
}

function badgeClass(status: string) {
  return `badge ${status.toLowerCase()}`;
}

function todayOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}


function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = value === null || typeof value === "undefined" ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function backtestTradesCsv(trades: JournalTrade[]) {
  const headers = [
    "status", "symbol", "timeframe", "score", "bias", "entry", "stop", "target", "rr", "resultR",
    "targetMode", "setupType", "marketRegime", "session", "year", "month", "volumeRatio", "extensionAtr",
    "signalTime", "resolvedAt", "note"
  ];
  const rows = trades.map((t) => [
    t.status, t.symbol, t.timeframe, t.score, t.bias, t.entry, t.stop, t.target, t.rr, t.resultR ?? "",
    t.targetMode || "", t.setupType || "", t.marketRegime || "", t.session || "", t.year || "", t.month || "",
    t.volumeRatio ?? "", t.extensionAtr ?? "", t.signalTime, t.resolvedAt || "", t.note || ""
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function basketResultsCsv(rows: BasketResult[]) {
  const headers = [
    "symbol", "personality", "trades", "cumR", "avgR", "profitFactor", "maxDrawdownR", "consistency",
    "recent3M", "ending", "realisticEnding", "realisticReturnPct", "realisticSkipped", "buyHold", "vsHold", "beatHold", "longR", "shortR", "shortDragR",
    "bestDirection", "bestSetup", "bestRegime", "worstRegime", "bestState", "worstState", "failedLeaderR", "bearTransitionR", "bestYear", "worstYear", "issue", "suggestion", "candles", "dataStart", "dataEnd", "warning"
  ];
  const data = rows.map((r) => [
    r.symbol, r.personality, r.trades, r.cumulativeR, r.avgR, r.profitFactor, r.maxDrawdownR, r.consistency,
    r.recentThreeMonthR, r.endingBalance, r.realisticEnding, r.realisticReturnPct, r.realisticSkipped, r.buyHoldEndingBalance, r.strategyVsHold, r.beatHold ? "yes" : "no", r.longR, r.shortR, r.shortDragR,
    r.bestDirection, r.bestSetup, r.bestRegime, r.worstRegime, r.bestState, r.worstState, r.failedLeaderR, r.bearTransitionR, r.bestYear, r.worstYear, r.issue, r.suggestion, r.candleCount, r.dataStart, r.dataEnd, r.warning || ""
  ]);
  return [headers, ...data].map((row) => row.map(csvCell).join(",")).join("\n");
}

function streakStats(trades: JournalTrade[]) {
  let currentLossStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let longestWinStreak = 0;
  let worstConsecutiveLossR = 0;
  let currentLossR = 0;

  for (const trade of trades) {
    const r = trade.resultR ?? 0;
    if (r < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      currentLossR += r;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      worstConsecutiveLossR = Math.min(worstConsecutiveLossR, currentLossR);
    } else if (r > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      currentLossR = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    }
  }

  const rValues = trades.map((t) => t.resultR ?? 0);
  const wins = rValues.filter((r) => r > 0);
  const losses = rValues.filter((r) => r < 0);
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

  return {
    longestLossStreak,
    longestWinStreak,
    worstConsecutiveLossR: Math.round(worstConsecutiveLossR * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    largestWin: wins.length ? Math.round(Math.max(...wins) * 100) / 100 : 0,
    largestLoss: losses.length ? Math.round(Math.min(...losses) * 100) / 100 : 0,
  };
}

function recoveryStats(points: EquityPoint[]) {
  if (!points.length) return { maxRecoveryDays: 0, currentRecoveryDays: 0, unrecovered: false };
  let peakValue = points[0].value;
  let peakTime = new Date(points[0].time).getTime();
  let inDrawdown = false;
  let drawdownStart = peakTime;
  let maxRecoveryMs = 0;

  for (const point of points) {
    const t = new Date(point.time).getTime();
    if (!Number.isFinite(t)) continue;
    if (point.value >= peakValue) {
      if (inDrawdown) maxRecoveryMs = Math.max(maxRecoveryMs, t - drawdownStart);
      peakValue = point.value;
      peakTime = t;
      inDrawdown = false;
    } else if (!inDrawdown) {
      inDrawdown = true;
      drawdownStart = peakTime;
    }
  }

  const lastTime = new Date(points[points.length - 1].time).getTime();
  const currentRecoveryMs = inDrawdown && Number.isFinite(lastTime) ? lastTime - drawdownStart : 0;
  return {
    maxRecoveryDays: Math.round((maxRecoveryMs / 86400000) * 10) / 10,
    currentRecoveryDays: Math.round((currentRecoveryMs / 86400000) * 10) / 10,
    unrecovered: inDrawdown,
  };
}


function tradeRiskPerShareLocal(trade: JournalTrade): number {
  const risk = trade.bias === "Long" ? trade.entry - trade.stop : trade.stop - trade.entry;
  return Math.max(Math.abs(risk), 0.000001);
}


function tradeStateLabel(trade: JournalTrade): string {
  return trade.marketState || "Unknown";
}

function isPullbackReclaimTrade(trade: JournalTrade): boolean {
  const setup = trade.setupType || "";
  return setup.includes("pullback") || setup.includes("reclaim");
}

function cleanPullbackSetup(trade: JournalTrade): boolean {
  const setup = trade.setupType || "";
  return isPullbackReclaimTrade(trade) && !setup.includes("chase") && !setup.includes("extended");
}

function usesScoreOverride(policy: AccountPolicy): boolean {
  return policy === "V54_SCORE_OVERRIDE" || policy === "V54_COMBO" || policy === "V55_CONTROLLED" || policy === "V57_QUALITY_FILTER" || policy === "V59_OPPORTUNITY_FILTER" || policy === "V60_LEADER_SWEEP" || policy === "V61_SLEEVE_BENCHMARK" || policy === "V62_REAL_SLEEVE" || policy === "V63_SUPER_WIDE" || policy === "V64_DYNAMIC_SLEEVE" || policy === "V65_SUPER_WIDE_50" || policy === "V66_SLEEVE_100_AUDIT" || policy === "V67_LIVE_STYLE_SIM" || policy === "V68_100_TRADE_READINESS" || policy === "V69_LIVE_100_STOCK_SIM" || policy === "V70_PAPER_LIVE_ACTIVE" || policy === "V71_ACTIVE_QUALITY_GATE" || policy === "V72_500_ACTIVE_QUALITY_GATE";
}

function usesBullNormalTight(policy: AccountPolicy): boolean {
  return policy === "V54_BULL_TIGHT" || policy === "V54_COMBO" || policy === "V55_CONTROLLED" || policy === "V57_QUALITY_FILTER" || policy === "V59_OPPORTUNITY_FILTER" || policy === "V60_LEADER_SWEEP" || policy === "V61_SLEEVE_BENCHMARK" || policy === "V62_REAL_SLEEVE" || policy === "V63_SUPER_WIDE" || policy === "V64_DYNAMIC_SLEEVE" || policy === "V65_SUPER_WIDE_50" || policy === "V66_SLEEVE_100_AUDIT" || policy === "V67_LIVE_STYLE_SIM" || policy === "V68_100_TRADE_READINESS" || policy === "V69_LIVE_100_STOCK_SIM" || policy === "V70_PAPER_LIVE_ACTIVE" || policy === "V71_ACTIVE_QUALITY_GATE" || policy === "V72_500_ACTIVE_QUALITY_GATE";
}

function isControlledOverridePolicy(policy: AccountPolicy): boolean {
  return policy === "V55_CONTROLLED" || policy === "V57_QUALITY_FILTER" || policy === "V59_OPPORTUNITY_FILTER" || policy === "V60_LEADER_SWEEP" || policy === "V61_SLEEVE_BENCHMARK" || policy === "V62_REAL_SLEEVE" || policy === "V63_SUPER_WIDE" || policy === "V64_DYNAMIC_SLEEVE" || policy === "V65_SUPER_WIDE_50" || policy === "V66_SLEEVE_100_AUDIT" || policy === "V67_LIVE_STYLE_SIM" || policy === "V68_100_TRADE_READINESS" || policy === "V69_LIVE_100_STOCK_SIM" || policy === "V70_PAPER_LIVE_ACTIVE" || policy === "V71_ACTIVE_QUALITY_GATE" || policy === "V72_500_ACTIVE_QUALITY_GATE";
}

function isQualityFilterPolicy(policy: AccountPolicy): boolean {
  return policy === "V57_QUALITY_FILTER" || policy === "V59_OPPORTUNITY_FILTER" || policy === "V60_LEADER_SWEEP" || policy === "V61_SLEEVE_BENCHMARK" || policy === "V62_REAL_SLEEVE" || policy === "V63_SUPER_WIDE" || policy === "V64_DYNAMIC_SLEEVE" || policy === "V65_SUPER_WIDE_50" || policy === "V66_SLEEVE_100_AUDIT" || policy === "V67_LIVE_STYLE_SIM" || policy === "V68_100_TRADE_READINESS" || policy === "V69_LIVE_100_STOCK_SIM" || policy === "V71_ACTIVE_QUALITY_GATE" || policy === "V72_500_ACTIVE_QUALITY_GATE";
}

function maxStateCapBypassOpen(policy: AccountPolicy): number {
  // v5.4 proved score overrides recover edge, but unlimited bypasses flooded max-open slots.
  // v5.5 allows only a small number of simultaneous override positions.
  // v5.9 keeps the bypass count small and relies on symbol quality + slot ranking to pick better names.
  return isV59Policy(policy) ? 2 : policy === "V57_QUALITY_FILTER" ? 2 : policy === "V55_CONTROLLED" ? 2 : policy === "V70_PAPER_LIVE_ACTIVE" ? 2 : (policy === "V71_ACTIVE_QUALITY_GATE" || policy === "V72_500_ACTIVE_QUALITY_GATE") ? 1 : Number.POSITIVE_INFINITY;
}

function symbolQualityFromRow(row: BasketResult): SymbolQualityInfo {
  let qualityScore = 50;
  if (row.cumulativeR > 80) qualityScore += 18;
  else if (row.cumulativeR > 40) qualityScore += 12;
  else if (row.cumulativeR > 15) qualityScore += 5;
  else if (row.cumulativeR < 0) qualityScore -= 30;

  if (row.avgR >= 0.3) qualityScore += 18;
  else if (row.avgR >= 0.2) qualityScore += 10;
  else if (row.avgR >= 0.12) qualityScore += 4;
  else if (row.avgR < 0.05) qualityScore -= 16;

  if (row.profitFactor >= 1.45) qualityScore += 12;
  else if (row.profitFactor >= 1.3) qualityScore += 7;
  else if (row.profitFactor < 1.1) qualityScore -= 14;

  if (row.consistency >= 90) qualityScore += 8;
  else if (row.consistency < 60) qualityScore -= 8;
  if (row.recentThreeMonthR > 5) qualityScore += 4;
  if (row.recentThreeMonthR < -3) qualityScore -= 5;
  if (row.issue.includes("Negative") || row.personality.includes("avoid")) qualityScore -= 25;

  const leaderCandidate = row.personality.includes("Explosive") || row.issue.includes("missed leader") || (row.buyHoldEndingBalance > row.endingBalance * 1.7 && row.buyHoldEndingBalance > row.realisticEnding * 2);
  // Explosive leaders can have weak fixed-target stats. Do not automatically promote them in the active scanner; tag them for the sleeve diagnostic instead.
  if (leaderCandidate && row.cumulativeR > 0 && row.profitFactor >= 1.15) qualityScore += 3;

  let flag: SymbolQualityFlag = "Useful";
  if (row.cumulativeR < 0 || row.avgR < 0.05 || row.profitFactor < 1.1 || row.issue.includes("Negative")) flag = "Review/remove";
  else if (row.avgR < 0.15 || row.profitFactor < 1.2 || row.consistency < 60) flag = "Watch";
  else if (row.avgR >= 0.25 && row.profitFactor >= 1.3 && row.cumulativeR >= 35) flag = "Core helper";

  return {
    symbol: row.symbol,
    flag,
    qualityScore: Math.max(0, Math.min(100, Math.round(qualityScore))),
    avgR: row.avgR,
    cumulativeR: row.cumulativeR,
    profitFactor: row.profitFactor,
    consistency: row.consistency,
    recentThreeMonthR: row.recentThreeMonthR,
    strategyVsHold: row.strategyVsHold,
    personality: row.personality,
    issue: row.issue,
    leaderCandidate,
  };
}

function buildSymbolQualityMap(rows: BasketResult[]): Record<string, SymbolQualityInfo> {
  return Object.fromEntries(rows.map((row) => [row.symbol, symbolQualityFromRow(row)]));
}

function tradeSymbolQuality(trade: JournalTrade, symbolQualityMap?: Record<string, SymbolQualityInfo>): SymbolQualityInfo | undefined {
  return symbolQualityMap?.[trade.symbol.toUpperCase()];
}

function isV59Policy(policy: AccountPolicy): boolean {
  return policy === "V59_OPPORTUNITY_FILTER" || policy === "V60_LEADER_SWEEP" || policy === "V61_SLEEVE_BENCHMARK" || policy === "V62_REAL_SLEEVE" || policy === "V63_SUPER_WIDE" || policy === "V64_DYNAMIC_SLEEVE" || policy === "V65_SUPER_WIDE_50" || policy === "V66_SLEEVE_100_AUDIT" || policy === "V67_LIVE_STYLE_SIM" || policy === "V68_100_TRADE_READINESS" || policy === "V69_LIVE_100_STOCK_SIM" || policy === "V71_ACTIVE_QUALITY_GATE" || policy === "V72_500_ACTIVE_QUALITY_GATE";
}

function stateOpenCap(trade: JournalTrade, policy: AccountPolicy = "V53_STRICT"): number {
  const state = trade.marketState || "";
  // v5.4/v5.5: keep the v5.3 caps as the baseline. Combo is the aggressive comparison;
  // v5.5 uses bypass controls instead of opening every state cap.
  if (state.includes("Bull recovery")) return policy === "V54_COMBO" ? 3 : 2;
  if (state.includes("Weak")) return 1;
  if (state.includes("Choppy")) return 1;
  if (state.includes("Healthy leader")) return 1;
  if (state.includes("Bull normal")) return 1;
  if (state.includes("Bear transition") || state.includes("Failed leader")) return 0;
  return 1;
}

function canBypassStateCap(trade: JournalTrade, policy: AccountPolicy = "V53_STRICT", symbolQualityMap?: Record<string, SymbolQualityInfo>): boolean {
  if (!usesScoreOverride(policy)) return false;
  if (trade.bias !== "Long") return false;
  const state = trade.marketState || "";
  const regime = trade.marketRegime || "";
  const score = trade.score || 0;
  const extensionAtr = Number(trade.extensionAtr || 0);
  const volumeRatio = Number(trade.volumeRatio || 0);
  const cleanPullback = cleanPullbackSetup(trade);
  const symbolQuality = tradeSymbolQuality(trade, symbolQualityMap);

  if (state.includes("Failed leader") || state.includes("Bear transition")) return false;
  if (regime !== "Bull" || !cleanPullback) return false;

  if (isControlledOverridePolicy(policy)) {
    // v5.5/v5.7 controlled override: only bypass caps in states that proved profitable.
    // Bull normal and Healthy leader must earn a normal slot; they cannot bypass state caps.
    const allowedState = state.includes("Bull recovery") || state.includes("Choppy") || state.includes("Weak");
    if (!allowedState) return false;

    if (isV59Policy(policy)) {
      // v5.9: wide baskets only work if weak symbols cannot steal bypass slots.
      // Review/remove symbols may still be scanned, but they cannot bypass state caps.
      if (symbolQuality?.flag === "Review/remove") return false;
      if (symbolQuality?.flag === "Watch") {
        return score >= 99 && extensionAtr <= 1.3 && volumeRatio >= 1.15 && (state.includes("Bull recovery") || state.includes("Choppy") || state.includes("Weak"));
      }
      if (state.includes("Bull recovery")) {
        return score >= 92 && extensionAtr <= 1.6 && volumeRatio >= 1;
      }
      return score >= 98 && extensionAtr <= 1.45 && volumeRatio >= 1.05;
    }

    if (isQualityFilterPolicy(policy)) {
      // v5.7: Wide-20 tests showed that opening the universe adds noise. Keep the
      // bypass idea, but make wide-universe bypasses earn the slot with better volume,
      // cleaner extension, and higher scores.
      if (state.includes("Bull recovery")) {
        return score >= 92 && extensionAtr <= 1.6 && volumeRatio >= 1;
      }
      return score >= 98 && extensionAtr <= 1.45 && volumeRatio >= 1.05;
    }

    if (state.includes("Bull recovery")) {
      return score >= 90 && extensionAtr <= 1.8 && volumeRatio >= 0.9;
    }

    // Choppy/Weak can work, but only elite clean reclaim setups should bypass.
    return score >= 95 && extensionAtr <= 1.7 && volumeRatio >= 1;
  }

  // v5.4 aggressive override: useful for research, but too loose for the default policy.
  if (score >= 95 && extensionAtr <= 1.8 && volumeRatio >= 0.9) return true;

  if (score >= 90 && extensionAtr <= 1.6 && volumeRatio >= 1) {
    return state.includes("Bull recovery") || state.includes("Choppy") || state.includes("Weak");
  }

  return false;
}

function realisticTradePriority(trade: JournalTrade, policy: AccountPolicy = "V53_STRICT", symbolQualityMap?: Record<string, SymbolQualityInfo>): number {
  const state = trade.marketState || "";
  const regime = trade.marketRegime || "";
  const setup = trade.setupType || "";
  const score = trade.score || 0;
  const volumeRatio = Number(trade.volumeRatio || 0);
  const extensionAtr = Number(trade.extensionAtr || 0);
  const cleanPullback = cleanPullbackSetup(trade);
  const symbolQuality = tradeSymbolQuality(trade, symbolQualityMap);
  let priority = score;

  if (isV59Policy(policy) && symbolQuality) {
    if (symbolQuality.flag === "Core helper") priority += 14;
    else if (symbolQuality.flag === "Useful") priority += 7;
    else if (symbolQuality.flag === "Watch") priority -= 4;
    else if (symbolQuality.flag === "Review/remove") priority -= 22;
    priority += Math.round((symbolQuality.qualityScore - 50) / 8);
    // Explosive leaders that the fixed-target engine under-captures should not crowd out clean active trades.
    if (symbolQuality.leaderCandidate && symbolQuality.avgR < 0.18) priority -= 6;
  }

  if (trade.bias === "Long") priority += 5;
  if (trade.bias === "Short") priority -= 8;

  // v5.3 learned from v5.2: bull recovery had much better avg R than choppy/no-edge.
  if (state.includes("Bull recovery")) priority += 24;
  else if (state.includes("Explosive leader")) priority += isPullbackReclaimTrade(trade) ? 18 : 2;
  else if (state.includes("Healthy leader")) priority += isPullbackReclaimTrade(trade) ? 12 : -10;
  else if (state.includes("Bull normal")) priority += isPullbackReclaimTrade(trade) ? 10 : 0;
  else if (state.includes("Tradable normal")) priority += 6;
  else if (state.includes("Choppy")) priority -= 16;
  else if (state.includes("Weak")) priority -= 5;
  else if (state.includes("Bear transition")) priority -= 24;
  else if (state.includes("Failed leader")) priority -= 28;

  if (regime === "Bull") priority += 10;
  else if (regime === "Neutral") priority -= 10;
  else if (regime === "Bear") priority -= trade.bias === "Long" ? 25 : 0;
  else if (regime === "Panic") priority -= 40;

  if (isPullbackReclaimTrade(trade)) priority += 8;
  if (setup.includes("continuation")) priority += 2;
  if (setup.includes("chase") || setup.includes("extended")) priority -= 16;

  if (volumeRatio >= 1.2) priority += 4;
  if (volumeRatio >= 1.5) priority += 2;
  if (volumeRatio > 0 && volumeRatio < 0.9) priority -= 7;

  if (extensionAtr <= 1.2) priority += 4;
  if (extensionAtr > 1.8) priority -= 8;
  if (extensionAtr > 2.5) priority -= 12;
  if (extensionAtr > 4) priority -= 20;

  if (usesScoreOverride(policy) && trade.bias === "Long" && regime === "Bull" && cleanPullback) {
    if (isControlledOverridePolicy(policy)) {
      // v5.5/v5.7: reward only the states that proved they deserved controlled override slots.
      if (isQualityFilterPolicy(policy)) {
        if (state.includes("Bull recovery") && score >= 92 && volumeRatio >= 1 && extensionAtr <= 1.6) priority += 10;
        if ((state.includes("Choppy") || state.includes("Weak")) && score >= 98 && volumeRatio >= 1.05 && extensionAtr <= 1.45) priority += 10;
        if (extensionAtr > 1.6 || volumeRatio < 1) priority -= 10;
      } else {
        if (state.includes("Bull recovery") && score >= 90) priority += 14;
        if ((state.includes("Choppy") || state.includes("Weak")) && score >= 95) priority += 12;
      }
      if (state.includes("Healthy leader")) priority -= 8;
      if (state.includes("Bull normal")) priority -= 12;
    } else {
      if (score >= 95) priority += 18;
      else if (score >= 90) priority += 8;
      if (state.includes("Choppy") || state.includes("Weak")) priority += score >= 95 ? 8 : 3;
    }
  }

  if (usesBullNormalTight(policy) && state.includes("Bull normal")) {
    priority -= score >= 95 && cleanPullback ? 4 : 14;
  }

  return priority;
}

function shouldSkipLowQualityCashLong(trade: JournalTrade, policy: AccountPolicy = "V53_STRICT", symbolQualityMap?: Record<string, SymbolQualityInfo>): boolean {
  if (trade.bias !== "Long") return false;
  const score = trade.score || 0;
  const state = trade.marketState || "";
  const regime = trade.marketRegime || "";
  const volumeRatio = Number(trade.volumeRatio || 0);
  const extensionAtr = Number(trade.extensionAtr || 0);
  const cleanPullback = cleanPullbackSetup(trade);
  const scoreOverride = usesScoreOverride(policy);
  const bullNormalTight = usesBullNormalTight(policy);
  const qualityFilter = isQualityFilterPolicy(policy);
  const symbolQuality = tradeSymbolQuality(trade, symbolQualityMap);

  if (isV59Policy(policy) && symbolQuality) {
    // v5.9 symbol-quality gate: the wider the universe gets, the harder weak symbols must work to earn active-scanner slots.
    if (symbolQuality.flag === "Review/remove") {
      const rescueSetup = score >= 99 && regime === "Bull" && cleanPullback && volumeRatio >= 1.15 && extensionAtr <= 1.25 && (state.includes("Bull recovery") || state.includes("Choppy") || state.includes("Weak"));
      return !rescueSetup;
    }
    if (symbolQuality.flag === "Watch") {
      const watchPass = score >= 94 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.45;
      return !watchPass;
    }
  }

  if (regime === "Panic") return true;
  if (regime === "Bear") return true;
  if (regime === "Neutral" && score < 95) return true;
  if ((state.includes("Failed leader") || state.includes("Bear transition"))) return true;

  // Choppy/no-edge made money, but too much v5.4 override hurt PF.
  // v5.5 keeps only elite choppy clean reclaim setups.
  if (state.includes("Choppy")) {
    if (qualityFilter) {
      return !(score >= 96 && regime === "Bull" && cleanPullback && volumeRatio >= 1.05 && extensionAtr <= 1.5);
    }
    const strictPass = score >= 93 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.6;
    const overridePass = isControlledOverridePolicy(policy)
      ? score >= 95 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.7
      : scoreOverride && score >= 90 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.7;
    return !(strictPass || overridePass);
  }

  // Healthy leader kept underperforming when the override became too loose.
  // v5.5 does not give Healthy leader an override pass.
  if (state.includes("Healthy leader")) {
    if (qualityFilter) {
      return !(score >= 88 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.35);
    }
    const strictPass = score >= 82 && regime === "Bull" && cleanPullback && extensionAtr <= 1.5;
    const overridePass = !isControlledOverridePolicy(policy) && scoreOverride && score >= 95 && regime === "Bull" && cleanPullback && volumeRatio >= 0.9 && extensionAtr <= 1.6;
    return !(strictPass || overridePass);
  }

  if (state.includes("Bull normal")) {
    if (qualityFilter) return !(score >= 96 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.4);
    if (bullNormalTight) return !(score >= 95 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.5);
    return !(score >= 78 && regime === "Bull" && cleanPullback && extensionAtr <= 1.8);
  }

  if (state.includes("Bull recovery")) {
    if (qualityFilter) return !(score >= 82 && regime === "Bull" && cleanPullback && volumeRatio >= 0.95 && extensionAtr <= 1.8);
    return !(score >= 70 && regime === "Bull" && cleanPullback && extensionAtr <= 2.2);
  }

  if (state.includes("Weak")) {
    if (qualityFilter) {
      const strictPass = score >= 94 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.5;
      const overridePass = score >= 98 && regime === "Bull" && cleanPullback && volumeRatio >= 1.05 && extensionAtr <= 1.45;
      return !(strictPass || overridePass);
    }
    const strictPass = score >= 90 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.6;
    const overridePass = isControlledOverridePolicy(policy)
      ? score >= 95 && regime === "Bull" && cleanPullback && volumeRatio >= 1 && extensionAtr <= 1.7
      : scoreOverride && score >= 95 && regime === "Bull" && cleanPullback && volumeRatio >= 0.9 && extensionAtr <= 1.8;
    return !(strictPass || overridePass);
  }

  return false;
}


function recentValues(values: number[], n: number): number[] {
  return values.slice(Math.max(0, values.length - n));
}

function avgNumber(values: number[]): number {
  return values.length ? values.reduce((sum, x) => sum + x, 0) / values.length : 0;
}

function profitFactorFromR(values: number[]): number {
  const gp = values.filter((x) => x > 0).reduce((sum, x) => sum + x, 0);
  const gl = Math.abs(values.filter((x) => x < 0).reduce((sum, x) => sum + x, 0));
  return gl > 0 ? gp / gl : gp > 0 ? 999 : 0;
}

function winRateFromR(values: number[]): number {
  const closed = values.filter((x) => x !== 0);
  if (!closed.length) return 0;
  return (closed.filter((x) => x > 0).length / closed.length) * 100;
}

function maxDrawdownRFromResults(values: number[]): number {
  let cumulative = 0;
  let peak = 0;
  let maxDd = 0;
  for (const r of values) {
    cumulative += r;
    peak = Math.max(peak, cumulative);
    maxDd = Math.max(maxDd, peak - cumulative);
  }
  return maxDd;
}

function initRollingSymbolStats(): RollingSymbolStats {
  return { results: [], skips: 0, lastReason: "" };
}

function rollingQualityDecision(trade: JournalTrade, stats: RollingSymbolStats | undefined, policy: AccountPolicy): { skip: boolean; reason: string; avgR: number; pf: number; winRate: number; dd: number; closed: number } {
  const results = stats?.results || [];
  const closed = results.length;
  if ((policy !== "V71_ACTIVE_QUALITY_GATE" && policy !== "V72_500_ACTIVE_QUALITY_GATE") || closed < 12) {
    return { skip: false, reason: "Not enough closed history", avgR: 0, pf: 0, winRate: 0, dd: 0, closed };
  }

  const last12 = recentValues(results, 12);
  const last20 = recentValues(results, 20);
  const last30 = recentValues(results, 30);
  const avg12 = avgNumber(last12);
  const avg20 = avgNumber(last20);
  const avg30 = avgNumber(last30);
  const pf12 = profitFactorFromR(last12);
  const pf20 = profitFactorFromR(last20);
  const pf30 = profitFactorFromR(last30);
  const win20 = winRateFromR(last20);
  const dd20 = maxDrawdownRFromResults(last20);
  const score = trade.score || 0;
  const state = trade.marketState || "";
  const regime = trade.marketRegime || "";
  const extensionAtr = Number(trade.extensionAtr || 0);
  const volumeRatio = Number(trade.volumeRatio || 0);
  const cleanPullback = cleanPullbackSetup(trade);
  const eliteRescue = score >= 99 && regime === "Bull" && cleanPullback && volumeRatio >= 1.2 && extensionAtr <= 1.25 && (state.includes("Bull recovery") || state.includes("Choppy") || state.includes("Weak") || state.includes("Bull normal"));

  let reason = "";
  if (closed >= 12 && avg12 <= -0.15 && pf12 < 0.8) reason = `last 12 setups avg ${Math.round(avg12 * 100) / 100}R / PF ${Math.round(pf12 * 100) / 100}`;
  if (!reason && closed >= 20 && avg20 <= -0.05 && pf20 < 0.95 && dd20 >= 5) reason = `last 20 setups weak: avg ${Math.round(avg20 * 100) / 100}R / PF ${Math.round(pf20 * 100) / 100} / DD ${Math.round(dd20 * 100) / 100}R`;
  if (!reason && closed >= 30 && avg30 < 0.03 && pf30 < 1.05 && win20 < 30) reason = `last 30 setups flat/weak: avg ${Math.round(avg30 * 100) / 100}R / PF ${Math.round(pf30 * 100) / 100}`;

  if (reason && !eliteRescue) {
    return { skip: true, reason, avgR: Math.round(avg20 * 100) / 100, pf: pf20 === 999 ? 999 : Math.round(pf20 * 100) / 100, winRate: Math.round(win20 * 10) / 10, dd: Math.round(dd20 * 100) / 100, closed };
  }

  return { skip: false, reason: eliteRescue && reason ? "Elite rescue allowed through rolling gate" : "Rolling quality acceptable", avgR: Math.round(avg20 * 100) / 100, pf: pf20 === 999 ? 999 : Math.round(pf20 * 100) / 100, winRate: Math.round(win20 * 10) / 10, dd: Math.round(dd20 * 100) / 100, closed };
}

function maxDrawdownFromEquityPoints(points: EquityPoint[]): { dollars: number; pct: number } {
  if (!points.length) return { dollars: 0, pct: 0 };
  let peak = points[0].value;
  let maxDd = 0;
  let maxPct = 0;
  for (const point of points) {
    peak = Math.max(peak, point.value);
    const dd = peak - point.value;
    const pct = peak > 0 ? (dd / peak) * 100 : 0;
    maxDd = Math.max(maxDd, dd);
    maxPct = Math.max(maxPct, pct);
  }
  return { dollars: Math.round(maxDd * 100) / 100, pct: Math.round(maxPct * 100) / 100 };
}

function downsampleEquityPoints(points: EquityPoint[], maxPoints = 900): EquityPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (last && sampled[sampled.length - 1]?.time !== last.time) sampled.push(last);
  return sampled;
}

function buildEqualWeightBuyHoldPoints(symbolHistories: Array<{ symbol: string; candles: Candle[] }>, startingBalance: number): EquityPoint[] {
  const usable = symbolHistories
    .map((item) => ({ ...item, candles: item.candles.filter((c) => Number.isFinite(c.close) && c.close > 0).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()) }))
    .filter((item) => item.candles.length >= 2);
  if (!usable.length) return [];

  const allocation = startingBalance / usable.length;
  const series = usable.map((item) => {
    const firstClose = item.candles[0].close;
    const shares = firstClose > 0 ? allocation / firstClose : 0;
    return { ...item, shares, index: 0, lastValue: allocation };
  });
  const timeSet = new Set<number>();
  for (const item of series) {
    for (const candle of item.candles) {
      const t = new Date(candle.time).getTime();
      if (Number.isFinite(t)) timeSet.add(t);
    }
  }
  const times = Array.from(timeSet).sort((a, b) => a - b);
  const points: EquityPoint[] = [];
  for (const t of times) {
    let total = 0;
    for (const item of series) {
      while (item.index < item.candles.length) {
        const candleTime = new Date(item.candles[item.index].time).getTime();
        if (!Number.isFinite(candleTime) || candleTime > t) break;
        item.lastValue = item.shares * item.candles[item.index].close;
        item.index += 1;
      }
      total += item.lastValue;
    }
    points.push({ time: new Date(t).toISOString(), value: Math.round(total * 100) / 100 });
  }
  return downsampleEquityPoints(points);
}


function pctChangeFromCandles(candles: Candle[], index: number, lookback: number): number | null {
  if (index < lookback || !candles[index] || !candles[index - lookback]) return null;
  const prev = candles[index - lookback].close;
  const cur = candles[index].close;
  if (!Number.isFinite(prev) || !Number.isFinite(cur) || prev <= 0) return null;
  return (cur / prev) - 1;
}

function smaFromCandles(candles: Candle[], index: number, lookback: number): number | null {
  if (index < lookback || !candles[index]) return null;
  let sum = 0;
  for (let i = index - lookback + 1; i <= index; i += 1) {
    const close = candles[i]?.close;
    if (!Number.isFinite(close) || close <= 0) return null;
    sum += close;
  }
  return sum / lookback;
}

function recentDrawdownFromCandles(candles: Candle[], index: number, lookback: number): number {
  const start = Math.max(0, index - lookback + 1);
  let peak = 0;
  for (let i = start; i <= index; i += 1) peak = Math.max(peak, candles[i]?.close || 0);
  const cur = candles[index]?.close || 0;
  return peak > 0 ? ((peak - cur) / peak) : 0;
}

function dynamicLeaderScore(candles: Candle[], index: number): number | null {
  // v6.4: past-data-only leader score. Uses only candles that already existed
  // at this rebalance moment. It rewards persistent strength and trend health,
  // and penalizes extended drawdowns / unstable charts.
  const rFast = pctChangeFromCandles(candles, index, 130);   // about one trading week on 15m US sessions
  const rMed = pctChangeFromCandles(candles, index, 520);    // about one month
  const rSlow = pctChangeFromCandles(candles, index, 1560);  // about one quarter
  const smaFast = smaFromCandles(candles, index, 260);
  const smaSlow = smaFromCandles(candles, index, 1040);
  if (rFast === null || rMed === null || rSlow === null || smaFast === null || smaSlow === null) return null;
  const close = candles[index].close;
  const drawdown = recentDrawdownFromCandles(candles, index, 520);
  let score = 0;
  score += rSlow * 95;
  score += rMed * 75;
  score += rFast * 35;
  score += close > smaSlow ? 8 : -18;
  score += smaFast > smaSlow ? 8 : -12;
  score -= Math.max(0, drawdown - 0.08) * 55;
  return Math.round(score * 100) / 100;
}

function buildDynamicLeaderSleeveSimulation(
  symbolHistories: Array<{ symbol: string; candles: Candle[] }> | undefined,
  startingBalance: number,
  maxLeaders = 5,
  rebalanceBars = 130,
): DynamicLeaderSleeveSimulation | undefined {
  const series = (symbolHistories || [])
    .map((item) => ({
      symbol: item.symbol,
      candles: item.candles
        .filter((c) => Number.isFinite(c.close) && c.close > 0 && Number.isFinite(new Date(c.time).getTime()))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
      index: -1,
      lastPrice: 0,
    }))
    .filter((item) => item.candles.length >= 1700);
  if (!series.length) return undefined;

  const timeSet = new Set<number>();
  for (const item of series) {
    for (const candle of item.candles) timeSet.add(new Date(candle.time).getTime());
  }
  const times = Array.from(timeSet).sort((a, b) => a - b);
  if (times.length < 1800) return undefined;

  let cash = startingBalance;
  let positions: Record<string, number> = {};
  let rebalanceCounter = rebalanceBars;
  const points: EquityPoint[] = [];
  const usage = new Map<string, number>();
  const rotationLog: LeaderRotationEntry[] = [];

  const currentValue = () => {
    let total = cash;
    for (const item of series) total += (positions[item.symbol] || 0) * item.lastPrice;
    return total;
  };

  const rebalance = (time: number) => {
    const scored = series
      .map((item) => ({ symbol: item.symbol, score: dynamicLeaderScore(item.candles, item.index), price: item.lastPrice }))
      .filter((x): x is { symbol: string; score: number; price: number } => x.score !== null && Number.isFinite(x.score) && x.score > 6 && x.price > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxLeaders);

    const equity = currentValue();
    cash = equity;
    positions = {};
    if (scored.length) {
      const allocation = equity / scored.length;
      for (const pick of scored) {
        positions[pick.symbol] = allocation / pick.price;
        cash -= allocation;
        usage.set(pick.symbol, (usage.get(pick.symbol) || 0) + 1);
      }
      const avgScore = Math.round((scored.reduce((sum, x) => sum + x.score, 0) / scored.length) * 100) / 100;
      rotationLog.push({ time: new Date(time).toISOString(), leaders: scored.map((x) => x.symbol).join(', '), avgScore });
    } else {
      rotationLog.push({ time: new Date(time).toISOString(), leaders: 'Cash', avgScore: 0 });
    }
  };

  for (let ti = 0; ti < times.length; ti += 1) {
    const t = times[ti];
    let havePrices = 0;
    for (const item of series) {
      while (item.index + 1 < item.candles.length && new Date(item.candles[item.index + 1].time).getTime() <= t) {
        item.index += 1;
        item.lastPrice = item.candles[item.index].close;
      }
      if (item.index >= 0 && item.lastPrice > 0) havePrices += 1;
    }
    if (havePrices < Math.max(3, Math.ceil(series.length * 0.6))) continue;

    if (rebalanceCounter >= rebalanceBars) {
      rebalance(t);
      rebalanceCounter = 0;
    } else {
      rebalanceCounter += 1;
    }

    const value = currentValue();
    if (Number.isFinite(value) && value > 0) points.push({ time: new Date(t).toISOString(), value: Math.round(value * 100) / 100 });
  }

  if (!points.length) return undefined;
  const dd = maxDrawdownFromEquityPoints(points);
  const ending = points[points.length - 1].value;
  const usageRows = Array.from(usage.entries())
    .map(([symbol, periods]) => ({ symbol, periods, pct: rotationLog.length ? Math.round((periods / rotationLog.length) * 1000) / 10 : 0 }))
    .sort((a, b) => b.periods - a.periods || a.symbol.localeCompare(b.symbol));

  return {
    sleeveEquityPoints: downsampleEquityPoints(points),
    sleeveEndingBalance: Math.round(ending * 100) / 100,
    sleeveMultiple: Math.round((ending / startingBalance) * 1000) / 1000,
    sleeveMaxDrawdownPct: dd.pct,
    rebalanceCount: rotationLog.length,
    leaderUsage: usageRows,
    rotationLog: rotationLog.slice(-18),
  };
}

function combineAllocatedEquityPoints(activePoints: EquityPoint[], sleevePoints: EquityPoint[], sleevePct: number): EquityPoint[] {
  if (!activePoints.length || !sleevePoints.length) return [];
  const activeAllocation = (100 - sleevePct) / 100;
  const sleeveAllocation = sleevePct / 100;
  const allTimes = Array.from(new Set([...activePoints, ...sleevePoints].map((p) => new Date(p.time).getTime()).filter((t) => Number.isFinite(t)))).sort((a, b) => a - b);
  let ai = 0;
  let si = 0;
  let activeValue = activePoints[0]?.value || 0;
  let sleeveValue = sleevePoints[0]?.value || 0;
  const combined: EquityPoint[] = [];
  for (const t of allTimes) {
    while (ai + 1 < activePoints.length && new Date(activePoints[ai + 1].time).getTime() <= t) {
      ai += 1;
      activeValue = activePoints[ai].value;
    }
    while (si + 1 < sleevePoints.length && new Date(sleevePoints[si + 1].time).getTime() <= t) {
      si += 1;
      sleeveValue = sleevePoints[si].value;
    }
    combined.push({ time: new Date(t).toISOString(), value: Math.round(((activeValue * activeAllocation) + (sleeveValue * sleeveAllocation)) * 100) / 100 });
  }
  return downsampleEquityPoints(combined);
}

function universalGroupSummary(label: string, trades: Array<{ trade: JournalTrade; pnl: number; resultR: number }>): UniversalGroupStats {
  const wins = trades.filter((x) => x.resultR > 0).length;
  const losses = trades.filter((x) => x.resultR < 0).length;
  const timeouts = trades.filter((x) => x.trade.status === "Timeout").length;
  const completed = wins + losses;
  const pnl = trades.reduce((sum, x) => sum + x.pnl, 0);
  const cumulativeR = trades.reduce((sum, x) => sum + x.resultR, 0);
  return {
    label,
    trades: trades.length,
    wins,
    losses,
    timeouts,
    winRate: completed ? Math.round((wins / completed) * 1000) / 10 : 0,
    pnl: Math.round(pnl * 100) / 100,
    avgPnl: trades.length ? Math.round((pnl / trades.length) * 100) / 100 : 0,
    cumulativeR: Math.round(cumulativeR * 100) / 100,
    avgR: trades.length ? Math.round((cumulativeR / trades.length) * 100) / 100 : 0,
  };
}

function groupUniversalTrades(
  accepted: Array<{ trade: JournalTrade; pnl: number; resultR: number }>,
  getter: (trade: JournalTrade) => string,
  baseLabels: string[] = []
): UniversalGroupStats[] {
  const labels = new Set(baseLabels);
  for (const item of accepted) labels.add(getter(item.trade) || "Unknown");
  return Array.from(labels)
    .filter(Boolean)
    .map((label) => universalGroupSummary(label, accepted.filter((x) => (getter(x.trade) || "Unknown") === label)))
    .sort((a, b) => b.pnl - a.pnl);
}

function rejectedOpportunity(trade: JournalTrade, reason: string, policy: AccountPolicy = "V53_STRICT", symbolQualityMap?: Record<string, SymbolQualityInfo>): RejectedOpportunity {
  return {
    symbol: trade.symbol,
    time: trade.signalTime,
    reason,
    score: trade.score || 0,
    state: trade.marketState || "Unknown",
    regime: trade.marketRegime || "Unknown",
    setup: trade.setupType || "Unknown",
    resultR: Math.round((trade.resultR || 0) * 100) / 100,
    priority: Math.round(realisticTradePriority(trade, policy, symbolQualityMap) * 100) / 100,
  };
}

function groupRejectedByState(rejected: RejectedOpportunity[]): RejectedGroupStats[] {
  const grouped = new Map<string, RejectedOpportunity[]>();
  for (const item of rejected) {
    const key = item.state || "Unknown";
    grouped.set(key, [...(grouped.get(key) || []), item]);
  }
  return Array.from(grouped.entries()).map(([label, items]) => {
    const total = items.reduce((sum, x) => sum + x.resultR, 0);
    return {
      label,
      rejected: items.length,
      positiveRejected: items.filter((x) => x.resultR > 0).length,
      totalRejectedR: Math.round(total * 100) / 100,
      avgRejectedR: items.length ? Math.round((total / items.length) * 100) / 100 : 0,
    };
  }).sort((a, b) => b.totalRejectedR - a.totalRejectedR);
}

function buildRDiagnostics(accepted: Array<{ trade: JournalTrade; pnl: number; resultR: number }>) {
  const ordered = accepted.slice().sort((a, b) => {
    const at = new Date(a.trade.resolvedAt || a.trade.signalTime).getTime();
    const bt = new Date(b.trade.resolvedAt || b.trade.signalTime).getTime();
    return at - bt;
  });
  let cumulative = 0;
  let peak = 0;
  let rollingPeak = 0;
  let rollingDrawdownR = 0;
  const cumulativeRPoints: EquityPoint[] = [];
  for (const item of ordered) {
    cumulative += item.resultR;
    peak = Math.max(peak, cumulative);
    rollingPeak = Math.max(rollingPeak, cumulative);
    rollingDrawdownR = Math.max(rollingDrawdownR, rollingPeak - cumulative);
    cumulativeRPoints.push({ time: item.trade.resolvedAt || item.trade.signalTime, value: Math.round(cumulative * 100) / 100 });
  }
  const finalR = cumulativeRPoints[cumulativeRPoints.length - 1]?.value || 0;
  const idealRPoints = cumulativeRPoints.map((point, index) => ({
    time: point.time,
    value: Math.round((finalR * ((index + 1) / Math.max(1, cumulativeRPoints.length))) * 100) / 100,
  }));
  const last30 = ordered.slice(-30).map((x) => x.resultR);
  const rollingAvgR30 = last30.length ? Math.round((last30.reduce((a, b) => a + b, 0) / last30.length) * 100) / 100 : 0;
  const last50 = ordered.slice(-50);
  const grossProfit50 = last50.filter((x) => x.resultR > 0).reduce((sum, x) => sum + x.resultR, 0);
  const grossLoss50 = Math.abs(last50.filter((x) => x.resultR < 0).reduce((sum, x) => sum + x.resultR, 0));
  const rollingProfitFactor50 = grossLoss50 > 0 ? Math.round((grossProfit50 / grossLoss50) * 100) / 100 : grossProfit50 > 0 ? 999 : 0;
  const deviations = cumulativeRPoints.map((point, index) => Math.abs(point.value - (idealRPoints[index]?.value || 0)));
  const avgDeviation = deviations.length ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
  const totalAbsR = Math.max(1, Math.abs(finalR));
  const rCurveConsistency = Math.max(0, Math.min(100, Math.round(100 - (avgDeviation / totalAbsR) * 100)));
  const profits = accepted.filter((x) => x.pnl > 0).map((x) => x.pnl).sort((a, b) => b - a);
  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const top10ProfitPct = totalProfit > 0 ? Math.round((profits.slice(0, 10).reduce((a, b) => a + b, 0) / totalProfit) * 1000) / 10 : 0;
  const top25ProfitPct = totalProfit > 0 ? Math.round((profits.slice(0, 25).reduce((a, b) => a + b, 0) / totalProfit) * 1000) / 10 : 0;
  const bySymbol = new Map<string, number>();
  for (const item of accepted) bySymbol.set(item.trade.symbol, (bySymbol.get(item.trade.symbol) || 0) + item.pnl);
  const bestSymbolPnl = Math.max(0, ...Array.from(bySymbol.values()));
  const totalNetProfit = accepted.reduce((sum, x) => sum + x.pnl, 0);
  const bestSymbolProfitPct = totalNetProfit > 0 ? Math.round((bestSymbolPnl / totalNetProfit) * 1000) / 10 : 0;

  return {
    cumulativeRPoints,
    idealRPoints,
    rollingAvgR30,
    rollingProfitFactor50,
    rollingDrawdownR: Math.round(rollingDrawdownR * 100) / 100,
    rCurveConsistency,
    top10ProfitPct,
    top25ProfitPct,
    bestSymbolProfitPct,
  };
}


function calcTradeWindowAudit(label: string, items: Array<{ trade: JournalTrade; pnl: number; resultR: number }>): TradeWindowAudit {
  const results = items.map((x) => x.resultR || 0);
  const totalR = results.reduce((sum, x) => sum + x, 0);
  const wins = results.filter((x) => x > 0).length;
  const losses = results.filter((x) => x < 0).length;
  const grossProfitR = results.filter((x) => x > 0).reduce((sum, x) => sum + x, 0);
  const grossLossR = Math.abs(results.filter((x) => x < 0).reduce((sum, x) => sum + x, 0));
  let cumulative = 0;
  let peak = 0;
  let maxDrawdownR = 0;
  let currentLossStreak = 0;
  let longestLossStreak = 0;
  for (const r of results) {
    cumulative += r;
    peak = Math.max(peak, cumulative);
    maxDrawdownR = Math.max(maxDrawdownR, peak - cumulative);
    if (r < 0) {
      currentLossStreak += 1;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else if (r > 0) {
      currentLossStreak = 0;
    }
  }
  const startTime = items[0]?.trade.signalTime || "";
  const endTime = items[items.length - 1]?.trade.resolvedAt || items[items.length - 1]?.trade.signalTime || "";
  const avgR = items.length ? totalR / items.length : 0;
  const pf = grossLossR > 0 ? grossProfitR / grossLossR : grossProfitR > 0 ? 999 : 0;
  const ready = items.length >= 100 && totalR > 0 && avgR > 0.05 && pf >= 1.1 && maxDrawdownR <= Math.max(25, Math.abs(totalR) * 0.8);
  const note = items.length < 100
    ? "Not enough trades yet"
    : ready
      ? "Passes basic 100-trade paper-test threshold"
      : "Needs review before paper/live testing";
  return {
    label,
    trades: items.length,
    startTime,
    endTime,
    totalR: Math.round(totalR * 100) / 100,
    avgR: Math.round(avgR * 100) / 100,
    profitFactor: pf === 999 ? 999 : Math.round(pf * 100) / 100,
    winRate: wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0,
    maxDrawdownR: Math.round(maxDrawdownR * 100) / 100,
    longestLossStreak,
    grossProfitR: Math.round(grossProfitR * 100) / 100,
    grossLossR: Math.round(grossLossR * 100) / 100,
    ready,
    note,
  };
}

function buildTradeWindowAudits(accepted: Array<{ trade: JournalTrade; pnl: number; resultR: number }>, windowSize = 100): TradeWindowAudit[] {
  const ordered = accepted.slice().sort((a, b) => {
    const at = new Date(a.trade.resolvedAt || a.trade.signalTime).getTime();
    const bt = new Date(b.trade.resolvedAt || b.trade.signalTime).getTime();
    return at - bt;
  });
  if (!ordered.length) return [];
  const rows: TradeWindowAudit[] = [];
  const first = ordered.slice(0, Math.min(windowSize, ordered.length));
  rows.push(calcTradeWindowAudit(`First ${first.length} accepted trades`, first));
  const latest = ordered.slice(Math.max(0, ordered.length - windowSize));
  rows.push(calcTradeWindowAudit(`Latest ${latest.length} accepted trades`, latest));
  if (ordered.length >= windowSize) {
    let worstStart = 0;
    let bestStart = 0;
    let worstTotal = Number.POSITIVE_INFINITY;
    let bestTotal = Number.NEGATIVE_INFINITY;
    for (let i = 0; i <= ordered.length - windowSize; i += 1) {
      const total = ordered.slice(i, i + windowSize).reduce((sum, x) => sum + (x.resultR || 0), 0);
      if (total < worstTotal) {
        worstTotal = total;
        worstStart = i;
      }
      if (total > bestTotal) {
        bestTotal = total;
        bestStart = i;
      }
    }
    rows.push(calcTradeWindowAudit(`Worst rolling ${windowSize}-trade window`, ordered.slice(worstStart, worstStart + windowSize)));
    rows.push(calcTradeWindowAudit(`Best rolling ${windowSize}-trade window`, ordered.slice(bestStart, bestStart + windowSize)));
  }
  return rows;
}

function simulateBasketPortfolio(params: {
  trades: JournalTrade[];
  startingBalance: number;
  riskPercent: number;
  fixedRiskDollars: number;
  riskModel: RiskModel;
  maxOpenTrades: number;
  maxTotalRiskPct: number;
  realisticSettings: RealisticAccountSettings;
  buyHoldEndingBalance?: number;
  buyHoldEquityPoints?: EquityPoint[];
  accountPolicy?: AccountPolicy;
  symbolQualityMap?: Record<string, SymbolQualityInfo>;
  symbolHistories?: Array<{ symbol: string; candles: Candle[] }>;
}): BasketPortfolioSummary {
  const realistic = params.realisticSettings;
  const accountPolicy = params.accountPolicy || "V53_STRICT";
  const symbolQualityMap = params.symbolQualityMap;
  const candidates = params.trades
    .filter((t) => Number.isFinite(t.resultR || 0) && t.resolvedAt)
    .sort((a, b) => {
      const at = new Date(a.signalTime).getTime();
      const bt = new Date(b.signalTime).getTime();
      if (at !== bt) return at - bt;
      const pa = realisticTradePriority(a, accountPolicy, symbolQualityMap);
      const pb = realisticTradePriority(b, accountPolicy, symbolQualityMap);
      if (pa !== pb) return pb - pa;
      return (b.score || 0) - (a.score || 0);
    });

  type OpenPosition = {
    trade: JournalTrade;
    shares: number;
    positionValue: number;
    riskDollars: number;
    reservedCash: number;
    resolvedMs: number;
    stateCapBypass: boolean;
  };

  let cash = params.startingBalance;
  const open: OpenPosition[] = [];
  const accepted: Array<{ trade: JournalTrade; pnl: number; resultR: number; riskDollars: number; positionValue: number }> = [];
  let skippedBuyingPower = 0;
  let skippedNoShorts = 0;
  let skippedWholeShare = 0;
  let skippedMaxOpen = 0;
  let skippedMaxRisk = 0;
  let skippedLowQuality = 0;
  let skippedRollingQuality = 0;
  const rollingSymbolStats: Record<string, RollingSymbolStats> = {};
  const rollingQualityAuditMap: Record<string, RollingQualityGateAudit> = {};
  let skippedStateCap = 0;
  let stateCapBypasses = 0;
  let actualRiskPctSum = 0;
  let targetRiskHitCount = 0;
  let positionCapLimitedTrades = 0;
  let buyingPowerLimitedTrades = 0;
  let cashUsedPctSum = 0;
  let unusedCashPctSum = 0;
  let usageSamples = 0;
  let maxCashUsedPct = 0;
  const skippedOpportunities: RejectedOpportunity[] = [];

  const equityNow = () => cash + open.reduce((sum, p) => sum + p.reservedCash, 0);
  const openRiskDollars = () => open.reduce((sum, p) => sum + p.riskDollars, 0);
  const openPositionValue = () => open.reduce((sum, p) => sum + p.positionValue, 0);

  const equityPoints: EquityPoint[] = candidates.length ? [{ time: candidates[0].signalTime, value: Math.round(params.startingBalance * 100) / 100 }] : [];

  const recordUsage = () => {
    const equity = Math.max(equityNow(), 0.000001);
    const reserved = open.reduce((sum, p) => sum + p.reservedCash, 0);
    const usedPct = Math.max(0, Math.min(100, (reserved / equity) * 100));
    const unusedPct = Math.max(0, Math.min(100, (cash / equity) * 100));
    cashUsedPctSum += usedPct;
    unusedCashPctSum += unusedPct;
    usageSamples += 1;
    maxCashUsedPct = Math.max(maxCashUsedPct, usedPct);
  };

  const closeDuePositions = (timeMs: number, timeLabel: string) => {
    open.sort((a, b) => a.resolvedMs - b.resolvedMs);
    let closedAny = false;
    while (open.length && open[0].resolvedMs <= timeMs) {
      const pos = open.shift()!;
      const pnl = (pos.trade.resultR || 0) * pos.riskDollars;
      cash += pos.reservedCash + pnl;
      const equity = equityNow();
      accepted.push({ trade: pos.trade, pnl, resultR: pos.trade.resultR || 0, riskDollars: pos.riskDollars, positionValue: pos.positionValue });
      const statKey = pos.trade.symbol.toUpperCase();
      const stat = rollingSymbolStats[statKey] || initRollingSymbolStats();
      stat.results.push(pos.trade.resultR || 0);
      if (stat.results.length > 60) stat.results.shift();
      rollingSymbolStats[statKey] = stat;
      equityPoints.push({ time: pos.trade.resolvedAt || timeLabel, value: Math.round(equity * 100) / 100 });
      closedAny = true;
    }
    if (!closedAny && equityPoints.length === 0) equityPoints.push({ time: timeLabel, value: Math.round(equityNow() * 100) / 100 });
  };

  for (const trade of candidates) {
    const signalMs = new Date(trade.signalTime).getTime();
    const resolvedMs = new Date(trade.resolvedAt || trade.signalTime).getTime();
    if (!Number.isFinite(signalMs) || !Number.isFinite(resolvedMs)) continue;
    closeDuePositions(signalMs, trade.signalTime);

    if (trade.bias === "Short" && !realistic.allowShorts) {
      skippedNoShorts += 1;
      skippedOpportunities.push(rejectedOpportunity(trade, "no shorts", accountPolicy, symbolQualityMap));
      continue;
    }

    const cashLongOnly = realistic.accountType === "Cash" && !realistic.allowShorts;
    if (cashLongOnly && (accountPolicy === "V71_ACTIVE_QUALITY_GATE" || accountPolicy === "V72_500_ACTIVE_QUALITY_GATE")) {
      const statKey = trade.symbol.toUpperCase();
      const decision = rollingQualityDecision(trade, rollingSymbolStats[statKey], accountPolicy);
      if (decision.skip) {
        skippedRollingQuality += 1;
        skippedLowQuality += 1;
        const stat = rollingSymbolStats[statKey] || initRollingSymbolStats();
        stat.skips += 1;
        stat.lastReason = decision.reason;
        rollingSymbolStats[statKey] = stat;
        rollingQualityAuditMap[statKey] = {
          symbol: statKey,
          skips: stat.skips,
          closedTrades: decision.closed,
          lastAvgR: decision.avgR,
          lastPf: decision.pf,
          lastWinRate: decision.winRate,
          maxRecentDrawdownR: decision.dd,
          reason: decision.reason,
        };
        skippedOpportunities.push(rejectedOpportunity(trade, "rolling symbol quality gate", accountPolicy, symbolQualityMap));
        continue;
      }
    }
    if (cashLongOnly && shouldSkipLowQualityCashLong(trade, accountPolicy, symbolQualityMap)) {
      skippedLowQuality += 1;
      skippedOpportunities.push(rejectedOpportunity(trade, "low quality cash filter", accountPolicy, symbolQualityMap));
      continue;
    }

    let acceptedViaStateCapBypass = false;
    if (cashLongOnly) {
      const cap = stateOpenCap(trade, accountPolicy);
      const state = tradeStateLabel(trade);
      const openSameState = open.filter((p) => tradeStateLabel(p.trade) === state).length;
      if (cap <= 0 || openSameState >= cap) {
        if (canBypassStateCap(trade, accountPolicy, symbolQualityMap)) {
          const openBypassCount = open.filter((p) => p.stateCapBypass).length;
          if (openBypassCount >= maxStateCapBypassOpen(accountPolicy)) {
            skippedStateCap += 1;
            skippedOpportunities.push(rejectedOpportunity(trade, "state cap bypass limit", accountPolicy, symbolQualityMap));
            continue;
          }
          stateCapBypasses += 1;
          acceptedViaStateCapBypass = true;
        } else {
          skippedStateCap += 1;
          skippedOpportunities.push(rejectedOpportunity(trade, "state cap", accountPolicy, symbolQualityMap));
          continue;
        }
      }
    }

    const equity = equityNow();
    if (equity <= 0) {
      skippedBuyingPower += 1;
      skippedOpportunities.push(rejectedOpportunity(trade, "no equity/buying power", accountPolicy, symbolQualityMap));
      continue;
    }

    if (params.maxOpenTrades > 0 && open.length >= params.maxOpenTrades) {
      skippedMaxOpen += 1;
      skippedOpportunities.push(rejectedOpportunity(trade, "max open trades", accountPolicy, symbolQualityMap));
      continue;
    }

    const targetRiskDollars = params.riskModel === "Percent" ? equity * (params.riskPercent / 100) : params.fixedRiskDollars;
    const riskPerShare = tradeRiskPerShareLocal(trade);
    const rawShares = targetRiskDollars / riskPerShare;
    const marginMultiplier = realistic.accountType === "Margin" ? Math.max(1, realistic.marginMultiplier || 1) : 1;
    const grossBuyingPower = realistic.accountType === "Margin"
      ? Math.max(0, equity * marginMultiplier - openPositionValue())
      : Math.max(0, cash);
    const maxPositionByPct = equity * (Math.max(0.01, realistic.maxPositionPct || 100) / 100);
    const maxPositionValue = Math.max(0, Math.min(grossBuyingPower, maxPositionByPct));
    const rawPositionValue = rawShares * trade.entry;
    const limitedByPositionCap = rawPositionValue > maxPositionByPct + 0.000001 && maxPositionByPct <= grossBuyingPower + 0.000001;
    const limitedByBuyingPowerCap = rawPositionValue > grossBuyingPower + 0.000001 && grossBuyingPower < maxPositionByPct - 0.000001;
    const sharesByBuyingPower = trade.entry > 0 ? maxPositionValue / trade.entry : 0;
    let shares = Math.min(rawShares, sharesByBuyingPower);
    if (!realistic.allowFractionalShares) shares = Math.floor(shares);

    if (!Number.isFinite(shares) || shares <= 0) {
      if (!realistic.allowFractionalShares && rawShares > 0) {
        skippedWholeShare += 1;
        skippedOpportunities.push(rejectedOpportunity(trade, "whole-share limit", accountPolicy, symbolQualityMap));
      } else {
        skippedBuyingPower += 1;
        skippedOpportunities.push(rejectedOpportunity(trade, "buying power", accountPolicy, symbolQualityMap));
      }
      continue;
    }

    const positionValue = shares * trade.entry;
    const actualRiskDollars = shares * riskPerShare;
    const actualRiskPct = equity > 0 ? (actualRiskDollars / equity) * 100 : 0;
    actualRiskPctSum += actualRiskPct;
    if (targetRiskDollars > 0 && actualRiskDollars >= targetRiskDollars * 0.995) targetRiskHitCount += 1;
    if (limitedByPositionCap) positionCapLimitedTrades += 1;
    if (limitedByBuyingPowerCap) buyingPowerLimitedTrades += 1;
    const plannedRiskPct = ((openRiskDollars() + actualRiskDollars) / equity) * 100;
    if (params.maxTotalRiskPct > 0 && plannedRiskPct > params.maxTotalRiskPct + 0.000001) {
      skippedMaxRisk += 1;
      skippedOpportunities.push(rejectedOpportunity(trade, "max total risk", accountPolicy, symbolQualityMap));
      continue;
    }

    const reservedCash = realistic.accountType === "Margin" ? Math.min(cash, positionValue / marginMultiplier) : positionValue;
    if (reservedCash > cash + 0.000001) {
      skippedBuyingPower += 1;
      skippedOpportunities.push(rejectedOpportunity(trade, "cash reserve", accountPolicy, symbolQualityMap));
      continue;
    }

    cash -= reservedCash;
    open.push({ trade, shares, positionValue, riskDollars: actualRiskDollars, reservedCash, resolvedMs, stateCapBypass: acceptedViaStateCapBypass });
    equityPoints.push({ time: trade.signalTime, value: Math.round(equityNow() * 100) / 100 });
    recordUsage();
  }

  closeDuePositions(Number.POSITIVE_INFINITY, candidates[candidates.length - 1]?.resolvedAt || candidates[candidates.length - 1]?.signalTime || new Date().toISOString());
  const endingBalance = Math.max(0, equityNow());
  const dd = maxDrawdownFromEquityPoints(equityPoints);
  const totalPnl = accepted.reduce((sum, x) => sum + x.pnl, 0);
  const grossProfit = accepted.filter((x) => x.pnl > 0).reduce((sum, x) => sum + x.pnl, 0);
  const grossLoss = Math.abs(accepted.filter((x) => x.pnl < 0).reduce((sum, x) => sum + x.pnl, 0));
  const wins = accepted.filter((x) => x.pnl > 0).length;
  const losses = accepted.filter((x) => x.pnl < 0).length;
  const totalR = accepted.reduce((sum, x) => sum + x.resultR, 0);
  const buyHoldEndingBalance = params.buyHoldEndingBalance || 0;
  const rDiagnostics = buildRDiagnostics(accepted);
  const tradeWindowAudits = buildTradeWindowAudits(accepted, 100);
  const latest100TradeAudit = tradeWindowAudits.find((x) => x.label.startsWith("Latest"));
  const worst100TradeAudit = tradeWindowAudits.find((x) => x.label.startsWith("Worst rolling"));
  const topRejected = skippedOpportunities
    .filter((x) => x.resultR > 0)
    .sort((a, b) => (b.resultR - a.resultR) || (b.priority - a.priority))
    .slice(0, 12);
  const leaderSleeveStats = buildDynamicLeaderSleeveSimulation(params.symbolHistories, params.startingBalance);
  const leaderSleeveEquityPoints = leaderSleeveStats ? combineAllocatedEquityPoints(equityPoints, leaderSleeveStats.sleeveEquityPoints, 25) : undefined;
  const leaderSleeveOnlyPoints = leaderSleeveStats?.sleeveEquityPoints;

  return {
    startingBalance: params.startingBalance,
    endingBalance: Math.round(endingBalance * 100) / 100,
    netProfit: Math.round((endingBalance - params.startingBalance) * 100) / 100,
    returnPct: params.startingBalance > 0 ? Math.round(((endingBalance - params.startingBalance) / params.startingBalance) * 10000) / 100 : 0,
    maxDrawdownDollars: dd.dollars,
    maxDrawdownPct: dd.pct,
    acceptedTrades: accepted.length,
    skippedTrades: skippedBuyingPower + skippedNoShorts + skippedWholeShare + skippedMaxOpen + skippedMaxRisk + skippedLowQuality + skippedStateCap,
    skippedBuyingPower,
    skippedNoShorts,
    skippedWholeShare,
    skippedMaxOpen,
    skippedMaxRisk,
    skippedLowQuality,
    skippedRollingQuality,
    rollingQualityGateAudit: Object.values(rollingQualityAuditMap).sort((a, b) => b.skips - a.skips).slice(0, 18),
    skippedStateCap,
    maxOpenTrades: params.maxOpenTrades,
    maxTotalRiskPct: params.maxTotalRiskPct,
    riskPercent: params.riskPercent,
    accountPolicy,
    accountPolicyLabel: ACCOUNT_POLICY_LABELS[accountPolicy],
    stateCapBypasses,
    avgActualRiskPct: accepted.length ? Math.round((actualRiskPctSum / accepted.length) * 100) / 100 : 0,
    targetRiskHitPct: accepted.length ? Math.round((targetRiskHitCount / accepted.length) * 1000) / 10 : 0,
    positionCapLimitedTrades,
    buyingPowerLimitedTrades,
    accountType: realistic.accountType,
    allowShorts: realistic.allowShorts,
    allowFractionalShares: realistic.allowFractionalShares,
    maxPositionPct: realistic.maxPositionPct,
    avgCashUsedPct: usageSamples ? Math.round((cashUsedPctSum / usageSamples) * 100) / 100 : 0,
    maxCashUsedPct: Math.round(maxCashUsedPct * 100) / 100,
    avgUnusedCashPct: usageSamples ? Math.round((unusedCashPctSum / usageSamples) * 100) / 100 : 100,
    buyHoldEndingBalance: Math.round(buyHoldEndingBalance * 100) / 100,
    strategyVsBuyHold: buyHoldEndingBalance ? Math.round((endingBalance - buyHoldEndingBalance) * 100) / 100 : 0,
    buyHoldEquityPoints: params.buyHoldEquityPoints,
    leaderSleeveEquityPoints,
    leaderSleeveOnlyPoints,
    leaderSleeveStats,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0,
    winRate: wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0,
    avgTradePnl: accepted.length ? Math.round((totalPnl / accepted.length) * 100) / 100 : 0,
    totalR: Math.round(totalR * 100) / 100,
    returnToDrawdown: dd.pct > 0 ? Math.round(((((endingBalance - params.startingBalance) / params.startingBalance) * 100) / dd.pct) * 100) / 100 : 0,
    longTrades: accepted.filter((x) => x.trade.bias === "Long").length,
    shortTrades: accepted.filter((x) => x.trade.bias === "Short").length,
    equityPoints,
    bySymbol: groupUniversalTrades(accepted, (t) => t.symbol),
    byState: groupUniversalTrades(accepted, (t) => t.marketState || "Unknown", ["Healthy leader", "Failed leader", "Bear transition", "Bull recovery", "Explosive leader", "Weak/laggard", "Choppy/no edge", "Tradable normal"]),
    byRegime: groupUniversalTrades(accepted, (t) => t.marketRegime || "Unknown", ["Bull", "Neutral", "Bear", "Panic"]),
    ...rDiagnostics,
    tradeWindowAudits,
    latest100TradeAudit,
    worst100TradeAudit,
    topRejected,
    rejectedByState: groupRejectedByState(skippedOpportunities),
  };
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="stat-card">
      <div className="muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {helper ? <div className="muted tiny">{helper}</div> : null}
    </div>
  );
}

function EquityCurve({ values, points, label }: { values?: number[]; points?: EquityPoint[]; label?: string }) {
  const sourcePoints: EquityPoint[] = points?.length
    ? points
    : (values || []).map((value, index) => ({ time: String(index), value }));

  if (!sourcePoints.length) return <div className="chart-empty small-chart">No equity curve yet.</div>;

  const width = 700;
  const height = 180;
  const valuesOnly = sourcePoints.map((p) => p.value);
  const min = Math.min(...valuesOnly, 0);
  const max = Math.max(...valuesOnly, 0);
  const range = max - min || 1;
  const times = sourcePoints.map((p) => new Date(p.time).getTime());
  const validTimes = times.filter((t) => Number.isFinite(t));
  const minTime = validTimes.length ? Math.min(...validTimes) : 0;
  const maxTime = validTimes.length ? Math.max(...validTimes) : sourcePoints.length - 1;
  const timeRange = maxTime - minTime || 1;

  const coords = sourcePoints.map((point, index) => {
    const t = new Date(point.time).getTime();
    const x = Number.isFinite(t) && validTimes.length > 1 ? ((t - minTime) / timeRange) * width : (sourcePoints.length === 1 ? width : (index / (sourcePoints.length - 1)) * width);
    const y = height - ((point.value - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  const zeroY = height - ((0 - min) / range) * height;
  const startLabel = sourcePoints[0]?.time && new Date(sourcePoints[0].time).toString() !== "Invalid Date" ? formatDateTime(sourcePoints[0].time) : "Start";
  const endLabel = sourcePoints[sourcePoints.length - 1]?.time && new Date(sourcePoints[sourcePoints.length - 1].time).toString() !== "Invalid Date" ? formatDateTime(sourcePoints[sourcePoints.length - 1].time) : "End";

  return (
    <div className="dated-chart-wrap">
      {label ? <div className="muted tiny chart-label">{label}</div> : null}
      <svg className="equity-curve" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1="0" x2={width} y1={zeroY} y2={zeroY} className="zero-line" />
        <polyline points={coords} className="equity-line" fill="none" />
      </svg>
      <div className="axis-labels"><span>{startLabel}</span><span>{endLabel}</span></div>
    </div>
  );
}

function BasketRConsistencyChart({ summary }: { summary: BasketPortfolioSummary }) {
  const actualPoints = summary.cumulativeRPoints || [];
  const idealPoints = summary.idealRPoints || [];
  if (!actualPoints.length) return <div className="chart-empty small-chart">No accepted-trade R curve yet.</div>;

  const width = 700;
  const height = 190;
  const values = [...actualPoints.map((p) => p.value), ...idealPoints.map((p) => p.value), 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const times = actualPoints.map((p) => new Date(p.time).getTime()).filter((t) => Number.isFinite(t));
  const minTime = times.length ? Math.min(...times) : 0;
  const maxTime = times.length ? Math.max(...times) : actualPoints.length - 1;
  const timeRange = maxTime - minTime || 1;
  const pointToCoord = (point: EquityPoint, index: number, total: number) => {
    const t = new Date(point.time).getTime();
    const x = Number.isFinite(t) && times.length > 1 ? ((t - minTime) / timeRange) * width : (total === 1 ? width : (index / (total - 1)) * width);
    const y = height - ((point.value - min) / range) * height;
    return `${x},${y}`;
  };
  const actual = actualPoints.map((p, i) => pointToCoord(p, i, actualPoints.length)).join(" ");
  const ideal = idealPoints.map((p, i) => pointToCoord(p, i, idealPoints.length)).join(" ");
  const zeroY = height - ((0 - min) / range) * height;

  return (
    <div className="dated-chart-wrap">
      <div className="mini-grid wide">
        <StatCard label="Accepted cumulative R" value={`${summary.totalR}R`} />
        <StatCard label="R curve consistency" value={`${summary.rCurveConsistency}/100`} helper="Actual R vs straight-line R" />
        <StatCard label="Latest 30-trade avg R" value={`${summary.rollingAvgR30}R`} />
        <StatCard label="Latest 50-trade PF" value={summary.rollingProfitFactor50 === 999 ? "∞" : summary.rollingProfitFactor50} />
        <StatCard label="Max R drawdown" value={`${summary.rollingDrawdownR}R`} />
      </div>
      <svg className="equity-curve" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1="0" x2={width} y1={zeroY} y2={zeroY} className="zero-line" />
        <polyline points={ideal} className="ideal-line" fill="none" />
        <polyline points={actual} className="equity-line" fill="none" />
      </svg>
      <div className="axis-labels"><span>Start</span><span>Accepted-trades cumulative R vs ideal straight-line R</span><span>End</span></div>
    </div>
  );
}

function RejectedOpportunitiesTable({ rows }: { rows: RejectedOpportunity[] }) {
  if (!rows.length) return null;
  return (
    <div className="breakdown-card">
      <h4>Top rejected winners</h4>
      <p className="muted tiny">Retrospective diagnostic: these were positive-R signals the realistic account skipped because of buying power, max-open, risk, or filters.</p>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Symbol</th><th>Reason</th><th>Score</th><th>State</th><th>Regime</th><th>Setup</th><th>Future R</th><th>Time</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={`${r.symbol}-${r.time}-${i}`}>
              <td>{r.symbol}</td>
              <td>{r.reason}</td>
              <td>{r.score}</td>
              <td>{r.state}</td>
              <td>{r.regime}</td>
              <td>{r.setup}</td>
              <td>{r.resultR}R</td>
              <td>{formatDateTime(r.time)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function RejectedByStateTable({ rows }: { rows: RejectedGroupStats[] }) {
  const shown = rows.filter((r) => r.rejected > 0).slice(0, 12);
  if (!shown.length) return null;
  return (
    <div className="breakdown-card">
      <h4>Rejected opportunities by state</h4>
      <p className="muted tiny">Retrospective diagnostic: shows which states had the most skipped future R, so we can tell if the new filters are too strict.</p>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>State</th><th>Rejected</th><th>Positive rejected</th><th>Total rejected R</th><th>Avg rejected R</th></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.rejected}</td>
              <td>{r.positiveRejected}</td>
              <td>{r.totalRejectedR}R</td>
              <td>{r.avgRejectedR}R</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}


export default function Home() {
  const [symbol, setSymbol] = useState("SPY");
  const [timeframe, setTimeframe] = useState<Timeframe>("15Min");
  const [marketDataSource, setMarketDataSource] = useState<ApiDataSource>("Alpaca");
  const [mode, setMode] = useState<AppMode>("Research");
  const [researchMode, setResearchMode] = useState(false);
  const [csv, setCsv] = useState(sampleCsv());
  const [candles, setCandles] = useState<Candle[]>(() => parseCsvCandles(sampleCsv()));
  const [grade, setGrade] = useState<GradeResult | null>(() => gradeSetup(parseCsvCandles(sampleCsv()), "15Min"));
  const [journal, setJournal] = useState<JournalTrade[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready.");
  const [isLoading, setIsLoading] = useState(false);

  const [liveRefresh, setLiveRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(30);
  const [autoCheck, setAutoCheck] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [minScore, setMinScore] = useState(80);
  const [maxScore, setMaxScore] = useState(89);
  const [minRR, setMinRR] = useState(1.0);
  const [cooldownMinutes, setCooldownMinutes] = useState(15);
  const [maxStaleMinutes, setMaxStaleMinutes] = useState(20);
  const [targetMode, setTargetMode] = useState<TargetMode>("Structure");
  const [gradeProfile, setGradeProfile] = useState<GradeProfile>("Pullback");
  const [fixedTargetR, setFixedTargetR] = useState(1.6);
  const [atrTargetMultiple, setAtrTargetMultiple] = useState(2.0);
  const [noOvernightHolds, setNoOvernightHolds] = useState(false);

  const [btStart, setBtStart] = useState("2020-09-15");
  const [btEnd, setBtEnd] = useState("2026-05-31");
  const [btDataSource, setBtDataSource] = useState<BacktestDataSource>("Alpaca");
  const [alpacaAdjustment, setAlpacaAdjustment] = useState<AlpacaAdjustment>("split");
  const [historicalCsv, setHistoricalCsv] = useState("");
  const [historicalFileName, setHistoricalFileName] = useState("");
  const [btMinScore, setBtMinScore] = useState(60);
  const [btMaxScore, setBtMaxScore] = useState(100);
  const [btMinRR, setBtMinRR] = useState(1.0);
  const [btCooldown, setBtCooldown] = useState(60);
  const [btMaxBars, setBtMaxBars] = useState(120);
  const [btWarmup, setBtWarmup] = useState(200);
  const [btOneAtATime, setBtOneAtATime] = useState(true);
  const [btNoOvernight, setBtNoOvernight] = useState(false);
  const [btTargetMode, setBtTargetMode] = useState<TargetMode>("FixedR");
  const [btGradeProfile, setBtGradeProfile] = useState<GradeProfile>("Pullback");
  const [btFixedTargetR, setBtFixedTargetR] = useState(2.5);
  const [btAtrTargetMultiple, setBtAtrTargetMultiple] = useState(2.0);
  const [btDirectionFilter, setBtDirectionFilter] = useState<DirectionFilter>("Long");
  const [btSessionFilter, setBtSessionFilter] = useState<SessionFilter>("MiddayAfternoon");
  const [btRegimeFilter, setBtRegimeFilter] = useState<RegimeFilter>("Off");
  const [btSetupTypeFilter, setBtSetupTypeFilter] = useState<SetupTypeFilter>("AdaptiveBest");
  const [btStrategyEngine, setBtStrategyEngine] = useState<StrategyEngine>("UniversalAdaptiveProV4");
  const [btMaxOpenTrades, setBtMaxOpenTrades] = useState(4);
  const [btMaxTotalRisk, setBtMaxTotalRisk] = useState(8);
  const [btMaxDailyLossR, setBtMaxDailyLossR] = useState(0);
  const [btMaxMonthlyLossR, setBtMaxMonthlyLossR] = useState(0);
  const [btSlippageR, setBtSlippageR] = useState(0);
  const [btCommissionR, setBtCommissionR] = useState(0);
  const [btLeaderExitMode, setBtLeaderExitMode] = useState<LeaderExitMode>("PartialRunner");
  const [btMinVolumeRatio, setBtMinVolumeRatio] = useState(1);
  const [btMaxExtensionAtr, setBtMaxExtensionAtr] = useState(99);
  const [btStartingBalance, setBtStartingBalance] = useState(100000);
  const [btRiskModel, setBtRiskModel] = useState<RiskModel>("Percent");
  const [btRiskPercent, setBtRiskPercent] = useState(1);
  const [btFixedRiskDollars, setBtFixedRiskDollars] = useState(100);
  const [btRealisticEnabled, setBtRealisticEnabled] = useState(true);
  const [btAccountType, setBtAccountType] = useState<RealisticAccountType>("Cash");
  const [btAllowFractionalShares, setBtAllowFractionalShares] = useState(true);
  const [btAllowShorts, setBtAllowShorts] = useState(false);
  const [btMarginMultiplier, setBtMarginMultiplier] = useState(1);
  const [btMaxPositionPct, setBtMaxPositionPct] = useState(25);
  const [backtest, setBacktest] = useState<BacktestSummary | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [basketSymbols, setBasketSymbols] = useState(TRACKED_500_SYMBOLS);
  const [basketResults, setBasketResults] = useState<BasketResult[]>([]);
  const [basketPortfolio, setBasketPortfolio] = useState<BasketPortfolioSummary | null>(null);
  const [basketPolicyComparisons, setBasketPolicyComparisons] = useState<AccountPolicyComparison[]>([]);
  const [basketRiskSweep, setBasketRiskSweep] = useState<RiskSweepRow[]>([]);
  const [basketBatchRows, setBasketBatchRows] = useState<AccountBatchRow[]>([]);
  const [basketCandidateSummary, setBasketCandidateSummary] = useState<CachedBasketReplaySummary | null>(null);
  const [basketAccountPolicy, setBasketAccountPolicy] = useState<AccountPolicy>("V72_500_ACTIVE_QUALITY_GATE");
  const [basketMaxOpenTrades, setBasketMaxOpenTrades] = useState(4);
  const [basketMaxTotalRisk, setBasketMaxTotalRisk] = useState(8);
  const [isBasketTesting, setIsBasketTesting] = useState(false);
  const [modelComparisons, setModelComparisons] = useState<ModelComparisonResult[]>([]);
  const [isComparingModels, setIsComparingModels] = useState(false);
  const basketCandleCache = useRef(new Map<string, Candle[]>());
  const basketReplayCache = useRef<CachedBasketReplay | null>(null);
  const [liveBasketEnabled, setLiveBasketEnabled] = useState(false);
  const [liveBasketRefreshSeconds, setLiveBasketRefreshSeconds] = useState(300);
  const [liveCandidates, setLiveCandidates] = useState<LiveScanCandidate[]>([]);
  const [liveLastScan, setLiveLastScan] = useState("");
  const [isLiveBasketScanning, setIsLiveBasketScanning] = useState(false);
  const liveBasketScanInFlight = useRef(false);
  const [cloudHealth, setCloudHealth] = useState<CloudHealth | null>(null);
  const [cloudRuns, setCloudRuns] = useState<CloudRunSummary[]>([]);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [isSavingCloudScan, setIsSavingCloudScan] = useState(false);

  const targetSettings = useMemo(() => ({
    mode: targetMode,
    fixedR: fixedTargetR,
    atrMultiple: atrTargetMultiple,
  }), [targetMode, fixedTargetR, atrTargetMultiple]);

  const gradeSettings = useMemo(() => ({
    profile: gradeProfile,
  }), [gradeProfile]);

  const backtestTargetSettings = useMemo(() => ({
    mode: btTargetMode,
    fixedR: btFixedTargetR,
    atrMultiple: btAtrTargetMultiple,
  }), [btTargetMode, btFixedTargetR, btAtrTargetMultiple]);

  const backtestGradeSettings = useMemo(() => ({
    profile: btGradeProfile,
  }), [btGradeProfile]);

  const backtestPortfolioSettings: PortfolioSettings = useMemo(() => ({
    startingBalance: btStartingBalance,
    riskModel: btRiskModel,
    riskPercent: btRiskPercent,
    fixedRiskDollars: btFixedRiskDollars,
  }), [btStartingBalance, btRiskModel, btRiskPercent, btFixedRiskDollars]);

  const realisticAccountSettings: RealisticAccountSettings = useMemo(() => ({
    enabled: btRealisticEnabled,
    accountType: btAccountType,
    allowFractionalShares: btAllowFractionalShares,
    allowShorts: btAllowShorts,
    marginMultiplier: btMarginMultiplier,
    maxPositionPct: btMaxPositionPct,
  }), [btRealisticEnabled, btAccountType, btAllowFractionalShares, btAllowShorts, btMarginMultiplier, btMaxPositionPct]);

  useEffect(() => {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (raw) {
      try {
        setJournal(JSON.parse(raw));
      } catch {
        localStorage.removeItem(JOURNAL_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  }, [journal]);

  const gradeCurrentCsv = useCallback((nextCsv = csv, nextTimeframe = timeframe) => {
    const parsed = parseCsvCandles(nextCsv);
    setCandles(parsed);
    const nextGrade = gradeSetup(parsed, nextTimeframe, new Date(), targetSettings, gradeSettings);
    setGrade(nextGrade);
    if (!nextGrade) {
      setStatus("Not enough clean candle data to grade. Need at least about 30 candles.");
    } else {
      setStatus(`Graded ${symbol.toUpperCase()} ${nextTimeframe}: ${nextGrade.score}/100 ${nextGrade.bias}.`);
    }
    return { parsed, nextGrade };
  }, [csv, timeframe, symbol, targetSettings, gradeSettings]);

  const fetchCandles = useCallback(async (reason = "manual") => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(barsApiUrl(marketDataSource, { symbol, timeframe, mode: "latest", limit: 250 }));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
      const newCandles: Candle[] = data.bars || [];
      const nextCsv = data.csv || candlesToCsv(newCandles);
      setCsv(nextCsv);
      setCandles(newCandles);
      const nextGrade = gradeSetup(newCandles, timeframe, new Date(), targetSettings, gradeSettings);
      setGrade(nextGrade);
      setStatus(`Fetched ${data.count} ${timeframe} ${marketDataSource} candles for ${symbol.toUpperCase()} (${reason}). Latest: ${data.latestTime ? formatDateTime(data.latestTime) : "none"}.`);
      return { candles: newCandles, grade: nextGrade };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching candles.";
      setError(message);
      setStatus("Fetch failed.");
      return { candles: [] as Candle[], grade: null as GradeResult | null };
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, marketDataSource, targetSettings, gradeSettings]);

  const checkOpenTrades = useCallback(async () => {
    const openTrades = journal.filter((t) => t.status === "Open");
    if (!openTrades.length) {
      setStatus("No open journal trades to check.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const groups = Array.from(new Set(openTrades.map((t) => `${t.symbol}|${t.timeframe}`)));
      const updatedMap = new Map(journal.map((t) => [t.id, t]));

      for (const group of groups) {
        const [groupSymbol, groupTimeframe] = group.split("|") as [string, Timeframe];
        const res = await fetch(barsApiUrl(marketDataSource, { symbol: groupSymbol, timeframe: groupTimeframe, mode: "latest", limit: 1000 }));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
        const groupCandles: Candle[] = data.bars || [];
        const groupTrades = openTrades.filter((t) => t.symbol === groupSymbol && t.timeframe === groupTimeframe);
        for (const trade of groupTrades) {
          updatedMap.set(trade.id, evaluateTradeWithCandles(trade, groupCandles, noOvernightHolds || !!trade.noOvernight));
        }
      }

      const updated = journal.map((t) => updatedMap.get(t.id) || t);
      const closedNow = updated.filter((t) => t.status !== "Open" && journal.find((old) => old.id === t.id)?.status === "Open").length;
      setJournal(updated);
      setStatus(`Checked ${openTrades.length} open trade(s). Newly resolved: ${closedNow}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error checking trades.";
      setError(message);
      setStatus("Auto-check failed.");
    } finally {
      setIsLoading(false);
    }
  }, [journal, noOvernightHolds, marketDataSource]);

  const saveManualTrade = () => {
    if (!grade) return;
    const trade = createJournalTrade({ symbol, timeframe, mode, source: "Manual", grade, noOvernight: noOvernightHolds });
    if (!trade) {
      setStatus("Neutral setups are not saved as trades.");
      return;
    }
    setJournal((prev) => [trade, ...prev]);
    setStatus(`Saved manual ${trade.bias} setup for ${trade.symbol}.`);
  };

  const runLiveBasketScan = useCallback(async (reason = "manual") => {
    if (liveBasketScanInFlight.current) return;
    liveBasketScanInFlight.current = true;
    setIsLiveBasketScanning(true);
    setError("");
    try {
      const symbols = Array.from(new Set(basketSymbols.split(/[,:\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))).slice(0, 600);
      const rows: LiveScanCandidate[] = [];
      for (const scanSymbol of symbols) {
        try {
          const res = await fetch(barsApiUrl(marketDataSource, { symbol: scanSymbol, timeframe, mode: "latest", limit: 250 }));
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
          const newCandles: Candle[] = data.bars || [];
          const g = gradeSetup(newCandles, timeframe, new Date(), targetSettings, gradeSettings);
          if (!g) continue;
          const latestTime = newCandles[newCandles.length - 1]?.time || data.latestTime || "";
          const staleMinutes = latestTime ? Math.max(0, Math.round((Date.now() - new Date(latestTime).getTime()) / 60000)) : 999999;
          const state = g.marketRegime || "—";
          const rr = Number.isFinite(g.rr) ? g.rr : 0;
          const actionable = g.bias !== "Neutral" && g.score >= minScore && g.score <= maxScore && rr >= minRR && (mode === "Research" || staleMinutes <= maxStaleMinutes);
          const priority = (actionable ? 1000 : 0) + g.score * 10 + rr - Math.min(staleMinutes, 500) / 100;
          rows.push({
            symbol: scanSymbol,
            score: g.score,
            bias: g.bias,
            setup: g.setupType,
            regime: g.marketRegime,
            state,
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
          });
        } catch (err) {
          rows.push({
            symbol: scanSymbol,
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
          });
        }
      }
      const sorted = rows.sort((a, b) => b.priority - a.priority || b.score - a.score);
      setLiveCandidates(sorted);
      const stamp = new Date().toISOString();
      setLiveLastScan(stamp);
      const actionableCount = sorted.filter((r) => r.actionable).length;
      setStatus(`Live watchlist scan complete (${reason}): ${actionableCount}/${symbols.length} actionable candidates. Last scan ${formatDateTime(stamp)}.`);
    } finally {
      liveBasketScanInFlight.current = false;
      setIsLiveBasketScanning(false);
    }
  }, [basketSymbols, marketDataSource, timeframe, targetSettings, gradeSettings, minScore, maxScore, minRR, mode, maxStaleMinutes]);


  const saveActionableLiveCandidates = useCallback(() => {
    const candidates = liveCandidates
      .filter((r) => r.actionable && (r.bias === "Long" || r.bias === "Short") && r.latestTime)
      .slice(0, Math.max(1, basketMaxOpenTrades));

    if (!candidates.length) {
      setStatus("No actionable live candidates to save. Run the live watchlist scanner first, or loosen paper-test filters.");
      return;
    }

    const existingKeys = new Set(journal.filter((t) => t.status === "Open").map((t) => `${t.symbol}|${t.timeframe}|${t.signalTime}|${t.bias}`));
    const now = new Date().toISOString();
    const nextTrades: JournalTrade[] = [];

    for (const c of candidates) {
      const key = `${c.symbol}|${timeframe}|${c.latestTime}|${c.bias}`;
      if (existingKeys.has(key)) continue;
      nextTrades.push({
        id: `${c.symbol}-${timeframe}-${c.latestTime}-${c.bias}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        symbol: c.symbol,
        timeframe,
        mode,
        source: "Auto",
        createdAt: now,
        signalTime: c.latestTime,
        score: c.score,
        bias: c.bias as "Long" | "Short",
        entry: c.entry,
        stop: c.stop,
        target: c.target,
        rr: c.rr,
        setupType: c.setup,
        marketRegime: c.regime as JournalTrade["marketRegime"],
        marketState: c.state,
        noOvernight: noOvernightHolds,
        status: "Open",
        note: `v7.0 live watchlist paper save. Stale ${c.staleMinutes === 999999 ? "unknown" : `${c.staleMinutes}m`}.`,
      });
    }

    if (!nextTrades.length) {
      setStatus("All actionable live candidates were already open in the research journal.");
      return;
    }
    setJournal((prev) => [...nextTrades, ...prev]);
    setStatus(`Saved ${nextTrades.length} live watchlist candidate(s) to the research journal. These are simulated trades only, not broker orders.`);
  }, [liveCandidates, basketMaxOpenTrades, journal, timeframe, mode, noOvernightHolds]);

  const loadRecentCloudRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/cloud/recent?limit=5", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Could not load recent cloud scans.");
      setCloudRuns(Array.isArray(data.runs) ? data.runs : []);
      if (typeof data.configured === "boolean") {
        setCloudHealth((prev) => ({ ...(prev || { configured: data.configured }), configured: data.configured, message: data.message || prev?.message }));
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load recent cloud scans.");
    }
  }, []);

  const checkCloudStatus = useCallback(async () => {
    setIsCheckingCloud(true);
    try {
      const res = await fetch("/api/cloud/health", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Cloud health check failed.");
      setCloudHealth(data);
      setStatus(data.configured ? `Cloud DB configured (${data.urlHost}).` : data.message || "Cloud DB is not configured yet.");
      await loadRecentCloudRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cloud health check failed.";
      setCloudHealth({ configured: false, message });
      setStatus(message);
    } finally {
      setIsCheckingCloud(false);
    }
  }, [loadRecentCloudRuns]);

  const saveLiveScanToCloud = useCallback(async () => {
    if (!liveCandidates.length) {
      setStatus("Run the live watchlist scanner before saving to the cloud database.");
      return;
    }
    setIsSavingCloudScan(true);
    try {
      const symbols = Array.from(new Set(basketSymbols.split(/[,:\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))).slice(0, 600);
      const res = await fetch("/api/cloud/save-live-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "manual-live-watchlist",
          source: marketDataSource,
          timeframe,
          mode,
          universeLabel: `${symbols.length}-symbol ${ACCOUNT_POLICY_LABELS[basketAccountPolicy]}`,
          symbolsCount: symbols.length,
          startedAt: liveLastScan || new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          settings: {
            accountPolicy: basketAccountPolicy,
            accountPolicyLabel: ACCOUNT_POLICY_LABELS[basketAccountPolicy],
            minScore,
            maxScore,
            minRR,
            maxStaleMinutes,
            maxOpenTrades: basketMaxOpenTrades,
            maxTotalRiskPct: basketMaxTotalRisk,
            riskPct: btRiskPercent,
            maxPositionPct: btMaxPositionPct,
            noOvernightHolds,
          },
          candidates: liveCandidates,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || "Cloud save failed.");
      setStatus(`Saved live scan to cloud DB: ${data.savedSignals} signals, ${data.actionableCount} actionable. No broker orders placed.`);
      await loadRecentCloudRuns();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Cloud save failed.");
    } finally {
      setIsSavingCloudScan(false);
    }
  }, [liveCandidates, basketSymbols, marketDataSource, timeframe, mode, basketAccountPolicy, minScore, maxScore, minRR, maxStaleMinutes, basketMaxOpenTrades, basketMaxTotalRisk, btRiskPercent, btMaxPositionPct, noOvernightHolds, liveLastScan, loadRecentCloudRuns]);

  useEffect(() => {
    if (!liveRefresh) return;
    const id = window.setInterval(async () => {
      const result = await fetchCandles("live refresh");
      if (autoSave && result.grade) {
        const decision = canAutoSave({
          existingTrades: JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]"),
          grade: result.grade,
          symbol,
          timeframe,
          minScore,
          maxScore,
          minRR,
          cooldownMinutes,
          appMode: mode,
          maxStaleMinutes,
        });

        if (decision.ok) {
          const trade = createJournalTrade({ symbol, timeframe, mode, source: "Auto", grade: result.grade, noOvernight: noOvernightHolds });
          if (trade) {
            setJournal((prev) => [trade, ...prev]);
            setStatus(`Auto-saved ${trade.symbol} ${trade.bias} setup at score ${trade.score}.`);
          }
        } else {
          setStatus(`Live refresh complete. Auto-save skipped: ${decision.reason}`);
        }
      }
    }, refreshSeconds * 1000);

    return () => window.clearInterval(id);
  }, [liveRefresh, refreshSeconds, fetchCandles, autoSave, symbol, timeframe, minScore, maxScore, minRR, cooldownMinutes, mode, maxStaleMinutes, noOvernightHolds]);

  useEffect(() => {
    if (!liveBasketEnabled) return;
    void runLiveBasketScan("auto");
    const id = window.setInterval(() => {
      void runLiveBasketScan("auto");
    }, Math.max(60, liveBasketRefreshSeconds) * 1000);
    return () => window.clearInterval(id);
  }, [liveBasketEnabled, liveBasketRefreshSeconds, runLiveBasketScan]);

  useEffect(() => {
    if (!autoCheck) return;
    const id = window.setInterval(() => {
      void checkOpenTrades();
    }, 60 * 1000);

    return () => window.clearInterval(id);
  }, [autoCheck, checkOpenTrades]);

  const journalStats = useMemo(() => {
    const wins = journal.filter((t) => t.status === "Win").length;
    const losses = journal.filter((t) => t.status === "Loss").length;
    const ambiguous = journal.filter((t) => t.status === "Ambiguous").length;
    const open = journal.filter((t) => t.status === "Open").length;
    const completed = wins + losses;
    const winRate = completed ? Math.round((wins / completed) * 1000) / 10 : 0;
    const r = journal.reduce((sum, t) => sum + (t.resultR || 0), 0);
    return { wins, losses, ambiguous, open, winRate, cumulativeR: Math.round(r * 100) / 100 };
  }, [journal]);

  const journalRanges = useMemo(() => scoreRangeStats(journal), [journal]);

  const makeBacktestSettings = (testSymbol: string, startIso: string, endIso: string): BacktestSettings => ({
    symbol: testSymbol.toUpperCase(),
    timeframe,
    minScore: btMinScore,
    maxScore: btMaxScore,
    minRR: btMinRR,
    cooldownMinutes: btCooldown,
    maxBarsToHold: btMaxBars,
    warmupBars: btWarmup,
    onePositionAtATime: btMaxOpenTrades === 1,
    maxOpenTrades: btMaxOpenTrades,
    maxTotalOpenRiskPct: btMaxTotalRisk,
    maxDailyLossR: btMaxDailyLossR,
    maxMonthlyLossR: btMaxMonthlyLossR,
    slippageR: btSlippageR,
    commissionR: btCommissionR,
    noOvernight: btNoOvernight,
    targetSettings: backtestTargetSettings,
    gradeSettings: backtestGradeSettings,
    directionFilter: btDirectionFilter,
    sessionFilter: btSessionFilter,
    regimeFilter: btRegimeFilter,
    setupTypeFilter: btSetupTypeFilter,
    strategyEngine: btStrategyEngine,
    minVolumeRatio: btMinVolumeRatio,
    maxExtensionAtr: btMaxExtensionAtr,
    requestedStart: startIso,
    requestedEnd: endIso,
    portfolioSettings: backtestPortfolioSettings,
    realisticSettings: realisticAccountSettings,
    leaderExitMode: btLeaderExitMode,
  });

  const apiRangeParams = (testSymbol: string, startIso: string, endIso: string) => {
    const params: Record<string, string | number> = {
      symbol: testSymbol,
      timeframe,
      mode: "range",
      start: startIso,
      end: endIso,
      limit: btDataSource === "Massive" ? 50000 : 10000,
    };
    if (btDataSource === "Alpaca") params.adjustment = alpacaAdjustment;
    return params;
  };

  const candleCacheKey = (testSymbol: string, startIso: string, endIso: string) => [
    btDataSource,
    testSymbol.toUpperCase(),
    timeframe,
    startIso,
    endIso,
    btDataSource === "Alpaca" ? alpacaAdjustment : "",
  ].join("|");

  const fetchRangeHistory = async (testSymbol: string, startIso: string, endIso: string): Promise<Candle[]> => {
    const key = candleCacheKey(testSymbol, startIso, endIso);
    const cached = basketCandleCache.current.get(key);
    if (cached) return cached;
    const res = await fetch(barsApiUrl(btDataSource as ApiDataSource, apiRangeParams(testSymbol, startIso, endIso)));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
    const history: Candle[] = data.bars || [];
    basketCandleCache.current.set(key, history);
    return history;
  };

  const clearBasketCandleCache = () => {
    basketCandleCache.current.clear();
    setStatus("Cleared in-memory basket candle cache. Next run will fetch candles again.");
  };

  const runBacktester = async () => {
    setIsBacktesting(true);
    setError("");
    setBacktest(null);
    try {
      const startIso = new Date(`${btStart}T00:00:00`).toISOString();
      const endDate = new Date(`${btEnd}T23:59:59`);
      const endIso = endDate.toISOString();
      let history: Candle[] = [];

      if (btDataSource === "CSV") {
        const rawCsv = historicalCsv.trim() ? historicalCsv : csv;
        const parsed = parseCsvCandles(rawCsv);
        const startMs = new Date(startIso).getTime();
        const endMs = new Date(endIso).getTime();
        history = parsed.filter((c) => {
          const t = new Date(c.time).getTime();
          return Number.isFinite(t) && t >= startMs && t <= endMs;
        });
        if (!history.length) {
          throw new Error("CSV mode found no candles inside the selected start/end dates. Check the CSV time format and date range.");
        }
      } else {
        const res = await fetch(barsApiUrl(btDataSource as ApiDataSource, apiRangeParams(symbol, startIso, endIso)));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
        history = data.bars || [];
      }

      const settings = makeBacktestSettings(symbol.toUpperCase(), startIso, endIso);
      const summary = runBacktest(history, settings);
      setBacktest(summary);
      const sourceLabel = btDataSource === "CSV" ? `CSV${historicalFileName ? ` (${historicalFileName})` : ""}` : btDataSource === "Alpaca" ? `Alpaca (${alpacaAdjustment} adjusted)` : btDataSource;
      const windowText = summary.dataWindow.firstCandle && summary.dataWindow.lastCandle ? ` Loaded ${formatDateTime(summary.dataWindow.firstCandle)} to ${formatDateTime(summary.dataWindow.lastCandle)}.` : "";
      setStatus(`Backtested ${history.length.toLocaleString()} candles from ${sourceLabel}. Found ${summary.totalTrades} trade(s).${windowText}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown backtest error.";
      setError(message);
      setStatus("Backtest failed.");
    } finally {
      setIsBacktesting(false);
    }
  };

  const summarizePolicyComparison = (summary: BasketPortfolioSummary): AccountPolicyComparison => ({
    policy: summary.accountPolicy,
    label: summary.accountPolicyLabel,
    endingBalance: summary.endingBalance,
    returnPct: summary.returnPct,
    maxDrawdownPct: summary.maxDrawdownPct,
    returnToDrawdown: summary.returnToDrawdown,
    profitFactor: summary.profitFactor,
    acceptedTrades: summary.acceptedTrades,
    totalR: summary.totalR,
    rCurveConsistency: summary.rCurveConsistency,
    skippedStateCap: summary.skippedStateCap,
    skippedMaxOpen: summary.skippedMaxOpen,
    stateCapBypasses: summary.stateCapBypasses,
    bullNormalPnl: summary.byState.find((r) => r.label === "Bull normal")?.pnl || 0,
    healthyLeaderPnl: summary.byState.find((r) => r.label === "Healthy leader")?.pnl || 0,
  });

  const summarizeRiskSweepRow = (riskPercent: number, summary: BasketPortfolioSummary): RiskSweepRow => ({
    riskPercent,
    maxTotalRiskPct: summary.maxTotalRiskPct,
    endingBalance: summary.endingBalance,
    returnPct: summary.returnPct,
    maxDrawdownPct: summary.maxDrawdownPct,
    returnToDrawdown: summary.returnToDrawdown,
    profitFactor: summary.profitFactor,
    acceptedTrades: summary.acceptedTrades,
    totalR: summary.totalR,
    avgActualRiskPct: summary.avgActualRiskPct,
    positionCapLimitedTrades: summary.positionCapLimitedTrades,
  });

  const accountBatchConfigs = (): AccountBatchConfig[] => {
    const raw: AccountBatchConfig[] = [
      { label: `Current setup — ${btMaxPositionPct}% / ${basketMaxOpenTrades} slots / ${btRiskPercent}% / ${basketMaxTotalRisk}%`, maxPositionPct: btMaxPositionPct, maxOpenTrades: basketMaxOpenTrades, riskPercent: btRiskPercent, maxTotalRiskPct: basketMaxTotalRisk, accountPolicy: basketAccountPolicy },
      { label: "Baseline 25% / 4 slots / 1% / 4%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 1, maxTotalRiskPct: 4, accountPolicy: basketAccountPolicy },
      { label: "More exposure 25% / 5 slots / 1% / 5%", maxPositionPct: 25, maxOpenTrades: 5, riskPercent: 1, maxTotalRiskPct: 5, accountPolicy: basketAccountPolicy },
      { label: "Middle ground 22.5% / 5 slots / 1% / 5%", maxPositionPct: 22.5, maxOpenTrades: 5, riskPercent: 1, maxTotalRiskPct: 5, accountPolicy: basketAccountPolicy },
      { label: "Small slots 20% / 5 slots / 1% / 5%", maxPositionPct: 20, maxOpenTrades: 5, riskPercent: 1, maxTotalRiskPct: 5, accountPolicy: basketAccountPolicy },
      { label: "Conservative wide 20% / 6 slots / 0.5% / 4%", maxPositionPct: 20, maxOpenTrades: 6, riskPercent: 0.5, maxTotalRiskPct: 4, accountPolicy: basketAccountPolicy },
      { label: "Safer risk 25% / 4 slots / 0.75% / 3%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 0.75, maxTotalRiskPct: 3, accountPolicy: basketAccountPolicy },
      { label: "v6.6 wide research 50 0-100% sleeve audit 25% / 4 / 1% / 4%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 1, maxTotalRiskPct: 4, accountPolicy: "V66_SLEEVE_100_AUDIT" },
      { label: "v6.7 live-style wide research 50 25% / 4 / 1% / 4%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 1, maxTotalRiskPct: 4, accountPolicy: "V67_LIVE_STYLE_SIM" },
      { label: "v6.9 live 100-stock simulator 25% / 4 / 1% / 4%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 1, maxTotalRiskPct: 4, accountPolicy: "V69_LIVE_100_STOCK_SIM" },
      { label: "v7.2 active quality gate active-only 25% / 4 / 1% / 4%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 1, maxTotalRiskPct: 4, accountPolicy: "V70_PAPER_LIVE_ACTIVE" },
      { label: "v7.1 active quality gate 25% / 4 / 1% / 4%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 1, maxTotalRiskPct: 4, accountPolicy: "V71_ACTIVE_QUALITY_GATE" },
      { label: "v7.2 500-stock active quality gate 25% / 4 / 1% / 4%", maxPositionPct: 25, maxOpenTrades: 4, riskPercent: 1, maxTotalRiskPct: 4, accountPolicy: "V72_500_ACTIVE_QUALITY_GATE" },
    ];
    const seen = new Set<string>();
    return raw.filter((cfg) => {
      const key = `${cfg.accountPolicy || basketAccountPolicy}|${cfg.maxPositionPct}|${cfg.maxOpenTrades}|${cfg.riskPercent}|${cfg.maxTotalRiskPct}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const buildBatchRowsFromCache = (cache: CachedBasketReplay): AccountBatchRow[] => {
    return accountBatchConfigs().map((cfg) => {
      const policy = cfg.accountPolicy || basketAccountPolicy;
      const summary = simulateBasketPortfolio({
        trades: cache.trades,
        startingBalance: btStartingBalance,
        riskPercent: cfg.riskPercent,
        fixedRiskDollars: btFixedRiskDollars,
        riskModel: "Percent",
        maxOpenTrades: cfg.maxOpenTrades,
        maxTotalRiskPct: cfg.maxTotalRiskPct,
        realisticSettings: { ...realisticAccountSettings, maxPositionPct: cfg.maxPositionPct },
        buyHoldEndingBalance: cache.equalWeightBuyHold,
        buyHoldEquityPoints: cache.equalWeightBuyHoldPoints,
        symbolHistories: cache.symbolHistories,
        accountPolicy: policy,
        symbolQualityMap: cache.symbolQualityMap,
      });
      const sleeve15 = buildLeaderSleeveRows(summary, cache.rows).find((r) => r.sleevePct === 25);
      const selected = policy === basketAccountPolicy
        && cfg.maxPositionPct === btMaxPositionPct
        && cfg.maxOpenTrades === basketMaxOpenTrades
        && cfg.riskPercent === btRiskPercent
        && cfg.maxTotalRiskPct === basketMaxTotalRisk;
      return {
        ...cfg,
        accountPolicy: policy,
        endingBalance: summary.endingBalance,
        returnPct: summary.returnPct,
        strategyVsBuyHold: summary.strategyVsBuyHold,
        maxDrawdownPct: summary.maxDrawdownPct,
        returnToDrawdown: summary.returnToDrawdown,
        profitFactor: summary.profitFactor,
        acceptedTrades: summary.acceptedTrades,
        totalR: summary.totalR,
        rCurveConsistency: summary.rCurveConsistency,
        avgCashUsedPct: summary.avgCashUsedPct,
        avgActualRiskPct: summary.avgActualRiskPct,
        targetRiskHitPct: summary.targetRiskHitPct,
        positionCapLimitedTrades: summary.positionCapLimitedTrades,
        skippedMaxOpen: summary.skippedMaxOpen,
        skippedStateCap: summary.skippedStateCap,
        stateCapBypasses: summary.stateCapBypasses,
        sleeve15Ending: sleeve15?.endingBalance || summary.endingBalance,
        sleeve15VsHold: sleeve15?.strategyVsHold || summary.strategyVsBuyHold,
        selected,
      };
    });
  };

  const replayBatchFromCache = () => {
    const cache = basketReplayCache.current;
    if (!cache) {
      setStatus("No cached candidate set yet. Run the basket once first, then replay batch settings without refetching candles.");
      return;
    }
    const rows = buildBatchRowsFromCache(cache);
    setBasketBatchRows(rows);
    const best = rows.slice().sort((a, b) => b.returnToDrawdown - a.returnToDrawdown || b.endingBalance - a.endingBalance)[0];
    setStatus(`Replayed ${rows.length} account settings from cached candidate set (${cache.symbolCount} symbols, ${cache.candidateCount.toLocaleString()} candidates). Best Return/DD: ${best?.label || "—"}.`);
  };

  const runBasketBacktester = async () => {
    if (btDataSource === "CSV") {
      setStatus("Basket test uses Alpaca or Massive API candles. Use single-symbol CSV mode for uploaded historical files.");
      return;
    }
    const symbols = Array.from(new Set(basketSymbols.split(/[,:\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))).slice(0, 600);
    if (!symbols.length) {
      setStatus("Add at least one symbol to the basket test.");
      return;
    }

    setIsBasketTesting(true);
    setBasketResults([]);
    setBasketPortfolio(null);
    setBasketPolicyComparisons([]);
    setBasketRiskSweep([]);
    setBasketBatchRows([]);
    setBasketCandidateSummary(null);
    basketReplayCache.current = null;
    setError("");
    try {
      const startIso = new Date(`${btStart}T00:00:00`).toISOString();
      const endIso = new Date(`${btEnd}T23:59:59`).toISOString();
      const rows: BasketResult[] = [];
      const basketTrades: JournalTrade[] = [];
      const holdHistories: Array<{ symbol: string; candles: Candle[] }> = [];

      for (const testSymbol of symbols) {
        setStatus(`Basket testing ${testSymbol} (${rows.length + 1}/${symbols.length})...`);
        try {
          const history = await fetchRangeHistory(testSymbol, startIso, endIso);
          holdHistories.push({ symbol: testSymbol, candles: history });
          const summary = runBacktest(history, makeBacktestSettings(testSymbol, startIso, endIso));
          basketTrades.push(...summary.trades);
          const bestDirection = bestGroup(summary.diagnostics.byDirection)?.label || "—";
          const bestRegime = bestGroup(summary.diagnostics.byRegime)?.label || "—";
          const bestSetup = bestGroup(summary.diagnostics.bySetupType)?.label || "—";
          const worstRegime = worstGroup(summary.diagnostics.byRegime)?.label || "—";
          const bestState = bestGroup(summary.diagnostics.byMarketState)?.label || "—";
          const worstState = worstGroup(summary.diagnostics.byMarketState)?.label || "—";
          const failedLeaderR = summary.diagnostics.byMarketState.find((r) => r.label === "Failed leader")?.cumulativeR || 0;
          const bearTransitionR = summary.diagnostics.byMarketState.find((r) => r.label === "Bear transition")?.cumulativeR || 0;
          const bestYear = bestGroup(summary.diagnostics.byYear)?.label || "—";
          const worstYear = worstGroup(summary.diagnostics.byYear)?.label || "—";
          const personality = classifySymbolPersonality(summary);
          const diagnosis = basketDiagnosis(summary, personality);
          const longR = summary.diagnostics.byDirection.find((r) => r.label === "Long")?.cumulativeR || 0;
          const shortR = summary.diagnostics.byDirection.find((r) => r.label === "Short")?.cumulativeR || 0;
          rows.push({
            symbol: testSymbol,
            trades: summary.totalTrades,
            cumulativeR: summary.cumulativeR,
            avgR: summary.avgR,
            profitFactor: summary.profitFactor,
            maxDrawdownR: summary.maxDrawdownR,
            consistency: summary.consistency.score,
            endingBalance: summary.portfolio.endingBalance,
            buyHoldEndingBalance: summary.portfolio.buyHoldEndingBalance,
            strategyVsHold: summary.portfolio.strategyVsBuyHold,
            realisticEnding: summary.realisticPortfolio.endingCash,
            realisticReturnPct: summary.realisticPortfolio.returnPct,
            realisticSkipped: summary.realisticPortfolio.skippedBuyingPower + summary.realisticPortfolio.skippedNoShorts + summary.realisticPortfolio.skippedWholeShare,
            recentThreeMonthR: summary.consistency.recentThreeMonthR,
            bestDirection,
            bestRegime,
            bestSetup,
            worstRegime,
            bestState,
            worstState,
            failedLeaderR,
            bearTransitionR,
            bestYear,
            worstYear,
            dataStart: summary.dataWindow.firstCandle || "",
            dataEnd: summary.dataWindow.lastCandle || "",
            candleCount: summary.dataWindow.candleCount,
            personality,
            issue: diagnosis.issue,
            suggestion: diagnosis.suggestion,
            longR,
            shortR,
            shortDragR: shortR < 0 ? shortR : 0,
            beatHold: summary.portfolio.strategyVsBuyHold > 0,
            warning: summary.dataWindow.warning,
          });
        } catch (err) {
          rows.push({
            symbol: testSymbol,
            trades: 0,
            cumulativeR: 0,
            avgR: 0,
            profitFactor: 0,
            maxDrawdownR: 0,
            consistency: 0,
            endingBalance: 0,
            buyHoldEndingBalance: 0,
            strategyVsHold: 0,
            realisticEnding: 0,
            realisticReturnPct: 0,
            realisticSkipped: 0,
            recentThreeMonthR: 0,
            bestDirection: "—",
            bestRegime: "—",
            bestSetup: "—",
            worstRegime: "—",
            bestState: "—",
            worstState: "—",
            failedLeaderR: 0,
            bearTransitionR: 0,
            bestYear: "—",
            worstYear: "—",
            dataStart: "",
            dataEnd: "",
            candleCount: 0,
            personality: "Failed",
            issue: "Data/API failure",
            suggestion: "Check symbol, plan limits, keys, and loaded date window.",
            longR: 0,
            shortR: 0,
            shortDragR: 0,
            beatHold: false,
            warning: err instanceof Error ? err.message : "Failed to backtest symbol.",
          });
        }
        setBasketResults([...rows]);
      }
      const validForHold = rows.filter((r) => r.buyHoldEndingBalance > 0);
      const equalWeightBuyHold = validForHold.length
        ? Math.round((validForHold.reduce((sum, r) => sum + r.buyHoldEndingBalance, 0) / validForHold.length) * 100) / 100
        : 0;
      const equalWeightBuyHoldPoints = buildEqualWeightBuyHoldPoints(holdHistories, btStartingBalance);
      const symbolQualityMap = buildSymbolQualityMap(rows);
      const replaySignature = [symbols.join(","), btDataSource, timeframe, btDataSource === "Alpaca" ? alpacaAdjustment : "", btStart, btEnd, btStrategyEngine, btSetupTypeFilter, btMinScore, btMaxBars, btWarmup].join("|");
      const replayCache: CachedBasketReplay = {
        signature: replaySignature,
        trades: basketTrades,
        rows,
        symbolQualityMap,
        equalWeightBuyHold,
        equalWeightBuyHoldPoints,
        symbolHistories: holdHistories,
        symbolCount: symbols.length,
        candidateCount: basketTrades.length,
        label: `${symbols.length} symbols · ${btDataSource} ${timeframe}${btDataSource === "Alpaca" ? ` (${alpacaAdjustment})` : ""} · ${btStart} to ${btEnd}`,
        createdAt: new Date().toISOString(),
      };
      basketReplayCache.current = replayCache;
      setBasketCandidateSummary({
        signature: replayCache.signature,
        symbolCount: replayCache.symbolCount,
        candidateCount: replayCache.candidateCount,
        label: replayCache.label,
        createdAt: replayCache.createdAt,
      });
      const baseSimulationParams = {
        trades: basketTrades,
        startingBalance: btStartingBalance,
        riskPercent: btRiskPercent,
        fixedRiskDollars: btFixedRiskDollars,
        riskModel: btRiskModel,
        maxOpenTrades: basketMaxOpenTrades,
        maxTotalRiskPct: basketMaxTotalRisk,
        realisticSettings: realisticAccountSettings,
        buyHoldEndingBalance: equalWeightBuyHold,
        buyHoldEquityPoints: equalWeightBuyHoldPoints,
        symbolQualityMap,
        symbolHistories: holdHistories,
      };
      const selectedPortfolio = simulateBasketPortfolio({ ...baseSimulationParams, accountPolicy: basketAccountPolicy });
      setBasketPortfolio(selectedPortfolio);

      const policies: AccountPolicy[] = ["V53_STRICT", "V54_BULL_TIGHT", "V54_SCORE_OVERRIDE", "V54_COMBO", "V55_CONTROLLED", "V57_QUALITY_FILTER", "V59_OPPORTUNITY_FILTER", "V61_SLEEVE_BENCHMARK", "V62_REAL_SLEEVE", "V63_SUPER_WIDE", "V64_DYNAMIC_SLEEVE", "V65_SUPER_WIDE_50", "V66_SLEEVE_100_AUDIT", "V67_LIVE_STYLE_SIM", "V68_100_TRADE_READINESS", "V69_LIVE_100_STOCK_SIM", "V70_PAPER_LIVE_ACTIVE", "V71_ACTIVE_QUALITY_GATE", "V72_500_ACTIVE_QUALITY_GATE"];
      setBasketPolicyComparisons(policies.map((policy) => summarizePolicyComparison(simulateBasketPortfolio({ ...baseSimulationParams, accountPolicy: policy }))));

      const riskValues = [0.75, 1, 1.25, 1.5];
      setBasketRiskSweep(riskValues.map((riskPercent) => {
        const maxTotalRiskPct = Math.round(riskPercent * basketMaxOpenTrades * 100) / 100;
        const summary = simulateBasketPortfolio({
          ...baseSimulationParams,
          riskPercent,
          riskModel: "Percent",
          maxTotalRiskPct,
          accountPolicy: basketAccountPolicy,
        });
        return summarizeRiskSweepRow(riskPercent, summary);
      }));
      setBasketBatchRows(buildBatchRowsFromCache(replayCache));
      const winners = rows.filter((r) => r.cumulativeR > 0).length;
      const totalR = Math.round(rows.reduce((sum, r) => sum + r.cumulativeR, 0) * 100) / 100;
      setStatus(`Basket test complete: ${winners}/${rows.length} symbols positive, total ${totalR}R${btDataSource === "Alpaca" ? ` using ${alpacaAdjustment} adjustment` : ""}. Candle cache: ${basketCandleCache.current.size} symbol windows.`);
    } finally {
      setIsBasketTesting(false);
    }
  };

  const variantSettings = (base: BacktestSettings, model: string): BacktestSettings => {
    if (model === "Core Long") {
      return { ...base, directionFilter: "Long", setupTypeFilter: "Continuation", strategyEngine: "Manual", leaderExitMode: "Fixed" };
    }
    if (model === "v3.6 Universal") {
      return { ...base, directionFilter: "All", setupTypeFilter: "AdaptiveBest", strategyEngine: "UniversalAdaptiveProV2", leaderExitMode: "Expanded" };
    }
    if (model === "v3.7 Universal") {
      return { ...base, directionFilter: "All", setupTypeFilter: "AdaptiveBest", strategyEngine: "UniversalAdaptiveProV3", leaderExitMode: "Expanded" };
    }
    if (model === "v3.8 Universal") {
      return { ...base, directionFilter: "All", setupTypeFilter: "AdaptiveBest", strategyEngine: "UniversalAdaptiveProV4", leaderExitMode: "PartialRunner" };
    }
    if (model === "v4.0 Realistic") return { ...base, directionFilter: "All", setupTypeFilter: "AdaptiveBest", strategyEngine: "UniversalAdaptiveProV6", leaderExitMode: "PartialRunner" };
    if (model === "v5.3 Cash Realistic") return { ...base, directionFilter: "Long", setupTypeFilter: "AdaptiveBest", strategyEngine: "UniversalAdaptiveProV4", leaderExitMode: "PartialRunner" };
    return { ...base, directionFilter: "All", setupTypeFilter: "AdaptiveBest", strategyEngine: "UniversalAdaptiveProV5", leaderExitMode: "PartialRunner" };
  };

  const summarizeModelComparison = (model: string, summaries: BacktestSummary[]): ModelComparisonResult => {
    const positiveSymbols = summaries.filter((s) => s.cumulativeR > 0).length;
    const beatHoldSymbols = summaries.filter((s) => s.portfolio.strategyVsBuyHold > 0).length;
    const totalR = Math.round(summaries.reduce((sum, s) => sum + s.cumulativeR, 0) * 100) / 100;
    const avgPf = summaries.length ? Math.round((summaries.reduce((sum, s) => sum + s.profitFactor, 0) / summaries.length) * 100) / 100 : 0;
    const avgConsistency = summaries.length ? Math.round(summaries.reduce((sum, s) => sum + s.consistency.score, 0) / summaries.length) : 0;
    const totalLongR = Math.round(summaries.reduce((sum, s) => sum + (s.diagnostics.byDirection.find((r) => r.label === "Long")?.cumulativeR || 0), 0) * 100) / 100;
    const totalShortR = Math.round(summaries.reduce((sum, s) => sum + (s.diagnostics.byDirection.find((r) => r.label === "Short")?.cumulativeR || 0), 0) * 100) / 100;
    const sorted = summaries.slice().sort((a, b) => b.cumulativeR - a.cumulativeR);
    return {
      model,
      positiveSymbols,
      beatHoldSymbols,
      symbolsTested: summaries.length,
      totalR,
      avgPf,
      avgConsistency,
      totalLongR,
      totalShortR,
      bestSymbol: sorted[0] ? `${sorted[0].symbol} ${sorted[0].cumulativeR}R` : "—",
      worstSymbol: sorted[sorted.length - 1] ? `${sorted[sorted.length - 1].symbol} ${sorted[sorted.length - 1].cumulativeR}R` : "—",
    };
  };

  const runModelComparison = async () => {
    if (btDataSource === "CSV") {
      setStatus("Model comparison uses Alpaca or Massive API candles. Use single-symbol CSV mode for uploaded historical files.");
      return;
    }
    const symbols = Array.from(new Set(basketSymbols.split(/[,:\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))).slice(0, 600);
    if (!symbols.length) return;
    setIsComparingModels(true);
    setModelComparisons([]);
    setError("");
    try {
      const startIso = new Date(`${btStart}T00:00:00`).toISOString();
      const endIso = new Date(`${btEnd}T23:59:59`).toISOString();
      const models = ["Core Long", "v3.6 Universal", "v3.7 Universal", "v3.8 Universal", "v3.9 Universal", "v4.0 Realistic", "v5.3 Cash Realistic"];
      const byModel = new Map<string, BacktestSummary[]>(models.map((m) => [m, []]));
      for (const testSymbol of symbols) {
        setStatus(`A/B comparison loading ${testSymbol}...`);
        const history = await fetchRangeHistory(testSymbol, startIso, endIso);
        const base = makeBacktestSettings(testSymbol, startIso, endIso);
        for (const model of models) {
          byModel.get(model)?.push(runBacktest(history, variantSettings(base, model)));
        }
      }
      const rows = models.map((model) => summarizeModelComparison(model, byModel.get(model) || []));
      setModelComparisons(rows);
      setStatus("Model A/B comparison complete. Use this as a quick strategy tournament, but use the Realistic Universal Account for the main money simulation.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown model comparison error.";
      setError(message);
      setStatus("Model comparison failed.");
    } finally {
      setIsComparingModels(false);
    }
  };

  const addBacktestTradesToJournal = () => {
    if (!backtest?.trades.length) return;
    const imported = backtest.trades.map((t) => ({ ...t, id: `${t.id}-imported-${Date.now()}-${Math.random()}` }));
    setJournal((prev) => [...imported, ...prev]);
    setStatus(`Imported ${imported.length} backtest trades into the journal.`);
  };

  const getCurrentBacktestPreset = () => ({
    btGradeProfile, btDirectionFilter, btRegimeFilter, btSessionFilter, btSetupTypeFilter, btStrategyEngine, alpacaAdjustment,
    btMinScore, btMaxScore, btMinRR, btCooldown, btMaxBars, btWarmup, btMaxOpenTrades,
    btMaxTotalRisk, btNoOvernight, btTargetMode, btFixedTargetR, btAtrTargetMultiple,
    btMinVolumeRatio, btMaxExtensionAtr, btStartingBalance, btRiskModel, btRiskPercent,
    btFixedRiskDollars, btRealisticEnabled, btAccountType, btAllowFractionalShares, btAllowShorts, btMarginMultiplier, btMaxPositionPct, btMaxDailyLossR, btMaxMonthlyLossR, btSlippageR, btCommissionR, btLeaderExitMode, basketAccountPolicy,
  });

  const applyBacktestPreset = (preset: Partial<ReturnType<typeof getCurrentBacktestPreset>>) => {
    if (preset.btGradeProfile) setBtGradeProfile(preset.btGradeProfile);
    if (preset.btDirectionFilter) setBtDirectionFilter(preset.btDirectionFilter);
    if (preset.btRegimeFilter) setBtRegimeFilter(preset.btRegimeFilter);
    if (preset.btSessionFilter) setBtSessionFilter(preset.btSessionFilter);
    if (preset.btSetupTypeFilter) setBtSetupTypeFilter(preset.btSetupTypeFilter);
    if (preset.btStrategyEngine) setBtStrategyEngine(preset.btStrategyEngine);
    if (preset.alpacaAdjustment) setAlpacaAdjustment(preset.alpacaAdjustment as AlpacaAdjustment);
    if (typeof preset.btMinScore === "number") setBtMinScore(preset.btMinScore);
    if (typeof preset.btMaxScore === "number") setBtMaxScore(preset.btMaxScore);
    if (typeof preset.btMinRR === "number") setBtMinRR(preset.btMinRR);
    if (typeof preset.btCooldown === "number") setBtCooldown(preset.btCooldown);
    if (typeof preset.btMaxBars === "number") setBtMaxBars(preset.btMaxBars);
    if (typeof preset.btWarmup === "number") setBtWarmup(preset.btWarmup);
    if (typeof preset.btMaxOpenTrades === "number") { setBtMaxOpenTrades(preset.btMaxOpenTrades); setBtOneAtATime(preset.btMaxOpenTrades === 1); }
    if (typeof preset.btMaxTotalRisk === "number") setBtMaxTotalRisk(preset.btMaxTotalRisk);
    if (typeof preset.btNoOvernight === "boolean") setBtNoOvernight(preset.btNoOvernight);
    if (preset.btTargetMode) setBtTargetMode(preset.btTargetMode);
    if (typeof preset.btFixedTargetR === "number") setBtFixedTargetR(preset.btFixedTargetR);
    if (typeof preset.btAtrTargetMultiple === "number") setBtAtrTargetMultiple(preset.btAtrTargetMultiple);
    if (typeof preset.btMinVolumeRatio === "number") setBtMinVolumeRatio(preset.btMinVolumeRatio);
    if (typeof preset.btMaxExtensionAtr === "number") setBtMaxExtensionAtr(preset.btMaxExtensionAtr);
    if (typeof preset.btStartingBalance === "number") setBtStartingBalance(preset.btStartingBalance);
    if (preset.btRiskModel) setBtRiskModel(preset.btRiskModel);
    if (typeof preset.btRiskPercent === "number") setBtRiskPercent(preset.btRiskPercent);
    if (typeof preset.btFixedRiskDollars === "number") setBtFixedRiskDollars(preset.btFixedRiskDollars);
    if (typeof preset.btRealisticEnabled === "boolean") setBtRealisticEnabled(preset.btRealisticEnabled);
    if (preset.btAccountType) setBtAccountType(preset.btAccountType as RealisticAccountType);
    if (typeof preset.btAllowFractionalShares === "boolean") setBtAllowFractionalShares(preset.btAllowFractionalShares);
    if (typeof preset.btAllowShorts === "boolean") setBtAllowShorts(preset.btAllowShorts);
    if (typeof preset.btMarginMultiplier === "number") setBtMarginMultiplier(preset.btMarginMultiplier);
    if (typeof preset.btMaxPositionPct === "number") setBtMaxPositionPct(preset.btMaxPositionPct);
    if (typeof preset.btMaxDailyLossR === "number") setBtMaxDailyLossR(preset.btMaxDailyLossR);
    if (typeof preset.btMaxMonthlyLossR === "number") setBtMaxMonthlyLossR(preset.btMaxMonthlyLossR);
    if (typeof preset.btSlippageR === "number") setBtSlippageR(preset.btSlippageR);
    if (typeof preset.btCommissionR === "number") setBtCommissionR(preset.btCommissionR);
    if (preset.btLeaderExitMode) setBtLeaderExitMode(preset.btLeaderExitMode as LeaderExitMode);
  };

  const loadAdminStylePreset = () => {
    applyBacktestPreset({
      btGradeProfile: "Pullback",
      btDirectionFilter: "Long",
      btRegimeFilter: "Off",
      btSessionFilter: "MiddayAfternoon",
      btSetupTypeFilter: "AdaptiveBest",
      btStrategyEngine: "UniversalAdaptiveProV3",
      btMinScore: 60,
      btMaxScore: 100,
      btMinRR: 1,
      btCooldown: 60,
      btMaxBars: 120,
      btWarmup: 200,
      btMaxOpenTrades: 4,
      btMaxTotalRisk: 8,
      btNoOvernight: false,
      btTargetMode: "FixedR",
      btFixedTargetR: 2.5,
      btAtrTargetMultiple: 2,
      btMinVolumeRatio: 1,
      btMaxExtensionAtr: 99,
      btStartingBalance: 100000,
      btRiskModel: "Percent",
      btRiskPercent: 1,
      btFixedRiskDollars: 100,
      btRealisticEnabled: true,
      btAccountType: "Cash",
      btAllowFractionalShares: true,
      btAllowShorts: false,
      btMarginMultiplier: 1,
      btMaxPositionPct: 25,
      btMaxDailyLossR: 0,
      btMaxMonthlyLossR: 0,
      btSlippageR: 0,
      btCommissionR: 0,
      btLeaderExitMode: "Fixed",
      alpacaAdjustment: "split",
    });
    setBasketSymbols(TRACKED_500_SYMBOLS);
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(8);
    setBasketAccountPolicy("V72_500_ACTIVE_QUALITY_GATE");
    setResearchMode(false);
    setStatus("Loaded v9.3 admin-style backtest profile. Research Lab uses historical candles only and cannot place broker orders or change Admin settings.");
  };

  const loadCandidatePreset = () => {
    applyBacktestPreset({
      btGradeProfile: "Pullback",
      btDirectionFilter: "Long",
      btRegimeFilter: "Off",
      btSessionFilter: "MiddayAfternoon",
      btSetupTypeFilter: "Continuation",
      btStrategyEngine: "Manual",
      btMinScore: 60,
      btMaxScore: 100,
      btMinRR: 1,
      btCooldown: 60,
      btMaxBars: 120,
      btWarmup: 200,
      btMaxOpenTrades: 4,
      btMaxTotalRisk: 8,
      btNoOvernight: false,
      btTargetMode: "FixedR",
      btFixedTargetR: 2.5,
      btAtrTargetMultiple: 2,
      btMinVolumeRatio: 1,
      btMaxExtensionAtr: 99,
      btRiskModel: "Percent",
      btRiskPercent: 1,
      alpacaAdjustment: "split",
      btMaxMonthlyLossR: 6,
      btLeaderExitMode: "Fixed",
    });
    setStatus("Loaded v3.9 core long preset: long continuation, midday+afternoon, fixed 2.5R, 60-min cooldown.");
  };

  const loadDualRegimePreset = () => {
    applyBacktestPreset({
      btGradeProfile: "Pullback",
      btDirectionFilter: "Long",
      btRegimeFilter: "Off",
      btStrategyEngine: "UniversalAdaptiveProV4",
      btSessionFilter: "MiddayAfternoon",
      btSetupTypeFilter: "AdaptiveBest",
      btMinScore: 60,
      btMaxScore: 100,
      btMinRR: 1,
      btCooldown: 60,
      btMaxBars: 120,
      btWarmup: 200,
      btMaxOpenTrades: 4,
      btMaxTotalRisk: 4,
      btNoOvernight: false,
      btTargetMode: "FixedR",
      btFixedTargetR: 2.5,
      btAtrTargetMultiple: 2,
      btMinVolumeRatio: 1,
      btMaxExtensionAtr: 99,
      btStartingBalance: 5000,
      btRiskModel: "Percent",
      btRiskPercent: 1,
      alpacaAdjustment: "split",
      btMaxMonthlyLossR: 6,
      btLeaderExitMode: "PartialRunner",
      btRealisticEnabled: true,
      btAccountType: "Cash",
      btAllowFractionalShares: true,
      btAllowShorts: false,
      btMarginMultiplier: 1,
      btMaxPositionPct: 35,
    });
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    loadSuperWideHundredBasket();
    setStatus("Loaded v7.2 active quality gate: $5k cash account, long/cash only, tracked 500-symbol research universe, active-only default, sleeve kept as research-only, and watchlist controls.");
  };

  const loadBaseNineBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, PFE, DIS, AAPL, NVDA, TSLA");
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(35);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Base 9: 35% position, 4 slots, 1% risk/trade, 4% max total risk, v7.2 active quality gate policy.");
  };

  const loadBalancedFifteenBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, PFE, DIS, AAPL, NVDA, TSLA, MSFT, META, AMD, WMT, XOM, KO");
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Balanced 15 baseline: 25% position, 4 slots, 1% risk/trade, 4% max total risk, v7.2 active quality gate policy.");
  };

  const loadBalancedFifteenSmallSlotsBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, PFE, DIS, AAPL, NVDA, TSLA, MSFT, META, AMD, WMT, XOM, KO");
    setBasketMaxOpenTrades(5);
    setBasketMaxTotalRisk(5);
    setBtMaxPositionPct(20);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Balanced 15 small-slot test: 20% position, 5 slots, 1% risk/trade, 5% max total risk, v7.2 active quality gate policy.");
  };

  const loadWideTwentyConservativeBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, PFE, DIS, AAPL, NVDA, TSLA, MSFT, META, AMD, WMT, XOM, KO, JNJ, NFLX, COIN, JPM, ORCL");
    setBasketMaxOpenTrades(6);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(20);
    setBtRiskPercent(0.5);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Wide 20 conservative: 20% position, 6 slots, 0.5% risk/trade, 4% max total risk, v7.2 active quality gate policy.");
  };

  const loadWideTwentyBaselineBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, PFE, DIS, AAPL, NVDA, TSLA, MSFT, META, AMD, WMT, XOM, KO, JNJ, NFLX, COIN, JPM, ORCL");
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Wide 20 apples-to-apples baseline: 25% position, 4 slots, 1% risk/trade, 4% max total risk, v7.2 active quality gate policy.");
  };

  const loadWideTwentyOpportunityBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, PFE, DIS, AAPL, NVDA, TSLA, MSFT, META, AMD, WMT, XOM, KO, JNJ, NFLX, COIN, JPM, ORCL");
    setBasketMaxOpenTrades(5);
    setBasketMaxTotalRisk(5);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Wide 20 opportunity test: 25% position, 5 slots, 1% risk/trade, 5% max total risk, v7.2 active quality gate policy.");
  };

  const loadWideFilteredBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, DIS, AAPL, NVDA, TSLA, MSFT, AMD, WMT, XOM, KO, JNJ, NFLX, JPM");
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Wide Filtered 16: removes repeated Review/remove symbols from Wide 20 and uses v7.2 active quality gate policy.");
  };

  const loadSuperWideThirtyBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, DIS, AAPL, NVDA, TSLA, MSFT, AMD, WMT, XOM, KO, JNJ, NFLX, JPM, GOOGL, AMZN, AVGO, COST, V, MA, LLY, UNH, HD, NKE, CRM, MCD, CAT, GE");
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Tracked Research 30: broad liquid universe, 25% position, 4 slots, 1% risk/trade, 4% max total risk, and 25% dynamic leader sleeve benchmark.");
  };

  const loadSuperWideFiftyBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, PYPL, DIS, AAPL, NVDA, TSLA, MSFT, AMD, WMT, XOM, KO, JNJ, NFLX, JPM, GOOGL, AMZN, AVGO, COST, V, MA, LLY, UNH, HD, NKE, CRM, MCD, CAT, GE, META, ORCL, IBM, NOW, ADBE, INTU, PLTR, MU, QCOM, TXN, MRK, ABBV, TMO, PEP, SBUX, BA, GS, BAC, CVX, COP");
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Tracked Research 50: larger liquid universe stress test, 25% position, 4 slots, 1% risk/trade, 4% max total risk, and dynamic sleeve audit from 0% to 100%. Expect this to take longer than 30 symbols.");
  };

  const loadSuperWideHundredBasket = () => {
    setBasketSymbols("SPY, QQQ, IWM, DIA, XLK, XLF, XLE, XLY, XLV, XLI, PYPL, DIS, AAPL, NVDA, TSLA, MSFT, AMD, WMT, XOM, KO, JNJ, NFLX, JPM, GOOGL, AMZN, AVGO, COST, V, MA, LLY, UNH, HD, NKE, CRM, MCD, CAT, GE, META, ORCL, IBM, NOW, ADBE, INTU, PLTR, MU, QCOM, TXN, MRK, ABBV, TMO, PEP, SBUX, BA, GS, BAC, CVX, COP, C, MS, BLK, SCHW, AMAT, LRCX, KLAC, INTC, CSCO, PANW, CRWD, SNOW, SHOP, UBER, ABNB, BKNG, TGT, LOW, TJX, PG, CL, EL, MRNA, PFE, ISRG, DHR, CVS, WBA, DE, HON, UPS, FDX, GM, F, RTX, LMT, NOC, LIN, APD, FCX, SLB, OXY, T");
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBtStart("2020-09-15");
    setBtEnd("2026-05-31");
    setBasketAccountPolicy("V71_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Tracked Research 100: 100-stock paper-style universe, 25% position, 4 slots, 1% risk/trade, 4% max total risk, active-only default, and watchlist controls. Expect a longer scan.");
  };

  const loadSuperWideFiveHundredBasket = () => {
    setBasketSymbols(TRACKED_500_SYMBOLS);
    setBasketMaxOpenTrades(4);
    setBasketMaxTotalRisk(4);
    setBtMaxPositionPct(25);
    setBtRiskPercent(1);
    setBtStart("2020-09-15");
    setBtEnd("2026-05-31");
    setBasketAccountPolicy("V72_500_ACTIVE_QUALITY_GATE");
    setStatus("Loaded Tracked Research 500: 500-symbol stress-test universe, active-only quality gate, 25% max position, 4 slots, 1% risk/trade, 4% max total risk. Expect this to take much longer; use it as a research/cloud-readiness stress test.");
  };

  const loadBearShortPreset = () => {
    applyBacktestPreset({
      btGradeProfile: "Pullback",
      btDirectionFilter: "Short",
      btRegimeFilter: "Off",
      btStrategyEngine: "BearShortOnly",
      btSessionFilter: "MiddayAfternoon",
      btSetupTypeFilter: "ShortPullbackReject",
      btMinScore: 60,
      btMaxScore: 100,
      btMinRR: 1,
      btCooldown: 60,
      btMaxBars: 120,
      btWarmup: 200,
      btMaxOpenTrades: 4,
      btMaxTotalRisk: 8,
      btNoOvernight: false,
      btTargetMode: "FixedR",
      btFixedTargetR: 2.5,
      btAtrTargetMultiple: 2,
      btMinVolumeRatio: 1,
      btMaxExtensionAtr: 99,
      btRiskModel: "Percent",
      btRiskPercent: 1,
      alpacaAdjustment: "split",
      btMaxMonthlyLossR: 6,
      btLeaderExitMode: "Fixed",
    });
    setStatus("Loaded v3.9 bear-short preset: short pullback/reject only, fixed 2.5R, 60-min cooldown, same base risk rules.");
  };

  const saveCurrentPreset = () => {
    localStorage.setItem(STRATEGY_PRESET_KEY, JSON.stringify(getCurrentBacktestPreset()));
    setStatus("Saved current backtest preset locally.");
  };

  const loadSavedPreset = () => {
    const raw = localStorage.getItem(STRATEGY_PRESET_KEY);
    if (!raw) { setStatus("No saved preset found yet."); return; }
    try {
      applyBacktestPreset(JSON.parse(raw));
      setStatus("Loaded saved local backtest preset.");
    } catch {
      setStatus("Saved preset could not be loaded.");
    }
  };

  const exportBacktestCsv = () => {
    if (!backtest?.trades.length) return;
    downloadTextFile(`${symbol.toUpperCase()}-${timeframe}-backtest-trades-v5-1.csv`, backtestTradesCsv(backtest.trades));
    setStatus(`Exported ${backtest.trades.length} backtest trades to CSV.`);
  };

  const loadHistoricalCsvFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setHistoricalCsv(text);
      setHistoricalFileName(file.name);
      const count = parseCsvCandles(text).length;
      setStatus(`Loaded historical CSV ${file.name}: ${count.toLocaleString()} clean candles parsed.`);
    };
    reader.onerror = () => setStatus("Could not read historical CSV file.");
    reader.readAsText(file);
  };

  return (
    <main className="research-control-room">
      <header className="hero admin-header-v85 admin-header-v87">
        <div>
          <div className="eyebrow">Public research lab · backtest-only</div>
          <h1>Backtest Control Room v9.3</h1>
          <p>
            Test Admin-style settings against historical candles. This page uses Alpaca/Massive/CSV market data for simulation only; it cannot place broker orders and cannot change the live Admin console.
          </p>
        </div>
        <div className="mode-card">
          <label>Backtest data handling</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as AppMode)}>
            <option value="Research">Research: allow historical/stale candles</option>
            <option value="Live">Strict: block stale auto-saves</option>
          </select>
          <label className="mt-12">View</label>
          <select value={researchMode ? "research" : "simple"} onChange={(e) => setResearchMode(e.target.value === "research")}>
            <option value="simple">Backtester: main results</option>
            <option value="research">Advanced diagnostics</option>
          </select>
          <p className="muted tiny">Broker execution is disabled here. Research Lab is for historical simulation, score-bucket proof, and profile testing only.</p>
        </div>
      </header>

      <section className="viewer-metrics-grid secondary-metrics admin-top-metrics admin-top-metrics-v87">
        <div className="dash-tile good"><span>Purpose</span><strong>Backtest only</strong><small>Research tests history; Admin controls broker execution.</small></div>
        <div className="dash-tile info"><span>Data source</span><strong>{btDataSource}</strong><small>Historical candles, not broker account positions.</small></div>
        <div className="dash-tile info"><span>Profile</span><strong>{btStrategyEngine}</strong><small>{btSessionFilter} · {btDirectionFilter} · {btFixedTargetR}R target</small></div>
        <div className="dash-tile warn"><span>Broker orders</span><strong>Disabled</strong><small>No Alpaca Paper or Live orders from this page.</small></div>
      </section>

      <section className="panel">
        <div className="panel-heading-row">
          <div>
            <h2>Backtest command</h2>
            <p>Use this like the Admin console, but for historical testing. Load the broker-style profile, choose dates/watchlist, then run a simulation.</p>
          </div>
          <span className="small-pill">Public · simulation only</span>
        </div>
        <div className="actions wrap-actions">
          <button onClick={loadAdminStylePreset}>Load admin-style paper profile</button>
          <button className="secondary" onClick={loadSuperWideFiveHundredBasket}>Load 500-symbol research list</button>
          <button className="secondary" onClick={() => setResearchMode(!researchMode)}>{researchMode ? "Hide diagnostics" : "Show diagnostics"}</button>
        </div>
        <p className="muted tiny">No “apply to Admin” button exists here on purpose. This page is safe to share because it cannot alter cloud bot settings.</p>
      </section>

      {researchMode ? <>
      <section className="panel grid two">
        <div>
          <h2>1. Data Controls</h2>
          <div className="form-grid">
            <label>
              Symbol
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="SPY" />
            </label>
            <label>
              Timeframe
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
                {TIMEFRAMES.map((tf) => <option key={tf}>{tf}</option>)}
              </select>
            </label>
            <label>
              Market data source
              <select value={marketDataSource} onChange={(e) => setMarketDataSource(e.target.value as ApiDataSource)}>
                <option value="Alpaca">Alpaca</option>
                <option value="Massive">Massive</option>
              </select>
            </label>
            <label>
              Live refresh
              <select value={liveRefresh ? "on" : "off"} onChange={(e) => setLiveRefresh(e.target.value === "on")}>
                <option value="off">OFF</option>
                <option value="on">ON</option>
              </select>
            </label>
            <label>
              Refresh seconds
              <select value={refreshSeconds} onChange={(e) => setRefreshSeconds(Number(e.target.value))}>
                {[10, 30, 60, 120].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="actions">
            <button onClick={() => void fetchCandles("manual fetch")} disabled={isLoading}>{isLoading ? "Loading..." : `Fetch ${marketDataSource} Candles`}</button>
            <button className="secondary" onClick={() => gradeCurrentCsv()}>Grade CSV Data</button>
          </div>
          <div className="status-line">{status}</div>
          {error ? <div className="error-box">{error}</div> : null}
        </div>

        <div>
          <h2>2. Auto Rules</h2>
          <div className="form-grid">
            <label>
              Auto-save signals
              <select value={autoSave ? "on" : "off"} onChange={(e) => setAutoSave(e.target.value === "on")}>
                <option value="off">OFF</option>
                <option value="on">ON</option>
              </select>
            </label>
            <label>
              Auto-check journal
              <select value={autoCheck ? "on" : "off"} onChange={(e) => setAutoCheck(e.target.value === "on")}>
                <option value="off">OFF</option>
                <option value="on">ON</option>
              </select>
            </label>
            <label>
              Grader profile
              <select value={gradeProfile} onChange={(e) => setGradeProfile(e.target.value as GradeProfile)}>
                <option value="Pullback">Pullback/reclaim preferred</option>
                <option value="Breakout">Breakout preferred</option>
                <option value="Balanced">Balanced</option>
              </select>
            </label>
            <label>
              Min score
              <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
            </label>
            <label>
              Max score
              <input type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} />
            </label>
            <label>
              Min R/R
              <input type="number" step="0.1" value={minRR} onChange={(e) => setMinRR(Number(e.target.value))} />
            </label>
            <label>
              Cooldown minutes
              <input type="number" value={cooldownMinutes} onChange={(e) => setCooldownMinutes(Number(e.target.value))} />
            </label>
            <label>
              Max stale minutes in Live Mode
              <input type="number" value={maxStaleMinutes} onChange={(e) => setMaxStaleMinutes(Number(e.target.value))} />
            </label>
            <label>
              No overnight holds
              <select value={noOvernightHolds ? "yes" : "no"} onChange={(e) => setNoOvernightHolds(e.target.value === "yes")}>
                <option value="yes">Yes, close before next day</option>
                <option value="no">No, allow overnight</option>
              </select>
            </label>
            <label>
              Target mode
              <select value={targetMode} onChange={(e) => setTargetMode(e.target.value as TargetMode)}>
                <option value="Structure">Structure: support/resistance</option>
                <option value="FixedR">Fixed R target</option>
                <option value="ATR">ATR/range target</option>
              </select>
            </label>
            <label>
              Fixed target R
              <input type="number" step="0.1" value={fixedTargetR} onChange={(e) => setFixedTargetR(Number(e.target.value))} />
            </label>
            <label>
              ATR/range multiple
              <input type="number" step="0.1" value={atrTargetMultiple} onChange={(e) => setAtrTargetMultiple(Number(e.target.value))} />
            </label>
          </div>
          <div className="actions">
            <button className="secondary" onClick={() => void checkOpenTrades()}>Check Open Trades Now</button>
          </div>
          <p className="muted small">Research mode allows historical candles. Strict mode blocks stale auto-saves. No overnight holds prevents next-day bars from deciding same-day trades.</p>
        </div>
      </section>

      <section className="panel">
        <h2>3. Chart</h2>
        <TradingChart candles={candles} grade={grade} />
      </section>

      <section className="panel grid two">
        <div>
          <h2>4. Current Grade</h2>
          {grade ? (
            <div className="grade-card">
              <div className="score-row">
                <div className="score-circle">{grade.score}</div>
                <div>
                  <h3>{symbol.toUpperCase()} {timeframe} · {grade.bias}</h3>
                  <p className="muted">Latest candle: {formatDateTime(grade.latestCandleTime)} · Stale: {grade.staleMinutes} min</p>
                </div>
              </div>
              <div className="mini-grid">
                <StatCard label="Entry" value={grade.entry} />
                <StatCard label="Stop" value={grade.stop} />
                <StatCard label="Target" value={grade.target} />
                <StatCard label="R/R" value={`${grade.rr}:1`} />
                <StatCard label="Setup" value={grade.setupType} />
                <StatCard label="Regime" value={grade.marketRegime} helper={grade.regimeReasons?.[0]} />
                <StatCard label="Profile" value={grade.gradeProfile} />
                <StatCard label="RSI" value={grade.diagnostics.rsi} />
                <StatCard label="Extension" value={`${grade.diagnostics.extensionAtr} ATR`} />
                <StatCard label="Volume" value={`${grade.diagnostics.volumeRatio}x`} />
              </div>
              <p className="muted small">Target mode: {grade.targetMode} · {grade.targetDescription}</p>
              <h4>Reasons</h4>
              <ul>{grade.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              {grade.warnings.length ? <><h4>Warnings</h4><ul>{grade.warnings.map((w) => <li key={w}>{w}</li>)}</ul></> : null}
              <div className="actions">
                <button onClick={saveManualTrade}>Save to Research Journal</button>
              </div>
            </div>
          ) : <div className="chart-empty">No grade yet. Fetch candles or grade CSV data.</div>}
        </div>

        <div>
          <h2>5. CSV Input</h2>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} spellCheck={false} />
          <p className="muted tiny">Format: time,open,high,low,close,volume</p>
        </div>
      </section>
      </> : null}

      <section className="panel">
        <h2>{researchMode ? "6. Backtester" : "Research Lab"}</h2>
        <p className="muted">
          {researchMode
            ? "This runs the same grading logic over past candles. Use Alpaca, Massive, or uploaded CSV data. Massive is useful for recent multi-year intraday backtests; CSV mode is for older vendor files like 1999–2013."
            : "Backtester mode focuses on the realistic account replay. Advanced diagnostics include CSV tools, single-symbol grading, model A/B tests, risk sweeps, rejected-trade diagnostics, and the local research journal."}
        </p>
        {researchMode ? <>
        <div className="actions wrap-actions">
          <button className="secondary" onClick={loadCandidatePreset}>Load Core Long Preset</button>
          <button className="secondary" onClick={loadDualRegimePreset}>Load v5.3 Realistic Account Preset</button>
          <button className="secondary" onClick={loadBearShortPreset}>Load Bear Short Preset</button>
          <button className="secondary" onClick={saveCurrentPreset}>Save Current Preset</button>
          <button className="secondary" onClick={loadSavedPreset}>Load Saved Preset</button>
        </div>
        <p className="muted tiny">v5.3 keeps the workflow simple: run the realistic universal account validator first. It scans every symbol together, prioritizes bull-recovery/clean pullback setups, caps lower-quality states, enforces buying-power rules, and shows accepted/skipped trades so results are easier to trust.</p>

        <div className="panel-lite">
          <h3>Historical data source</h3>
          <div className="form-grid">
            <label>
              Backtest source
              <select value={btDataSource} onChange={(e) => setBtDataSource(e.target.value as BacktestDataSource)}>
                <option value="Alpaca">Alpaca API candles</option>
                <option value="Massive">Massive API candles</option>
                <option value="CSV">Uploaded historical CSV</option>
              </select>
            </label>
            <label>
              Alpaca historical adjustment
              <select value={alpacaAdjustment} onChange={(e) => setAlpacaAdjustment(e.target.value as AlpacaAdjustment)} disabled={btDataSource !== "Alpaca"}>
                <option value="split">Split-adjusted (recommended)</option>
                <option value="all">All-adjusted</option>
                <option value="raw">Raw/live-style</option>
              </select>
            </label>
            <label>
              Upload historical CSV
              <input type="file" accept=".csv,text/csv" onChange={(e) => loadHistoricalCsvFile(e.target.files?.[0])} />
            </label>
            <label>
              Parsed candles
              <input readOnly value={historicalCsv ? parseCsvCandles(historicalCsv).length.toLocaleString() : "0"} />
            </label>
            <label>
              File
              <input readOnly value={historicalFileName || "No CSV loaded"} />
            </label>
          </div>
          {btDataSource === "CSV" ? (
            <>
              <p className="muted small">CSV mode lets you backtest old intraday files that Alpaca cannot provide, such as 1999/2000-era SPY data. Required columns: time, open, high, low, close, volume. Times should be consistent; Eastern time is best for session filters.</p>
              <textarea className="historical-csv-box" value={historicalCsv} onChange={(e) => setHistoricalCsv(e.target.value)} placeholder="time,open,high,low,close,volume
1999-01-04 09:30:00,123.45,123.80,123.20,123.60,100000" spellCheck={false} />
            </>
          ) : (
            <p className="muted small">Alpaca mode now defaults to split-adjusted historical candles for backtests, which keeps multi-year buy-and-hold and indicators realistic around stock splits. Use raw/live-style only when you specifically want unadjusted broker-feed candles. Massive and CSV remain comparison/import modes.</p>
          )}
        </div>

        <div className="form-grid backtest-grid">
          <label>
            Start date
            <input type="date" value={btStart} onChange={(e) => setBtStart(e.target.value)} />
          </label>
          <label>
            End date
            <input type="date" value={btEnd} onChange={(e) => setBtEnd(e.target.value)} />
          </label>
          <label>
            Grader profile
            <select value={btGradeProfile} onChange={(e) => setBtGradeProfile(e.target.value as GradeProfile)}>
              <option value="Pullback">Pullback/reclaim preferred</option>
              <option value="Breakout">Breakout preferred</option>
              <option value="Balanced">Balanced</option>
            </select>
          </label>
          <label>
            Direction filter
            <select value={btDirectionFilter} onChange={(e) => setBtDirectionFilter(e.target.value as DirectionFilter)}>
              <option value="All">All directions</option>
              <option value="Long">Long only</option>
              <option value="Short">Short only</option>
            </select>
          </label>
          <label>
            Regime filter
            <select value={btRegimeFilter} onChange={(e) => setBtRegimeFilter(e.target.value as RegimeFilter)}>
              <option value="Off">Off: use current filters</option>
              <option value="BlockLongBear">Defensive: block longs in bear/panic</option>
              <option value="LongBullOnly">Cash mode: longs only in bull regime</option>
              <option value="ShortBearOnly">Shorts only in confirmed bear regime</option>
              <option value="LongBullShortBear">Long bull / short bear / cash neutral</option>
            </select>
          </label>
          <label>
            Session filter
            <select value={btSessionFilter} onChange={(e) => setBtSessionFilter(e.target.value as SessionFilter)}>
              <option value="All">All sessions</option>
              <option value="RegularHours">Regular hours: 9:30-4:00 ET</option>
              <option value="MiddayAfternoon">Midday + Afternoon: 11:30-4:00 ET</option>
              <option value="Morning">Morning: 9:30-11:30 ET</option>
              <option value="Midday">Midday: 11:30-2:00 ET</option>
              <option value="Afternoon">Afternoon: 2:00-4:00 ET</option>
              <option value="Outside">Outside regular hours</option>
            </select>
          </label>
          <label>
            Setup type filter
            <select value={btSetupTypeFilter} onChange={(e) => setBtSetupTypeFilter(e.target.value as SetupTypeFilter)}>
              <option value="All">All setup types</option>
              <option value="Continuation">Any continuation only</option>
              <option value="Pullback">Any pullback/reclaim/reject only</option>
              <option value="ContinuationPullback">Any continuation + pullback/reclaim</option>
              <option value="LongContinuation">Long continuation only</option>
              <option value="LongPullback">Long pullback/reclaim only</option>
              <option value="LongContinuationPullback">Long continuation + pullback/reclaim</option>
              <option value="ShortPullbackReject">Short pullback/reject only</option>
              <option value="ShortRallyRejection">Short rally rejection only</option>
              <option value="ShortContinuation">Short continuation only</option>
              <option value="AdaptiveBest">Adaptive best: long continuation/pullback + short pullback/reject</option>
              <option value="ExcludeBreakoutChase">Exclude breakout + chase</option>
              <option value="Breakout">Breakout/breakdown only</option>
              <option value="Chase">Chase/extended only</option>
            </select>
          </label>
          <label>
            Strategy engine
            <select value={btStrategyEngine} onChange={(e) => setBtStrategyEngine(e.target.value as StrategyEngine)}>
              <option value="Manual">Manual filters only</option>
              <option value="DefensiveLong">Defensive long: block longs in bear/panic</option>
              <option value="UniversalAdaptive">Universal adaptive v3.4: bull longs, selective neutral, bear short pullback/reject, cash panic
              </option>
              <option value="UniversalAdaptivePro">Universal adaptive pro v3.5: leader longs, neutral cash, stricter bear shorts</option>
              <option value="UniversalAdaptiveProV6">Universal adaptive v4.0: rolling states, cash-first failure overlay, realistic testing</option>
              <option value="UniversalAdaptiveProV5">Universal adaptive pro v3.9: dynamic state, failed-leader mode, cash-then-short</option>
              <option value="UniversalAdaptiveProV4">Universal adaptive pro v3.8: no shorts on leaders, choppy defense, leader runner</option>
              <option value="UniversalAdaptiveProV3">Universal adaptive pro v3.7: broad personality, stricter leader shorts, stronger leader expansion</option>
              <option value="UniversalAdaptiveProV2">Universal adaptive pro v3.6: no shorts on leaders, weak-name shorts, leader expansion</option>
              <option value="AdaptiveRegime">Legacy adaptive v3.2: long bull/neutral, short pullback/reject in bear, cash panic</option>
              <option value="BullNeutralLongBearShort">Legacy dual: bull/neutral longs, bear shorts, cash panic</option>
              <option value="BullLongBearShortCashNeutral">Legacy strict: bull longs, bear shorts, cash neutral/panic</option>
              <option value="BearShortOnly">Bear short engine only</option>
            </select>
          </label>
          <label>
            Min score
            <input type="number" value={btMinScore} onChange={(e) => setBtMinScore(Number(e.target.value))} />
          </label>
          <label>
            Max score
            <input type="number" value={btMaxScore} onChange={(e) => setBtMaxScore(Number(e.target.value))} />
          </label>
          <label>
            Min R/R
            <input type="number" step="0.1" value={btMinRR} onChange={(e) => setBtMinRR(Number(e.target.value))} />
          </label>
          <label>
            Cooldown minutes
            <input type="number" value={btCooldown} onChange={(e) => setBtCooldown(Number(e.target.value))} />
          </label>
          <label>
            Max bars to hold
            <input type="number" value={btMaxBars} onChange={(e) => setBtMaxBars(Number(e.target.value))} />
          </label>
          <label>
            Warmup bars
            <input type="number" value={btWarmup} onChange={(e) => setBtWarmup(Number(e.target.value))} />
          </label>
          <label>
            Max open trades
            <select value={btMaxOpenTrades} onChange={(e) => { const v = Number(e.target.value); setBtMaxOpenTrades(v); setBtOneAtATime(v === 1); }}>
              <option value={1}>1 trade max</option>
              <option value={2}>2 trades max</option>
              <option value={3}>3 trades max</option>
              <option value={4}>4 trades max</option>
              <option value={0}>Unlimited</option>
            </select>
          </label>
          <label>
            Max total open risk %
            <input type="number" step="0.5" value={btMaxTotalRisk} onChange={(e) => setBtMaxTotalRisk(Number(e.target.value))} />
          </label>
          <label>
            No overnight holds
            <select value={btNoOvernight ? "yes" : "no"} onChange={(e) => setBtNoOvernight(e.target.value === "yes")}>
              <option value="yes">Yes, close before next day</option>
              <option value="no">No, allow overnight</option>
            </select>
          </label>
          <label>
            Target mode
            <select value={btTargetMode} onChange={(e) => setBtTargetMode(e.target.value as TargetMode)}>
              <option value="Structure">Structure: support/resistance</option>
              <option value="FixedR">Fixed R target</option>
              <option value="ATR">ATR/range target</option>
            </select>
          </label>
          <label>
            Fixed target R
            <input type="number" step="0.1" value={btFixedTargetR} onChange={(e) => setBtFixedTargetR(Number(e.target.value))} />
          </label>
          <label>
            Leader exit mode
            <select value={btLeaderExitMode} onChange={(e) => setBtLeaderExitMode(e.target.value as LeaderExitMode)}>
              <option value="Fixed">Fixed target only</option>
              <option value="Expanded">Expanded target for explosive leaders</option>
              <option value="PartialRunner">50% at target + 50% trailing runner</option>
            </select>
          </label>
          <label>
            ATR/range multiple
            <input type="number" step="0.1" value={btAtrTargetMultiple} onChange={(e) => setBtAtrTargetMultiple(Number(e.target.value))} />
          </label>
          <label>
            Min volume ratio
            <input type="number" step="0.1" value={btMinVolumeRatio} onChange={(e) => setBtMinVolumeRatio(Number(e.target.value))} />
          </label>
          <label>
            Max extension ATR
            <input type="number" step="0.1" value={btMaxExtensionAtr} onChange={(e) => setBtMaxExtensionAtr(Number(e.target.value))} />
          </label>
          <label>
            Starting account $
            <input type="number" step="100" value={btStartingBalance} onChange={(e) => setBtStartingBalance(Number(e.target.value))} />
          </label>
          <label>
            Portfolio risk model
            <select value={btRiskModel} onChange={(e) => setBtRiskModel(e.target.value as RiskModel)}>
              <option value="Percent">Percent risk per trade</option>
              <option value="Fixed">Fixed $ risk per trade</option>
            </select>
          </label>
          <label>
            Risk % per trade
            <input type="number" step="0.1" value={btRiskPercent} onChange={(e) => setBtRiskPercent(Number(e.target.value))} />
          </label>
          <label>
            Fixed $ risk
            <input type="number" step="10" value={btFixedRiskDollars} onChange={(e) => setBtFixedRiskDollars(Number(e.target.value))} />
          </label>
          <label>
            Realistic account mode
            <select value={btRealisticEnabled ? "on" : "off"} onChange={(e) => setBtRealisticEnabled(e.target.value === "on")}>
              <option value="on">ON: enforce buying power</option>
              <option value="off">OFF: theoretical R only</option>
            </select>
          </label>
          <label>
            Account type
            <select value={btAccountType} onChange={(e) => setBtAccountType(e.target.value as RealisticAccountType)}>
              <option value="Cash">Cash account / 1x buying power</option>
              <option value="Margin">Margin account</option>
            </select>
          </label>
          <label>
            Margin multiplier
            <input type="number" step="0.25" value={btMarginMultiplier} onChange={(e) => setBtMarginMultiplier(Number(e.target.value))} />
          </label>
          <label>
            Max position size %
            <input type="number" step="5" value={btMaxPositionPct} onChange={(e) => setBtMaxPositionPct(Number(e.target.value))} />
          </label>
          <label>
            Fractional shares
            <select value={btAllowFractionalShares ? "yes" : "no"} onChange={(e) => setBtAllowFractionalShares(e.target.value === "yes")}>
              <option value="yes">Yes</option>
              <option value="no">No, whole shares only</option>
            </select>
          </label>
          <label>
            Allow shorts in realistic mode
            <select value={btAllowShorts ? "yes" : "no"} onChange={(e) => setBtAllowShorts(e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <label>
            Max daily loss R
            <input type="number" step="0.5" value={btMaxDailyLossR} onChange={(e) => setBtMaxDailyLossR(Number(e.target.value))} />
          </label>
          <label>
            Max monthly loss R
            <input type="number" step="1" value={btMaxMonthlyLossR} onChange={(e) => setBtMaxMonthlyLossR(Number(e.target.value))} />
          </label>
          <label>
            Slippage cost R/trade
            <input type="number" step="0.01" value={btSlippageR} onChange={(e) => setBtSlippageR(Number(e.target.value))} />
          </label>
          <label>
            Commission/fees R/trade
            <input type="number" step="0.01" value={btCommissionR} onChange={(e) => setBtCommissionR(Number(e.target.value))} />
          </label>
        </div>
        <div className="actions">
          <button onClick={() => void runBacktester()} disabled={isBacktesting}>{isBacktesting ? "Running..." : "Run Backtest"}</button>
          {backtest ? <button className="secondary" onClick={addBacktestTradesToJournal}>Import Backtest Trades to Journal</button> : null}
          {backtest ? <button className="secondary" onClick={exportBacktestCsv}>Export Backtest Trades CSV</button> : null}
        </div>
        </> : null}

        <div className="panel-lite">
          <div className="section-heading-row">
            <div>
              <h3>Realistic Universal Account Validator</h3>
              <p className="muted small">Main v7.1 workflow: choose a date window, scan 100 stocks as if it was live, enforce buying power, rank trades with symbol quality, keep the active-only scanner as the live default, and use the live watchlist scanner for paper-testing current setups.</p>
            </div>
            <button className="secondary small" onClick={() => setResearchMode(!researchMode)}>{researchMode ? "Hide research diagnostics" : "Show research diagnostics"}</button>
          </div>
          <div className="panel-lite live-proof-box">
            <h4>Clean live-style controls</h4>
            <p className="muted tiny">These dates apply to the simple-page validator and the research backtester. The sleeve rotation still uses only candles available before each rebalance, so the test should act like it started on the chosen start date without knowing the future.</p>
            <div className="form-grid">
              <label>
                Start date
                <input type="date" value={btStart} onChange={(e) => setBtStart(e.target.value)} />
              </label>
              <label>
                End date
                <input type="date" value={btEnd} onChange={(e) => setBtEnd(e.target.value)} />
              </label>
              <label>
                Starting account
                <input type="number" step="100" value={btStartingBalance} onChange={(e) => setBtStartingBalance(Number(e.target.value))} />
              </label>
              <label>
                Main benchmark
                <input readOnly value="Tracked Research 500 · active-only quality-gate stress test" />
              </label>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Symbols to test
              <input value={basketSymbols} onChange={(e) => setBasketSymbols(e.target.value)} placeholder="SPY, QQQ, IWM, PYPL, PFE, DIS, AAPL, NVDA, TSLA" />
            </label>
            <label>
              Basket source
              <select value={btDataSource === "CSV" ? "Alpaca" : btDataSource} onChange={(e) => setBtDataSource(e.target.value as ApiDataSource)}>
                <option value="Alpaca">Alpaca</option>
                <option value="Massive">Massive</option>
              </select>
            </label>
            <label>
              Timeframe
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
                {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </label>
            {btDataSource === "Alpaca" ? <label>
              Alpaca adjustment
              <select value={alpacaAdjustment} onChange={(e) => setAlpacaAdjustment(e.target.value as AlpacaAdjustment)}>
                <option value="raw">raw</option>
                <option value="split">split</option>
                <option value="dividend">dividend</option>
                <option value="all">all</option>
              </select>
            </label>
            : null}
            <label>
              Account max open trades
              <input type="number" value={basketMaxOpenTrades} onChange={(e) => setBasketMaxOpenTrades(Number(e.target.value))} />
            </label>
            <label>
              Account max total risk %
              <input type="number" step="0.5" value={basketMaxTotalRisk} onChange={(e) => setBasketMaxTotalRisk(Number(e.target.value))} />
            </label>
            <label>
              Max position size %
              <input type="number" step="1" value={btMaxPositionPct} onChange={(e) => setBtMaxPositionPct(Number(e.target.value))} />
            </label>
            <label>
              Risk per trade %
              <input type="number" step="0.25" value={btRiskPercent} onChange={(e) => setBtRiskPercent(Number(e.target.value))} />
            </label>
            <label>
              Account policy
              <select value={basketAccountPolicy} onChange={(e) => setBasketAccountPolicy(e.target.value as AccountPolicy)}>
                <option value="V53_STRICT">v5.3 strict</option>
                <option value="V54_SCORE_OVERRIDE">v5.4 score override</option>
                <option value="V54_BULL_TIGHT">v5.4 bull-normal tight</option>
                <option value="V54_COMBO">v5.4 combo</option>
                <option value="V55_CONTROLLED">v5.5 controlled override</option>
                <option value="V57_QUALITY_FILTER">v5.7 quality filter</option>
                <option value="V59_OPPORTUNITY_FILTER">v5.9 opportunity filter</option>
                <option value="V60_LEADER_SWEEP">v6.0 opportunity + sleeve sweep</option>
                <option value="V61_SLEEVE_BENCHMARK">v6.1 practical 15% simulated sleeve</option>
                <option value="V62_REAL_SLEEVE">v6.2 simulated 15% leader sleeve</option>
                <option value="V63_SUPER_WIDE">v6.3 wide research + 25% sleeve benchmark</option>
                <option value="V64_DYNAMIC_SLEEVE">v6.4 dynamic rotating 25% sleeve</option>
                <option value="V65_SUPER_WIDE_50">v6.5 wide research 50 + dynamic 25% sleeve</option>
                <option value="V66_SLEEVE_100_AUDIT">v6.6 wide research 50 + 0-100% sleeve audit</option>
                <option value="V67_LIVE_STYLE_SIM">v6.7 live-style wide research 50 simulator</option>
                <option value="V68_100_TRADE_READINESS">v6.8 100-trade live readiness simulator</option>
                <option value="V69_LIVE_100_STOCK_SIM">v6.9 live 100-stock simulator</option>
                <option value="V70_PAPER_LIVE_ACTIVE">v7.1 active quality gate</option>
                <option value="V71_ACTIVE_QUALITY_GATE">v7.1 active quality gate</option>
                <option value="V72_500_ACTIVE_QUALITY_GATE">v7.2 500-stock active quality gate</option>
              </select>
            </label>
          </div>
          <div className="setup-summary">
            <strong>Current setup:</strong> {basketSymbols.split(/[,:\s]+/).filter(Boolean).length} symbols · {btDataSource === "CSV" ? "Alpaca" : btDataSource} {timeframe}{btDataSource === "Alpaca" ? ` (${alpacaAdjustment})` : ""} · {ACCOUNT_POLICY_LABELS[basketAccountPolicy]} · {btMaxPositionPct}% max position · {basketMaxOpenTrades} slots · {btRiskPercent}% risk/trade · {basketMaxTotalRisk}% max total risk · cash account · shorts {btAllowShorts ? "allowed" : "blocked"}
          </div>
          <div className="actions wrap-actions">
            <button className="secondary small" onClick={loadBaseNineBasket}>Base 9 — 35% / 4 slots / 1% / 4%</button>
            <button className="secondary small" onClick={loadBalancedFifteenBasket}>Balanced 15 — 25% / 4 slots / 1% / 4%</button>
            <button className="secondary small" onClick={loadBalancedFifteenSmallSlotsBasket}>Balanced 15 Small — 20% / 5 slots / 1% / 5%</button>
            <button className="secondary small" onClick={loadWideTwentyConservativeBasket}>Wide 20 Conservative — 20% / 6 slots / 0.5% / 4%</button>
            <button className="secondary small" onClick={loadWideTwentyBaselineBasket}>Wide 20 Baseline — 25% / 4 slots / 1% / 4%</button>
            <button className="secondary small" onClick={loadWideTwentyOpportunityBasket}>Wide 20 Opportunity — 25% / 5 slots / 1% / 5%</button>
            <button className="secondary small" onClick={loadWideFilteredBasket}>Wide Filtered 16 — 25% / 4 slots / 1% / 4%</button>
            <button className="secondary small" onClick={loadSuperWideThirtyBasket}>Tracked 30 — control / 25% / 4 / 1% / 4%</button>
            <button className="secondary small" onClick={loadSuperWideFiftyBasket}>Tracked 50 — control / 0-100% sleeve / 25% / 4 / 1% / 4%</button>
            <button className="small" onClick={loadSuperWideHundredBasket}>Tracked 100 — v7.1 quality gate / active-only / 25% / 4 / 1% / 4</button>
            <button className="primary small" onClick={loadSuperWideFiveHundredBasket}>Tracked 500 — v7.2 stress test / active-only / 25% / 4 / 1% / 4%</button>
          </div>
          <div className="actions">
            <button className="secondary" onClick={() => void runBasketBacktester()} disabled={isBasketTesting || btDataSource === "CSV"}>{isBasketTesting ? "Running Basket..." : "Run Realistic Universal Account"}</button>
            <button className="secondary" onClick={replayBatchFromCache} disabled={isBasketTesting || !basketCandidateSummary}>Replay Batch From Last Scan</button>
            {researchMode ? <button className="secondary" onClick={() => void runModelComparison()} disabled={isComparingModels || btDataSource === "CSV"}>{isComparingModels ? "Comparing Models..." : "Run Model A/B Comparison"}</button> : null}
            {researchMode ? <button className="secondary" onClick={clearBasketCandleCache}>Clear Candle Cache</button> : null}
          </div>

          <div className="panel-lite live-proof-box">
            <h4>Live watchlist scanner</h4>
            <p className="muted small">Runs the same current setup across the selected symbols using latest candles. This is for historical/research observation only; it does not place broker orders.</p>
            <div className="grid three">
              <label>
                Live scanner
                <select value={liveBasketEnabled ? "on" : "off"} onChange={(e) => setLiveBasketEnabled(e.target.value === "on")}>
                  <option value="off">OFF</option>
                  <option value="on">ON</option>
                </select>
              </label>
              <label>
                Refresh seconds
                <input type="number" min={60} value={liveBasketRefreshSeconds} onChange={(e) => setLiveBasketRefreshSeconds(Number(e.target.value) || 300)} />
              </label>
              <label>
                Last scan
                <input readOnly value={liveLastScan ? formatDateTime(liveLastScan) : "Not scanned yet"} />
              </label>
            </div>
            <div className="row-actions">
              <button className="primary small" onClick={() => void runLiveBasketScan("manual")} disabled={isLiveBasketScanning}>{isLiveBasketScanning ? "Scanning..." : "Scan Live Watchlist Now"}</button>
              <button className="secondary small" onClick={saveActionableLiveCandidates} disabled={!liveCandidates.some((r) => r.actionable)}>Save actionable to research journal</button>
              <button className="secondary small" onClick={() => void checkCloudStatus()} disabled={isCheckingCloud}>{isCheckingCloud ? "Checking cloud..." : "Check cloud DB"}</button>
              <button className="secondary small" onClick={() => void saveLiveScanToCloud()} disabled={!liveCandidates.length || isSavingCloudScan}>{isSavingCloudScan ? "Saving cloud..." : "Save scan to cloud DB"}</button>
            </div>
            <div className="cloud-status-grid">
              <div className={`pill-card ${cloudHealth?.configured ? "good" : "warn"}`}>
                <span>Cloud DB</span>
                <strong>{cloudHealth ? (cloudHealth.configured ? "Configured" : "Not configured") : "Not checked"}</strong>
                <small>{cloudHealth?.urlHost || cloudHealth?.message || "Add Supabase env vars, then check status."}</small>
              </div>
              <div className="pill-card">
                <span>Recent saved scans</span>
                <strong>{cloudRuns.length}</strong>
                <small>{cloudRuns[0] ? `${cloudRuns[0].actionable_count || 0} actionable · ${formatDateTime(cloudRuns[0].created_at)}` : "No cloud scans loaded yet."}</small>
              </div>
            </div>
            {cloudRuns.length ? (
              <div className="table-wrap compact mini-cloud-table">
                <table>
                  <thead><tr><th>Saved</th><th>Universe</th><th>TF</th><th>Signals</th><th>Actionable</th></tr></thead>
                  <tbody>{cloudRuns.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDateTime(r.created_at)}</td>
                      <td>{r.universe_label || "—"}</td>
                      <td>{r.timeframe || "—"}</td>
                      <td>{r.candidates_count ?? 0}</td>
                      <td>{r.actionable_count ?? 0}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : null}
            {liveCandidates.length ? (
              <div className="table-wrap compact">
                <table>
                  <thead><tr><th>Symbol</th><th>Score</th><th>Bias</th><th>Setup</th><th>State</th><th>R/R</th><th>Stale</th><th>Status</th></tr></thead>
                  <tbody>{liveCandidates.slice(0, 20).map((r) => (
                    <tr key={r.symbol}>
                      <td>{r.symbol}</td>
                      <td>{r.score}</td>
                      <td>{r.bias}</td>
                      <td>{r.setup}</td>
                      <td>{r.state}</td>
                      <td>{Math.round(r.rr * 100) / 100}</td>
                      <td>{r.staleMinutes === 999999 ? "—" : `${r.staleMinutes}m`}</td>
                      <td>{r.actionable ? "Watch / paper" : r.warnings[0] || "Skip"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : null}
            <p className="muted tiny">v9.3 Research Lab can save simulated scan results for review. Cloud execution remains controlled only from Admin.</p>
          </div>
          {researchMode && basketCandidateSummary ? <CachedCandidateSetCard summary={basketCandidateSummary} /> : null}
          {researchMode && modelComparisons.length ? <ModelComparisonTable rows={modelComparisons} /> : null}
          {researchMode && basketPolicyComparisons.length ? <AccountPolicyComparisonTable rows={basketPolicyComparisons} selectedPolicy={basketAccountPolicy} /> : null}
          {researchMode && basketBatchRows.length ? <AccountBatchComparisonTable rows={basketBatchRows} /> : null}
          {researchMode && basketRiskSweep.length ? <RiskSweepTable rows={basketRiskSweep} selectedPolicyLabel={ACCOUNT_POLICY_LABELS[basketAccountPolicy]} /> : null}
          {basketPortfolio ? <BasketPortfolioPanel summary={basketPortfolio} rows={basketResults} researchMode={researchMode} /> : null}
          {researchMode && basketResults.length ? <BasketResultsTable rows={basketResults} /> : null}
        </div>

        {researchMode && backtest ? (
          <div className="backtest-results">
            <h3>Backtest Data Window</h3>
            <div className="mini-grid wide">
              <StatCard label="Requested start" value={backtest.dataWindow.requestedStart ? formatDateTime(backtest.dataWindow.requestedStart) : "—"} />
              <StatCard label="Requested end" value={backtest.dataWindow.requestedEnd ? formatDateTime(backtest.dataWindow.requestedEnd) : "—"} />
              <StatCard label="Loaded first candle" value={backtest.dataWindow.firstCandle ? formatDateTime(backtest.dataWindow.firstCandle) : "—"} />
              <StatCard label="Loaded last candle" value={backtest.dataWindow.lastCandle ? formatDateTime(backtest.dataWindow.lastCandle) : "—"} />
              <StatCard label="Candles loaded" value={backtest.dataWindow.candleCount} />
              <StatCard label="Loaded days" value={backtest.dataWindow.loadedDays} />
              {btDataSource === "Alpaca" ? <StatCard label="Alpaca adjustment" value={alpacaAdjustment} /> : null}
            </div>
            {backtest.dataWindow.warning ? <div className="warning-box">{backtest.dataWindow.warning}</div> : null}
            {btDataSource === "Alpaca" && alpacaAdjustment === "raw" ? <div className="warning-box">Raw Alpaca candles are not split-adjusted. Multi-year tests on split-heavy names like NVDA, TSLA, and AAPL can make buy-and-hold and indicators look wrong.</div> : null}

            <h3>Portfolio Simulation</h3>
            <div className="mini-grid wide">
              <StatCard label="Starting account" value={`$${backtest.portfolio.startingBalance.toLocaleString()}`} />
              <StatCard label="Strategy ending" value={`$${backtest.portfolio.endingBalance.toLocaleString()}`} helper={`${backtest.portfolio.returnPct}%`} />
              <StatCard label="Strategy net" value={`$${backtest.portfolio.netProfit.toLocaleString()}`} helper={backtest.portfolio.riskLabel} />
              <StatCard label="Buy & hold ending" value={`$${backtest.portfolio.buyHoldEndingBalance.toLocaleString()}`} helper={`${backtest.portfolio.buyHoldReturnPct}%`} />
              <StatCard label="Strategy vs hold" value={`$${backtest.portfolio.strategyVsBuyHold.toLocaleString()}`} />
              <StatCard label="Strategy max DD" value={`$${backtest.portfolio.maxDrawdownDollars.toLocaleString()}`} helper={`${backtest.portfolio.maxDrawdownPct}%`} />
              <StatCard label="Buy/hold max DD" value={`$${backtest.portfolio.buyHoldMaxDrawdownDollars.toLocaleString()}`} helper={`${backtest.portfolio.buyHoldMaxDrawdownPct}%`} />
            </div>
            <h3>Portfolio Equity Curve</h3>
            <div className="grid two equity-grid">
              <EquityCurve points={backtest.portfolio.equityPoints} label="Theoretical risk-sized strategy account value" />
              <EquityCurve points={backtest.portfolio.buyHoldEquityPoints} label="Buy-and-hold account value" />
            </div>

            <h3>Realistic Account Simulation</h3>
            <p className="muted small">This mode checks whether the account can actually afford each position size. It skips trades that exceed buying power, max position size, whole-share limits, or short restrictions.</p>
            <div className="mini-grid wide">
              <StatCard label="Realistic ending" value={`$${backtest.realisticPortfolio.endingCash.toLocaleString()}`} helper={`${backtest.realisticPortfolio.returnPct}%`} />
              <StatCard label="Realistic net" value={`$${backtest.realisticPortfolio.netProfit.toLocaleString()}`} />
              <StatCard label="Realistic max DD" value={`$${backtest.realisticPortfolio.maxDrawdownDollars.toLocaleString()}`} helper={`${backtest.realisticPortfolio.maxDrawdownPct}%`} />
              <StatCard label="Accepted trades" value={backtest.realisticPortfolio.acceptedTrades} />
              <StatCard label="Skipped buying power" value={backtest.realisticPortfolio.skippedBuyingPower} />
              <StatCard label="Skipped no shorts" value={backtest.realisticPortfolio.skippedNoShorts} />
              <StatCard label="Skipped whole-share" value={backtest.realisticPortfolio.skippedWholeShare} />
              <StatCard label="Avg cash used" value={`${backtest.realisticPortfolio.avgCashUsedPct}%`} />
              <StatCard label="Max cash used" value={`${backtest.realisticPortfolio.maxCashUsedPct}%`} />
              <StatCard label="Account rules" value={backtest.realisticPortfolio.accountType} helper={`${backtest.realisticPortfolio.allowFractionalShares ? "fractional" : "whole shares"}, shorts ${backtest.realisticPortfolio.allowShorts ? "allowed" : "blocked"}`} />
            </div>
            <EquityCurve points={backtest.realisticPortfolio.equityPoints} label="Realistic account equity curve" />

            <h3>Risk Comparison</h3>
            <div className="table-wrap compact">
              <table>
                <thead><tr><th>Risk/trade</th><th>Ending</th><th>Net</th><th>Return</th><th>Max DD $</th><th>Max DD %</th></tr></thead>
                <tbody>{backtest.riskComparisons.map((r) => (
                  <tr key={r.riskPercent}>
                    <td>{r.riskPercent}%</td>
                    <td>${r.endingBalance.toLocaleString()}</td>
                    <td>${r.netProfit.toLocaleString()}</td>
                    <td>{r.returnPct}%</td>
                    <td>${r.maxDrawdownDollars.toLocaleString()}</td>
                    <td>{r.maxDrawdownPct}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <h3>Position Exposure / Stacking</h3>
            <div className="mini-grid wide">
              <StatCard label="Max simultaneous trades" value={backtest.exposure.maxSimultaneousTrades} helper="Largest number open at once" />
              <StatCard label="Avg simultaneous trades" value={backtest.exposure.avgSimultaneousTrades} />
              <StatCard label="Max planned open risk" value={`${backtest.exposure.maxPlannedOpenRiskPct}%`} helper="Risk % if all open stops hit" />
              <StatCard label="Avg planned open risk" value={`${backtest.exposure.avgPlannedOpenRiskPct}%`} />
              <StatCard label="Skipped by max trades" value={backtest.exposure.skippedByMaxOpenTrades} />
              <StatCard label="Skipped by max risk" value={backtest.exposure.skippedByMaxTotalRisk} />
            </div>
            <p className="muted small">Cooldown spreads entries out, but these stats show how much SPY risk was actually stacked during the test.</p>

            <h3>Consistency / Risk Quality</h3>
            <div className="mini-grid wide">
              <StatCard label="Consistency score" value={`${backtest.consistency.score}/100`} helper="Rewards smooth recent performance and lower drawdown" />
              <StatCard label="Profitable months" value={`${backtest.consistency.profitableMonths}/${backtest.consistency.totalMonths}`} helper={`${backtest.consistency.positiveMonthRate}%`} />
              <StatCard label="Worst month R" value={`${backtest.consistency.worstMonthR}R`} />
              <StatCard label="Best month R" value={`${backtest.consistency.bestMonthR}R`} />
              <StatCard label="Recent 3-month R" value={`${backtest.consistency.recentThreeMonthR}R`} />
              <StatCard label="R / max DD" value={backtest.consistency.rOverDrawdown === 999 ? "∞" : backtest.consistency.rOverDrawdown} />
            </div>
            <div className="insight-box"><ul>{backtest.consistency.notes.map((note) => <li key={note}>{note}</li>)}</ul></div>
            <h3>Consistency Curve</h3>
            <p className="muted small">This compares the actual R curve to an ideal straight-line R curve, then scores rolling 30-trade smoothness.</p>
            <ConsistencyCurveChart points={backtest.consistencyCurve} />

            <h3>R-Multiple Results</h3>
            <div className="mini-grid wide">
              <StatCard label="Trades" value={backtest.totalTrades} />
              <StatCard label="Wins" value={backtest.wins} />
              <StatCard label="Losses" value={backtest.losses} />
              <StatCard label="Win rate" value={`${backtest.winRate}%`} helper="wins / wins+losses" />
              <StatCard label="Avg R" value={backtest.avgR} />
              <StatCard label="Cumulative R" value={backtest.cumulativeR} />
              <StatCard label="Profit factor" value={backtest.profitFactor === 999 ? "∞" : backtest.profitFactor} />
              <StatCard label="Max DD" value={`${backtest.maxDrawdownR}R`} />
              <StatCard label="Positive/Negative R" value={`${backtest.positiveR}/${backtest.negativeR}`} />
              <StatCard label="Ambig/Timeout" value={`${backtest.ambiguous}/${backtest.timeouts}`} />
            </div>
            <h3>Validation / Trade Quality</h3>
            {(() => {
              const streak = streakStats(backtest.trades);
              const recovery = recoveryStats(backtest.equityCurvePoints);
              return (
                <div className="mini-grid wide">
                  <StatCard label="Longest loss streak" value={streak.longestLossStreak} />
                  <StatCard label="Worst loss streak R" value={`${streak.worstConsecutiveLossR}R`} />
                  <StatCard label="Longest win streak" value={streak.longestWinStreak} />
                  <StatCard label="Avg win / avg loss" value={`${streak.avgWin}R / ${streak.avgLoss}R`} />
                  <StatCard label="Largest win" value={`${streak.largestWin}R`} />
                  <StatCard label="Largest loss" value={`${streak.largestLoss}R`} />
                  <StatCard label="Longest DD recovery" value={`${recovery.maxRecoveryDays} days`} />
                  <StatCard label="Current DD recovery" value={recovery.unrecovered ? `${recovery.currentRecoveryDays} days open` : "Recovered"} />
                </div>
              );
            })()}
            <h3>R Equity Curve</h3>
            <EquityCurve points={backtest.equityCurvePoints} label="Cumulative R over loaded date window" />
            <h3>Backtest Score Ranges</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Range</th><th>Trades</th><th>Wins</th><th>Losses</th><th>Timeouts</th><th>Positive R</th><th>Negative R</th><th>Win Rate</th><th>Avg R</th><th>Cum R</th></tr></thead>
                <tbody>{backtest.scoreRanges.map((r) => (
                  <tr key={r.label}><td>{r.label}</td><td>{r.trades}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.timeouts}</td><td>{r.positiveR}</td><td>{r.negativeR}</td><td>{r.winRate}%</td><td>{r.avgR}</td><td>{r.cumulativeR}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <h3>Diagnostic Dashboard</h3>
            <DiagnosticTips backtest={backtest} />
            <div className="grid two diagnostic-grid">
              <BreakdownTable title="Direction" rows={backtest.diagnostics.byDirection} />
              <BreakdownTable title="Session" rows={backtest.diagnostics.bySession} />
              <BreakdownTable title="Setup Type" rows={backtest.diagnostics.bySetupType} />
              <BreakdownTable title="Market Regime" rows={backtest.diagnostics.byRegime} />
              <BreakdownTable title="Regime + Direction" rows={backtest.diagnostics.byRegimeDirection} />
              <BreakdownTable title="Year" rows={backtest.diagnostics.byYear} />
            </div>
            <BreakdownTable title="Month-by-month" rows={backtest.diagnostics.byMonth} limit={24} />
            <div className="grid two">
              <div>
                <h3>Best 20 Trades</h3>
                <TradeTable trades={[...backtest.trades].sort((a, b) => (b.resultR ?? 0) - (a.resultR ?? 0)).slice(0, 20)} />
              </div>
              <div>
                <h3>Worst 20 Trades</h3>
                <TradeTable trades={[...backtest.trades].sort((a, b) => (a.resultR ?? 0) - (b.resultR ?? 0)).slice(0, 20)} />
              </div>
            </div>
            <h3>Backtest Trades</h3>
            <TradeTable trades={backtest.trades.slice(0, 100)} />
          </div>
        ) : null}
      </section>

      {researchMode ? <section className="panel">
        <h2>7. Research Journal</h2>
        <div className="mini-grid wide">
          <StatCard label="Open" value={journalStats.open} />
          <StatCard label="Wins" value={journalStats.wins} />
          <StatCard label="Losses" value={journalStats.losses} />
          <StatCard label="Ambiguous" value={journalStats.ambiguous} />
          <StatCard label="Win rate" value={`${journalStats.winRate}%`} />
          <StatCard label="Cumulative R" value={journalStats.cumulativeR} />
        </div>
        <h3>Journal Score Ranges</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Range</th><th>Trades</th><th>Wins</th><th>Losses</th><th>Timeouts</th><th>Positive R</th><th>Negative R</th><th>Win Rate</th><th>Avg R</th><th>Cum R</th></tr></thead>
            <tbody>{journalRanges.map((r) => (
              <tr key={r.label}><td>{r.label}</td><td>{r.trades}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.timeouts}</td><td>{r.positiveR}</td><td>{r.negativeR}</td><td>{r.winRate}%</td><td>{r.avgR}</td><td>{r.cumulativeR}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="actions">
          <button className="danger" onClick={() => { if (confirm("Clear the local journal?")) setJournal([]); }}>Clear Journal</button>
        </div>
        <TradeTable trades={journal} />
      </section> : null}
    </main>
  );
}


function bestGroup(rows: DiagnosticGroupStats[]) {
  return rows.filter((r) => r.trades > 0).sort((a, b) => b.cumulativeR - a.cumulativeR)[0];
}

function worstGroup(rows: DiagnosticGroupStats[]) {
  return rows.filter((r) => r.trades > 0).sort((a, b) => a.cumulativeR - b.cumulativeR)[0];
}

function classifySymbolPersonality(summary: BacktestSummary) {
  const holdReturn = summary.portfolio.buyHoldReturnPct;
  const bull = summary.diagnostics.byRegime.find((r) => r.label === "Bull");
  const bear = summary.diagnostics.byRegime.find((r) => r.label === "Bear");
  const neutral = summary.diagnostics.byRegime.find((r) => r.label === "Neutral");
  if (holdReturn > 250) return "Explosive leader";
  if (holdReturn > 50 && (bull?.cumulativeR || 0) > 0) return "Leader / uptrend";
  if (holdReturn < -25 && (bear?.trades || 0) > 0) return "Weak / laggard";
  if ((neutral?.cumulativeR || 0) < -10) return "Choppy / neutral risk";
  if (summary.cumulativeR > 0 && summary.profitFactor >= 1.2) return "Tradable normal";
  return "Unclear / avoid";
}

function basketDiagnosis(summary: BacktestSummary, personality: string) {
  const long = summary.diagnostics.byDirection.find((r) => r.label === "Long");
  const short = summary.diagnostics.byDirection.find((r) => r.label === "Short");
  const neutral = summary.diagnostics.byRegime.find((r) => r.label === "Neutral");
  const bear = summary.diagnostics.byRegime.find((r) => r.label === "Bear");
  const beatsHold = summary.portfolio.strategyVsBuyHold > 0;
  const shortR = short?.cumulativeR || 0;
  const longR = long?.cumulativeR || 0;
  if (summary.cumulativeR <= 0) return { issue: "Negative/flat edge", suggestion: "Cash more often; raise score floor or block weakest regime." };
  if (personality.includes("leader") && shortR < -3) return { issue: "Short side drag", suggestion: "v3.7 should avoid leader shorts; if still bad, disable all shorts for this personality." };
  if (!beatsHold && personality.includes("leader")) return { issue: "Profitable but missed leader upside", suggestion: "Use leader expansion or compare buy/hold overlay; fixed targets may cap monster trends." };
  if ((neutral?.cumulativeR || 0) < -5) return { issue: "Neutral/chop losses", suggestion: "Keep neutral cash unless score is 90+ and pullback quality is strong." };
  if ((bear?.cumulativeR || 0) < -5 && shortR <= 0) return { issue: "Bear regime weakness", suggestion: "Use cash in bear unless short pullback/reject is clearly positive." };
  if (longR < -5 && personality.includes("Weak")) return { issue: "Laggard long drag", suggestion: "Weak stocks should mostly use shorts or cash, not continuation longs." };
  if (summary.consistency.score < 60) return { issue: "Low consistency", suggestion: "Check worst year/month and reduce trade frequency." };
  return { issue: "Healthy", suggestion: "Forward-test; compare 0.5% and 1% risk." };
}

function DiagnosticTips({ backtest }: { backtest: BacktestSummary }) {
  const bestDirection = bestGroup(backtest.diagnostics.byDirection);
  const bestSession = bestGroup(backtest.diagnostics.bySession);
  const bestYear = bestGroup(backtest.diagnostics.byYear);
  const bestRegime = bestGroup(backtest.diagnostics.byRegime);
  const bestRegimeDirection = bestGroup(backtest.diagnostics.byRegimeDirection);
  const timeoutRate = backtest.totalTrades ? Math.round((backtest.timeouts / backtest.totalTrades) * 100) : 0;
  const notes: string[] = [];
  if (bestDirection) notes.push(`Best direction: ${bestDirection.label} (${bestDirection.cumulativeR}R, ${bestDirection.trades} trades). Try filtering to that direction and rerun.`);
  if (bestSession) notes.push(`Best session: ${bestSession.label} (${bestSession.cumulativeR}R). Try filtering to that time window.`);
  if (bestYear) notes.push(`Best year: ${bestYear.label} (${bestYear.cumulativeR}R). Compare this with weaker years before trusting the setup.`);
  if (bestRegime) notes.push(`Best regime: ${bestRegime.label} (${bestRegime.cumulativeR}R). Test a regime filter to avoid weaker regimes.`);
  if (bestRegimeDirection) notes.push(`Best regime/direction: ${bestRegimeDirection.label} (${bestRegimeDirection.cumulativeR}R). This can guide long-only, short-only, or cash-mode rules.`);
  if (timeoutRate > 55) notes.push(`Timeout rate is high at ${timeoutRate}%. The setup may not move fast enough; test a lower target, longer max hold, or stricter volume filter.`);
  if (backtest.maxDrawdownR > Math.max(10, Math.abs(backtest.cumulativeR) * 0.35)) notes.push(`Drawdown is large (${backtest.maxDrawdownR}R). Keep testing; a smooth full-period curve can still hide ugly recent drawdowns.`);
  if (!notes.length) notes.push("No obvious issue found. Check month/year stability and then forward-test before trusting it.");
  return <div className="insight-box"><ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul></div>;
}

function BreakdownTable({ title, rows, limit }: { title: string; rows: DiagnosticGroupStats[]; limit?: number }) {
  const shown = typeof limit === "number" ? rows.slice(-limit) : rows;
  return (
    <div className="breakdown-card">
      <h4>{title}</h4>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Group</th><th>Trades</th><th>W/L/T</th><th>Pos/Neg</th><th>Win%</th><th>Avg R</th><th>Cum R</th><th>PF</th><th>DD</th></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={`${title}-${r.label}`}>
              <td>{r.label}</td>
              <td>{r.trades}</td>
              <td>{r.wins}/{r.losses}/{r.timeouts}</td>
              <td>{r.positiveR}/{r.negativeR}</td>
              <td>{r.winRate}%</td>
              <td>{r.avgR}</td>
              <td>{r.cumulativeR}</td>
              <td>{r.profitFactor === 999 ? "∞" : r.profitFactor}</td>
              <td>{r.maxDrawdownR}R</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function ModelComparisonTable({ rows }: { rows: ModelComparisonResult[] }) {
  if (!rows.length) return null;
  const best = rows.slice().sort((a, b) => b.totalR - a.totalR)[0];
  return (
    <div className="basket-results">
      <h4>Model A/B Comparison</h4>
      <p className="muted small">Runs the same basket and date window through several engines using the same base risk/session/target settings. This helps avoid guessing whether a new version is actually better.</p>
      <div className="mini-grid wide">
        <StatCard label="Best by total R" value={best ? best.model : "—"} helper={best ? `${best.totalR}R` : undefined} />
        <StatCard label="Models tested" value={rows.length} />
      </div>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Model</th><th>Positive</th><th>Beat hold</th><th>Total R</th><th>Avg PF</th><th>Avg consistency</th><th>Long R</th><th>Short R</th><th>Best symbol</th><th>Worst symbol</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.model}>
              <td>{r.model}</td>
              <td>{r.positiveSymbols}/{r.symbolsTested}</td>
              <td>{r.beatHoldSymbols}/{r.symbolsTested}</td>
              <td>{r.totalR}R</td>
              <td>{r.avgPf}</td>
              <td>{r.avgConsistency}/100</td>
              <td>{r.totalLongR}R</td>
              <td>{r.totalShortR}R</td>
              <td>{r.bestSymbol}</td>
              <td>{r.worstSymbol}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}


function universalShareText(summary: BasketPortfolioSummary, rows: BasketResult[]) {
  const positiveSymbols = rows.filter((r) => r.cumulativeR > 0).length;
  const beatHold = rows.filter((r) => r.strategyVsHold > 0).length;
  const totalR = Math.round(rows.reduce((sum, r) => sum + r.cumulativeR, 0) * 100) / 100;
  const worst = rows.slice().sort((a, b) => a.cumulativeR - b.cumulativeR)[0];
  const best = rows.slice().sort((a, b) => b.cumulativeR - a.cumulativeR)[0];
  const sleeve15 = buildLeaderSleeveRows(summary, rows).find((r) => r.sleevePct === 25);
  return [
    "REALISTIC UNIVERSAL ACCOUNT RESULTS",
    `Account policy: ${summary.accountPolicyLabel}`,
    `Starting account: $${summary.startingBalance.toLocaleString()}`,
    `Ending account: $${summary.endingBalance.toLocaleString()} (${summary.returnPct}%)`,
    `Net: $${summary.netProfit.toLocaleString()}`,
    `Max drawdown: $${summary.maxDrawdownDollars.toLocaleString()} (${summary.maxDrawdownPct}%)`,
    `Buy/hold equal-weight ending: $${summary.buyHoldEndingBalance.toLocaleString()}`,
    `Strategy vs equal-weight hold: $${summary.strategyVsBuyHold.toLocaleString()}`,
    ...(sleeve15 ? [`25% dynamic rotating leader sleeve: $${sleeve15.endingBalance.toLocaleString()} | vs hold $${sleeve15.strategyVsHold.toLocaleString()} | hold capture ${sleeve15.holdCapturePct}%`] : []),
    `Accepted trades: ${summary.acceptedTrades} (${summary.longTrades} long / ${summary.shortTrades} short)`,
    `Skipped: ${summary.skippedTrades} total | buying power ${summary.skippedBuyingPower} | low quality ${summary.skippedLowQuality} | rolling quality ${summary.skippedRollingQuality} | state cap ${summary.skippedStateCap} | state-cap bypasses ${summary.stateCapBypasses} | no shorts ${summary.skippedNoShorts} | max open ${summary.skippedMaxOpen} | max risk ${summary.skippedMaxRisk}`,
    `PF: ${summary.profitFactor === 999 ? "∞" : summary.profitFactor} | Win rate: ${summary.winRate}% | Return/DD: ${summary.returnToDrawdown} | Avg trade P/L: $${summary.avgTradePnl.toLocaleString()}`,
    `Accepted R: ${summary.totalR}R | R curve consistency: ${summary.rCurveConsistency}/100 | Latest 30-trade avg R: ${summary.rollingAvgR30}R | Latest 50-trade PF: ${summary.rollingProfitFactor50 === 999 ? "∞" : summary.rollingProfitFactor50}`,
    ...(summary.latest100TradeAudit ? [`Latest 100-trade sim: ${summary.latest100TradeAudit.totalR}R | PF ${summary.latest100TradeAudit.profitFactor === 999 ? "∞" : summary.latest100TradeAudit.profitFactor} | win ${summary.latest100TradeAudit.winRate}% | max DD ${summary.latest100TradeAudit.maxDrawdownR}R | ${summary.latest100TradeAudit.note}`] : []),
    ...(summary.worst100TradeAudit ? [`Worst rolling 100-trade sim: ${summary.worst100TradeAudit.totalR}R | PF ${summary.worst100TradeAudit.profitFactor === 999 ? "∞" : summary.worst100TradeAudit.profitFactor} | win ${summary.worst100TradeAudit.winRate}% | max DD ${summary.worst100TradeAudit.maxDrawdownR}R | ${summary.worst100TradeAudit.note}`] : []),
    `Profit concentration: top 10 winners ${summary.top10ProfitPct}% of gross profit | top 25 winners ${summary.top25ProfitPct}% | best symbol ${summary.bestSymbolProfitPct}% of net`,
    `Symbols positive: ${positiveSymbols}/${rows.length} | Beat buy/hold individually: ${beatHold}/${rows.length} | Total theoretical R: ${totalR}R`,
    `Best symbol: ${best ? `${best.symbol} ${best.cumulativeR}R` : "—"}`,
    `Worst symbol: ${worst ? `${worst.symbol} ${worst.cumulativeR}R` : "—"}`,
    `Sizing diagnostics: target risk ${summary.riskPercent}% | avg actual risk ${summary.avgActualRiskPct}% | target-risk hit rate ${summary.targetRiskHitPct}% | position-cap limited ${summary.positionCapLimitedTrades} trades`,
    `Account rules: ${summary.accountType}, ${summary.allowFractionalShares ? "fractional shares" : "whole shares"}, shorts ${summary.allowShorts ? "allowed" : "blocked"}, max position ${summary.maxPositionPct}%`,
  ].join("\n");
}

function UniversalGroupTable({ title, rows }: { title: string; rows: UniversalGroupStats[] }) {
  const shown = rows.filter((r) => r.trades > 0).slice(0, 12);
  if (!shown.length) return null;
  return (
    <div className="breakdown-card">
      <h4>{title}</h4>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Group</th><th>Trades</th><th>W/L/T</th><th>Win%</th><th>P/L</th><th>Avg $</th><th>Cum R</th><th>Avg R</th></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={`${title}-${r.label}`}>
              <td>{r.label}</td>
              <td>{r.trades}</td>
              <td>{r.wins}/{r.losses}/{r.timeouts}</td>
              <td>{r.winRate}%</td>
              <td>${r.pnl.toLocaleString()}</td>
              <td>${r.avgPnl.toLocaleString()}</td>
              <td>{r.cumulativeR}R</td>
              <td>{r.avgR}R</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function CachedCandidateSetCard({ summary }: { summary: CachedBasketReplaySummary }) {
  return (
    <div className="breakdown-card full-width">
      <h4>Cached candidate set</h4>
      <p className="muted tiny">This is the slow candle scan that account settings can replay without refetching candles or rebuilding setup candidates.</p>
      <div className="mini-grid wide">
        <StatCard label="Universe / window" value={summary.label} />
        <StatCard label="Symbols" value={summary.symbolCount} />
        <StatCard label="Trade candidates" value={summary.candidateCount.toLocaleString()} />
        <StatCard label="Cached at" value={formatDateTime(summary.createdAt)} />
      </div>
    </div>
  );
}

function AccountBatchComparisonTable({ rows }: { rows: AccountBatchRow[] }) {
  if (!rows.length) return null;
  const bestEnding = rows.slice().sort((a, b) => b.endingBalance - a.endingBalance)[0];
  const bestReturnDd = rows.slice().sort((a, b) => b.returnToDrawdown - a.returnToDrawdown || b.endingBalance - a.endingBalance)[0];
  return (
    <div className="breakdown-card full-width">
      <h4>Batch account settings replay</h4>
      <p className="muted tiny">Same candidate set, replayed across account settings. This is the speed mode: use it to test exposure, slots, risk, and max-position changes without waiting for another full basket scan.</p>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Config</th><th>Policy</th><th>Active ending</th><th>25% dynamic sleeve</th><th>25% sim vs hold</th><th>Active vs hold</th><th>Max DD</th><th>Return/DD</th><th>PF</th><th>Trades</th><th>Accepted R</th><th>Avg cash used</th><th>Max-open skips</th><th>State-cap skips</th><th>Bypasses</th><th>Target hit</th><th>Pos-cap limited</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={`${r.label}-${r.accountPolicy}`} className={r.selected ? "selected-row" : undefined}>
              <td>{r.label}{r.selected ? " (current)" : ""}{bestEnding?.label === r.label ? " $★" : ""}{bestReturnDd?.label === r.label ? " R/DD★" : ""}</td>
              <td>{ACCOUNT_POLICY_LABELS[r.accountPolicy]}</td>
              <td>${r.endingBalance.toLocaleString()}</td>
              <td>${r.sleeve15Ending.toLocaleString()}</td>
              <td>${r.sleeve15VsHold.toLocaleString()}</td>
              <td>${r.strategyVsBuyHold.toLocaleString()}</td>
              <td>{r.maxDrawdownPct}%</td>
              <td>{r.returnToDrawdown}</td>
              <td>{r.profitFactor === 999 ? "∞" : r.profitFactor}</td>
              <td>{r.acceptedTrades}</td>
              <td>{r.totalR}R</td>
              <td>{r.avgCashUsedPct}%</td>
              <td>{r.skippedMaxOpen}</td>
              <td>{r.skippedStateCap}</td>
              <td>{r.stateCapBypasses}</td>
              <td>{r.targetRiskHitPct}%</td>
              <td>{r.positionCapLimitedTrades}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="muted tiny mt-12">$★ marks best active-only ending balance. R/DD★ marks best active-only return-to-drawdown. The 25% dynamic sleeve columns are the super-wide benchmark; the active-only columns remain the control.</p>
    </div>
  );
}

function BasketQualityDiagnostic({ rows }: { rows: UniversalGroupStats[] }) {
  const shown = rows.filter((r) => r.trades > 0).slice().sort((a, b) => a.avgR - b.avgR || a.pnl - b.pnl);
  if (!shown.length) return null;
  const totalNet = rows.reduce((sum, r) => sum + r.pnl, 0);
  const flagFor = (r: UniversalGroupStats) => {
    if (r.pnl < 0 || r.cumulativeR < 0 || r.avgR < 0.05) return "Review/remove";
    if (r.avgR < 0.15 || r.winRate < 34) return "Watch";
    if (r.avgR >= 0.25 && r.winRate >= 38) return "Core helper";
    return "Useful";
  };
  const helperText = shown.some((r) => flagFor(r) === "Review/remove")
    ? "Symbols flagged Review/remove are not automatically deleted; they tell you which names need stricter filtering or separate rules before expanding the universe."
    : "No accepted symbol is negative, so use the Watch rows to find weak contributors before adding more names.";

  return (
    <div className="breakdown-card full-width">
      <h4>Basket quality diagnostic</h4>
      <p className="muted tiny">v7.2 keeps the symbol-quality gate and wide-universe slot ranking. For wide 100/500 benchmarks, active-only is the default; sleeve diagnostics stay in Research View. This table helps show whether extra symbols are adding real edge or just more low-quality trades.</p>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Symbol</th><th>Flag</th><th>Trades</th><th>Win%</th><th>P/L</th><th>Net contribution</th><th>Cum R</th><th>Avg R</th></tr></thead>
          <tbody>{shown.map((r) => {
            const flag = flagFor(r);
            const contribution = totalNet > 0 ? Math.round((r.pnl / totalNet) * 1000) / 10 : 0;
            return (
              <tr key={`quality-${r.label}`} className={flag === "Review/remove" ? "danger-row" : flag === "Watch" ? "watch-row" : undefined}>
                <td>{r.label}</td>
                <td>{flag}</td>
                <td>{r.trades}</td>
                <td>{r.winRate}%</td>
                <td>${r.pnl.toLocaleString()}</td>
                <td>{contribution}%</td>
                <td>{r.cumulativeR}R</td>
                <td>{r.avgR}R</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <p className="muted tiny mt-12">{helperText}</p>
    </div>
  );
}

function AccountPolicyComparisonTable({ rows, selectedPolicy }: { rows: AccountPolicyComparison[]; selectedPolicy: AccountPolicy }) {
  if (!rows.length) return null;
  const bestEnding = rows.slice().sort((a, b) => b.endingBalance - a.endingBalance)[0];
  return (
    <div className="breakdown-card full-width">
      <h4>Cached Policy Comparison</h4>
      <p className="muted tiny">Same fetched basket trades, replayed through different account-policy rules without reloading candles. v5.5 adds a controlled override that limits simultaneous bypass trades and blocks bypasses for Bull normal / Healthy leader.</p>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Policy</th><th>Ending</th><th>Return</th><th>Max DD</th><th>Return/DD</th><th>PF</th><th>Trades</th><th>Accepted R</th><th>R Consistency</th><th>State-cap skips</th><th>Max-open skips</th><th>Bypasses</th><th>Bull normal P/L</th><th>Healthy leader P/L</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.policy} className={r.policy === selectedPolicy ? "selected-row" : undefined}>
              <td>{r.label}{r.policy === selectedPolicy ? " (selected)" : ""}{bestEnding?.policy === r.policy ? " ★" : ""}</td>
              <td>${r.endingBalance.toLocaleString()}</td>
              <td>{r.returnPct}%</td>
              <td>{r.maxDrawdownPct}%</td>
              <td>{r.returnToDrawdown}</td>
              <td>{r.profitFactor === 999 ? "∞" : r.profitFactor}</td>
              <td>{r.acceptedTrades}</td>
              <td>{r.totalR}R</td>
              <td>{r.rCurveConsistency}/100</td>
              <td>{r.skippedStateCap}</td>
              <td>{r.skippedMaxOpen}</td>
              <td>{r.stateCapBypasses}</td>
              <td>${r.bullNormalPnl.toLocaleString()}</td>
              <td>${r.healthyLeaderPnl.toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function RiskSweepTable({ rows, selectedPolicyLabel }: { rows: RiskSweepRow[]; selectedPolicyLabel: string }) {
  if (!rows.length) return null;
  return (
    <div className="breakdown-card full-width">
      <h4>Risk Sweep Diagnostic</h4>
      <p className="muted tiny">Same candidate set and {selectedPolicyLabel} policy. Max total risk is set to risk/trade × max-open slots. This is diagnostic only; it helps decide whether higher risk improves Return/DD or just raises drawdown.</p>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Risk/trade</th><th>Max total risk</th><th>Ending</th><th>Return</th><th>Max DD</th><th>Return/DD</th><th>PF</th><th>Trades</th><th>Accepted R</th><th>Avg actual risk</th><th>Position-cap limited</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.riskPercent}>
              <td>{r.riskPercent}%</td>
              <td>{r.maxTotalRiskPct}%</td>
              <td>${r.endingBalance.toLocaleString()}</td>
              <td>{r.returnPct}%</td>
              <td>{r.maxDrawdownPct}%</td>
              <td>{r.returnToDrawdown}</td>
              <td>{r.profitFactor === 999 ? "∞" : r.profitFactor}</td>
              <td>{r.acceptedTrades}</td>
              <td>{r.totalR}R</td>
              <td>{r.avgActualRiskPct}%</td>
              <td>{r.positionCapLimitedTrades}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function leaderSleeveRiskTier(sleevePct: number): string {
  if (sleevePct <= 10) return "Conservative";
  if (sleevePct <= 25) return "Aggressive";
  if (sleevePct <= 50) return "High concentration";
  return "Extreme / research only";
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function leaderTrendCaptureRate(row: BasketResult): number {
  // v6.2: Estimate what a realistic trend sleeve might capture after trend breaks,
  // trailing exits, and imperfect rebalance timing. This is intentionally below
  // raw buy/hold for most symbols, but higher for true explosive leaders.
  let capture = 0.62;
  if (row.personality.includes("Explosive")) capture += 0.16;
  else if (row.personality.includes("Leader")) capture += 0.06;
  if (row.issue.includes("missed leader")) capture += 0.05;
  if (row.profitFactor >= 1.5) capture += 0.05;
  else if (row.profitFactor < 1.2) capture -= 0.06;
  if (row.consistency >= 90) capture += 0.05;
  else if (row.consistency < 60) capture -= 0.07;
  if (row.recentThreeMonthR > 5) capture += 0.03;
  else if (row.recentThreeMonthR < -3) capture -= 0.04;
  if (row.bearTransitionR < 0 || row.failedLeaderR < 0) capture -= 0.03;
  return Math.round(clampNumber(capture, 0.45, 0.88) * 1000) / 10;
}

function leaderSleeveDrawdownProxy(row: BasketResult): number {
  const holdMultiple = row.buyHoldEndingBalance / Math.max(1, row.realisticEnding || 5000);
  let proxy = 16 + Math.min(42, row.maxDrawdownR * 0.7);
  if (row.personality.includes("Explosive")) proxy += 5;
  if (holdMultiple > 6) proxy += 8;
  if (holdMultiple > 12) proxy += 8;
  if (row.consistency < 60) proxy += 6;
  if (row.recentThreeMonthR < -3) proxy += 4;
  return Math.round(clampNumber(proxy, 12, 75) * 100) / 100;
}

function buildLeaderSleeveRows(summary: BasketPortfolioSummary, rows: BasketResult[]): LeaderSleeveRow[] {
  const dynamicSim = summary.leaderSleeveStats;
  const qualityMap = buildSymbolQualityMap(rows);
  const eligible = rows
    .filter((r) => {
      const q = qualityMap[r.symbol];
      const holdMultiple = r.buyHoldEndingBalance / Math.max(1, summary.startingBalance);
      return q?.leaderCandidate && r.buyHoldEndingBalance > summary.startingBalance && r.cumulativeR > 0 && holdMultiple > 1.25;
    })
    .sort((a, b) => (b.buyHoldEndingBalance - b.endingBalance) - (a.buyHoldEndingBalance - a.endingBalance))
    .slice(0, 6);

  const rawAvgHoldMultiple = eligible.length
    ? eligible.reduce((sum, r) => sum + (r.buyHoldEndingBalance / Math.max(1, summary.startingBalance)), 0) / eligible.length
    : 0;

  const fallbackMultiples = eligible.map((r) => {
    const holdMultiple = r.buyHoldEndingBalance / Math.max(1, summary.startingBalance);
    const capture = leaderTrendCaptureRate(r) / 100;
    return 1 + (holdMultiple - 1) * capture;
  });
  const fallbackAvgMultiple = fallbackMultiples.length
    ? fallbackMultiples.reduce((a, b) => a + b, 0) / fallbackMultiples.length
    : 0;
  const sleeveMultiple = dynamicSim?.sleeveMultiple || fallbackAvgMultiple;
  const sleeveDdProxy = dynamicSim?.sleeveMaxDrawdownPct || (eligible.length
    ? Math.round((eligible.reduce((sum, r) => sum + leaderSleeveDrawdownProxy(r), 0) / eligible.length) * 100) / 100
    : 0);
  const capturePct = dynamicSim
    ? Math.round(((dynamicSim.sleeveMultiple - 1) / Math.max(0.00001, (rawAvgHoldMultiple || dynamicSim.sleeveMultiple) - 1)) * 1000) / 10
    : (eligible.length && rawAvgHoldMultiple > 1
      ? Math.round(((fallbackAvgMultiple - 1) / (rawAvgHoldMultiple - 1)) * 1000) / 10
      : 0);

  const sleevePercents = Array.from({ length: 21 }, (_, i) => i * 5);
  const dynamicLeaders = dynamicSim?.leaderUsage?.slice(0, 8).map((x) => `${x.symbol} ${x.pct}%`).join(', ');
  const leadersLabel = dynamicLeaders || eligible.map((r) => r.symbol).join(', ') || '—';
  const rawHoldOverlayMultiple = rawAvgHoldMultiple || sleeveMultiple;

  return sleevePercents.map((sleevePct) => {
    const activeAllocationPct = 100 - sleevePct;
    const activeEnding = summary.endingBalance * (activeAllocationPct / 100);
    const sleeveEnding = summary.startingBalance * (sleevePct / 100) * sleeveMultiple;
    const rawHoldOverlayEnding = summary.endingBalance * (activeAllocationPct / 100) + summary.startingBalance * (sleevePct / 100) * rawHoldOverlayMultiple;
    const endingBalance = Math.round((activeEnding + sleeveEnding) * 100) / 100;
    const combinedPoints = dynamicSim ? combineAllocatedEquityPoints(summary.equityPoints, dynamicSim.sleeveEquityPoints, sleevePct) : [];
    const combinedDd = combinedPoints.length
      ? maxDrawdownFromEquityPoints(combinedPoints).pct
      : Math.round(((summary.maxDrawdownPct * (activeAllocationPct / 100)) + (sleeveDdProxy * (sleevePct / 100))) * 100) / 100;
    const holdCapturePct = summary.buyHoldEndingBalance > summary.startingBalance
      ? Math.round(((endingBalance - summary.startingBalance) / (summary.buyHoldEndingBalance - summary.startingBalance)) * 1000) / 10
      : 0;
    return {
      sleevePct,
      activeAllocationPct,
      endingBalance,
      activeEnding: Math.round(activeEnding * 100) / 100,
      sleeveEnding: Math.round(sleeveEnding * 100) / 100,
      strategyVsHold: Math.round((endingBalance - summary.buyHoldEndingBalance) * 100) / 100,
      holdCapturePct,
      leaderCount: dynamicSim?.leaderUsage?.length || eligible.length,
      leaders: leadersLabel,
      riskTier: leaderSleeveRiskTier(sleevePct),
      capturePct,
      sleeveMaxDrawdownPct: sleeveDdProxy,
      combinedMaxDrawdownPct: combinedDd,
      rawHoldOverlayEnding: Math.round(rawHoldOverlayEnding * 100) / 100,
      dynamic: Boolean(dynamicSim),
    };
  });
}

function LeaderSleeveDiagnostic({ summary, rows }: { summary: BasketPortfolioSummary; rows: BasketResult[] }) {
  const sleeveRows = buildLeaderSleeveRows(summary, rows);
  if (!sleeveRows.some((r) => r.leaderCount > 0)) return null;
  const best = sleeveRows.slice().sort((a, b) => b.endingBalance - a.endingBalance)[0];
  const practical = sleeveRows.find((r) => r.sleevePct === 25) || best;
  const bestSerious = sleeveRows.filter((r) => r.sleevePct <= 25).sort((a, b) => b.endingBalance - a.endingBalance)[0] || best;
  const firstBeatHold = sleeveRows.find((r) => r.strategyVsHold >= 0);
  return (
    <div className="breakdown-card full-width">
      <h4>Dynamic leader sleeve simulation</h4>
      <p className="muted tiny">v7.0 research sleeve audit: rotates using only candles that existed at each rebalance. It ranks current leaders from the full basket, reallocates roughly weekly, and sweeps 0–100% sleeve exposure with combined and sleeve-only drawdown.</p>
      <div className="mini-grid wide">
        <StatCard label="25% dynamic benchmark" value={`$${practical.endingBalance.toLocaleString()}`} helper={`$${practical.strategyVsHold.toLocaleString()} vs hold · ${practical.holdCapturePct}% capture · est DD ${practical.combinedMaxDrawdownPct}%`} />
        <StatCard label="Best 0–100% simulated" value={`$${best.endingBalance.toLocaleString()}`} helper={`${best.sleevePct}% sleeve · ${best.holdCapturePct}% hold capture · ${best.riskTier}`} />
        <StatCard label="Best ≤25% simulated" value={`$${bestSerious.endingBalance.toLocaleString()}`} helper={`${bestSerious.sleevePct}% sleeve · ${bestSerious.holdCapturePct}% hold capture · est DD ${bestSerious.combinedMaxDrawdownPct}%`} />
        <StatCard label="First simulated sleeve to beat hold" value={firstBeatHold ? `${firstBeatHold.sleevePct}%` : "—"} helper={firstBeatHold ? `$${firstBeatHold.strategyVsHold.toLocaleString()} vs hold` : "Did not beat hold in simulated sweep"} />
        <StatCard label="Leader capture haircut" value={`${practical.capturePct}%`} helper={`${practical.leaderCount} leaders · sleeve DD proxy ${practical.sleeveMaxDrawdownPct}%`} />
      </div>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Sleeve</th><th>Active scanner</th><th>Sim sleeve</th><th>Sim ending</th><th>Vs hold</th><th>Hold capture</th><th>Est combined DD</th><th>Sleeve-only DD</th><th>Static hold overlay</th><th>Risk tier</th><th>Dynamic leaders used</th></tr></thead>
          <tbody>{sleeveRows.map((r) => (
            <tr key={`leader-sleeve-${r.sleevePct}`} className={r.sleevePct === best.sleevePct ? "selected-row" : undefined}>
              <td>{r.sleevePct}%{r.sleevePct === 25 ? " super-wide ★" : r.sleevePct === 100 ? " full sleeve" : ""}</td>
              <td>{r.activeAllocationPct}% · ${r.activeEnding.toLocaleString()}</td>
              <td>{r.sleevePct}% · ${r.sleeveEnding.toLocaleString()}</td>
              <td>${r.endingBalance.toLocaleString()}</td>
              <td>${r.strategyVsHold.toLocaleString()}</td>
              <td>{r.holdCapturePct}%</td>
              <td>{r.combinedMaxDrawdownPct}%</td>
              <td>{r.sleeveMaxDrawdownPct}%</td>
              <td>${r.rawHoldOverlayEnding.toLocaleString()}</td>
              <td>{r.riskTier}</td>
              <td>{r.leaders}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {summary.leaderSleeveStats?.rotationLog?.length ? <div className="table-wrap compact mt-12">
        <h4>Recent dynamic sleeve rotations</h4>
        <p className="muted tiny">Past-data-only rebalance log. These leaders changed through time; this is not a fixed list chosen after the fact.</p>
        <table>
          <thead><tr><th>Rebalance</th><th>Leaders held</th><th>Avg score</th></tr></thead>
          <tbody>{summary.leaderSleeveStats.rotationLog.map((r, i) => (
            <tr key={`rotation-${r.time}-${i}`}><td>{formatDateTime(r.time)}</td><td>{r.leaders}</td><td>{r.avgScore}</td></tr>
          ))}</tbody>
        </table>
      </div> : null}
    </div>
  );
}


function RollingQualityGatePanel({ summary }: { summary: BasketPortfolioSummary }) {
  if (!summary.rollingQualityGateAudit.length) return null;
  return (
    <div className="breakdown-card full-width">
      <h4>Rolling active-quality gate audit</h4>
      <p className="muted tiny">Past-data-only filter: a symbol can be paused when its own recently closed scanner trades become weak. This is meant to reduce the bad 100-trade windows without deleting stocks using future knowledge.</p>
      <div className="table-wrap compact">
        <table>
          <thead><tr><th>Symbol</th><th>Skips</th><th>Closed history</th><th>Recent avg R</th><th>Recent PF</th><th>Recent win%</th><th>Recent DD</th><th>Reason</th></tr></thead>
          <tbody>{summary.rollingQualityGateAudit.map((r) => (
            <tr key={`rolling-gate-${r.symbol}`}>
              <td>{r.symbol}</td>
              <td>{r.skips}</td>
              <td>{r.closedTrades}</td>
              <td>{r.lastAvgR}R</td>
              <td>{r.lastPf === 999 ? "∞" : r.lastPf}</td>
              <td>{r.lastWinRate}%</td>
              <td>{r.maxRecentDrawdownR}R</td>
              <td>{r.reason}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function TradeWindowAuditPanel({ summary, researchMode }: { summary: BasketPortfolioSummary; researchMode: boolean }) {
  const latest = summary.latest100TradeAudit;
  const worst = summary.worst100TradeAudit;
  const rows = summary.tradeWindowAudits || [];
  if (!latest && !rows.length) return null;
  return (
    <div className="breakdown-card full-width">
      <h4>Paper-live readiness notes</h4>
      <p className="muted tiny">The main benchmark is active-only. Tracked 100 is the paper-style benchmark; Tracked 500 is a research/cloud-readiness stress test. The 100-trade window audit remains as a stress test, but paper testing should focus on the watchlist scanner and research journal.</p>
      <div className="mini-grid wide">
        {latest ? <>
          <StatCard label="Latest 100 total R" value={`${latest.totalR}R`} helper={latest.note} />
          <StatCard label="Latest 100 PF" value={latest.profitFactor === 999 ? "∞" : latest.profitFactor} helper={`${latest.winRate}% win`} />
          <StatCard label="Latest 100 max DD" value={`${latest.maxDrawdownR}R`} helper={`${formatDateTime(latest.startTime)} → ${formatDateTime(latest.endTime)}`} />
        </> : null}
        {worst ? <>
          <StatCard label="Worst 100 total R" value={`${worst.totalR}R`} helper={worst.note} />
          <StatCard label="Worst 100 PF" value={worst.profitFactor === 999 ? "∞" : worst.profitFactor} helper={`${worst.winRate}% win`} />
          <StatCard label="Worst 100 max DD" value={`${worst.maxDrawdownR}R`} helper={`${formatDateTime(worst.startTime)} → ${formatDateTime(worst.endTime)}`} />
        </> : null}
      </div>
      {researchMode && rows.length ? <div className="table-wrap compact">
        <table>
          <thead><tr><th>Window</th><th>Dates</th><th>Trades</th><th>Total R</th><th>Avg R</th><th>PF</th><th>Win%</th><th>Max DD R</th><th>Longest loss streak</th><th>Readiness</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{formatDateTime(r.startTime)} → {formatDateTime(r.endTime)}</td>
              <td>{r.trades}</td>
              <td>{r.totalR}R</td>
              <td>{r.avgR}R</td>
              <td>{r.profitFactor === 999 ? "∞" : r.profitFactor}</td>
              <td>{r.winRate}%</td>
              <td>{r.maxDrawdownR}R</td>
              <td>{r.longestLossStreak}</td>
              <td>{r.ready ? "Pass" : "Review"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div> : null}
    </div>
  );
}

function BasketPortfolioPanel({ summary, rows, researchMode }: { summary: BasketPortfolioSummary; rows: BasketResult[]; researchMode: boolean }) {
  const shareText = universalShareText(summary, rows);
  const leaderSleeveRows = buildLeaderSleeveRows(summary, rows);
  const practicalLeaderSleeve = leaderSleeveRows.find((r) => r.sleevePct === 25);
  const bestLeaderSleeve = leaderSleeveRows.slice().sort((a, b) => b.endingBalance - a.endingBalance)[0];
  const copyShareText = () => {
    void navigator.clipboard?.writeText(shareText);
  };

  return (
    <div className="basket-results">
      <h4>Realistic Universal Account</h4>
      <p className="muted small">This is the main realistic account test. It replays the basket like a live scanner, enforces account rules, and only takes trades your account can actually afford. Turn on Research View to see the full proof behind the result.</p>
      <div className="mini-grid wide">
        <StatCard label="Account policy" value={summary.accountPolicyLabel} helper="Selected replay policy" />
        <StatCard label="Starting account" value={`$${summary.startingBalance.toLocaleString()}`} />
        <StatCard label="Realistic ending" value={`$${summary.endingBalance.toLocaleString()}`} helper={`${summary.returnPct}%`} />
        <StatCard label="Realistic net" value={`$${summary.netProfit.toLocaleString()}`} />
        <StatCard label="Equal-weight buy/hold" value={`$${summary.buyHoldEndingBalance.toLocaleString()}`} />
        <StatCard label="Strategy vs hold" value={`$${summary.strategyVsBuyHold.toLocaleString()}`} />
        {researchMode && practicalLeaderSleeve?.leaderCount ? <StatCard label="25% dynamic sleeve" value={`$${practicalLeaderSleeve.endingBalance.toLocaleString()}`} helper={`$${practicalLeaderSleeve.strategyVsHold.toLocaleString()} vs hold · ${practicalLeaderSleeve.holdCapturePct}% capture`} /> : null}
        <StatCard label="Max DD" value={`$${summary.maxDrawdownDollars.toLocaleString()}`} helper={`${summary.maxDrawdownPct}%`} />
        <StatCard label="Accepted trades" value={summary.acceptedTrades} helper={`${summary.longTrades} long / ${summary.shortTrades} short`} />
        <StatCard label="Return/DD" value={summary.returnToDrawdown} helper="Higher is better" />
        <StatCard label="PF" value={summary.profitFactor === 999 ? "∞" : summary.profitFactor} />
        <StatCard label="Win rate" value={`${summary.winRate}%`} />
        <StatCard label="Avg cash used" value={`${summary.avgCashUsedPct}%`} helper={`Max ${summary.maxCashUsedPct}%`} />
        <StatCard label="R curve consistency" value={`${summary.rCurveConsistency}/100`} helper="Accepted R vs ideal line" />
        <StatCard label="Latest 50-trade PF" value={summary.rollingProfitFactor50 === 999 ? "∞" : summary.rollingProfitFactor50} />
        {researchMode ? <>
          <StatCard label="Skipped total" value={summary.skippedTrades} helper="Not realistic/allowed" />
          <StatCard label="Skipped buying power" value={summary.skippedBuyingPower} />
          <StatCard label="Skipped no shorts" value={summary.skippedNoShorts} />
          <StatCard label="Skipped max open" value={summary.skippedMaxOpen} />
          <StatCard label="Skipped max risk" value={summary.skippedMaxRisk} />
          <StatCard label="Skipped low quality" value={summary.skippedLowQuality} helper="Cash + quality filters" />
          <StatCard label="Rolling quality skips" value={summary.skippedRollingQuality} helper="Past-data-only symbol gate" />
          <StatCard label="Skipped state cap" value={summary.skippedStateCap} helper="Choppy/leader caps" />
          <StatCard label="State-cap bypasses" value={summary.stateCapBypasses} helper="policy score override" />
          <StatCard label="Avg trade P/L" value={`$${summary.avgTradePnl.toLocaleString()}`} />
          <StatCard label="Avg actual risk" value={`${summary.avgActualRiskPct}%`} helper={`Target hit ${summary.targetRiskHitPct}%`} />
          <StatCard label="Position-cap limited" value={summary.positionCapLimitedTrades} helper="Trades below target risk" />
          <StatCard label="Top 10 profit concentration" value={`${summary.top10ProfitPct}%`} helper="Of gross winners" />
          <StatCard label="Best symbol concentration" value={`${summary.bestSymbolProfitPct}%`} helper="Of net profit" />
          <StatCard label="Best dynamic sleeve estimate" value={bestLeaderSleeve?.leaderCount ? `$${bestLeaderSleeve.endingBalance.toLocaleString()}` : "—"} helper={bestLeaderSleeve?.leaderCount ? `${bestLeaderSleeve.sleevePct}% diagnostic` : "Diagnostic only"} />
        </> : null}
      </div>
      <TradeWindowAuditPanel summary={summary} researchMode={researchMode} />
      {researchMode ? <RollingQualityGatePanel summary={summary} /> : null}
      <EquityCurve points={summary.equityPoints} label="Active scanner equity curve" />
      {researchMode && summary.leaderSleeveEquityPoints?.length ? <EquityCurve points={summary.leaderSleeveEquityPoints} label="Active + dynamic 25% leader sleeve equity curve (research only)" /> : null}
      {researchMode && summary.leaderSleeveOnlyPoints?.length ? <EquityCurve points={summary.leaderSleeveOnlyPoints} label="Dynamic leader sleeve-only curve (100% sleeve reference)" /> : null}
      {summary.buyHoldEquityPoints?.length ? <EquityCurve points={summary.buyHoldEquityPoints} label="Equal-weight buy-and-hold equity curve" /> : null}
      <h4>Accepted-Trade R Consistency</h4>
      <BasketRConsistencyChart summary={summary} />
      {researchMode ? <div className="insight-box">
        <ul>
          <li>This chart uses account equity, not just cash balance, so buying a position should not look like a fake crash.</li>
          <li>Cash-first baseline: a downtrend can be handled by skipping weak long setups instead of forcing shorts; v5.7 keeps the v5.5 controlled override as the main baseline and moves deeper proof into Research View.</li>
          <li>Use the copy/export buttons below to send results back for the next improvement pass.</li>
        </ul>
      </div> : null}
      <div className="actions">
        <button className="secondary small" onClick={copyShareText}>Copy results summary</button>
        {researchMode ? <button className="secondary small" onClick={() => downloadTextFile("realistic-universal-account-v7-0-summary.txt", shareText)}>Export summary TXT</button> : null}
      </div>
      {researchMode ? <pre className="share-box">{shareText}</pre> : null}
      {researchMode ? <LeaderSleeveDiagnostic summary={summary} rows={rows} /> : null}
      {researchMode ? <BasketQualityDiagnostic rows={summary.bySymbol} /> : null}
      {researchMode ? <div className="breakdown-grid">
        <UniversalGroupTable title="Realistic P/L by symbol" rows={summary.bySymbol} />
        <UniversalGroupTable title="Realistic P/L by current state" rows={summary.byState} />
        <UniversalGroupTable title="Realistic P/L by regime" rows={summary.byRegime} />
      </div> : null}
      {researchMode ? <div className="breakdown-grid">
        <RejectedByStateTable rows={summary.rejectedByState} />
        <RejectedOpportunitiesTable rows={summary.topRejected} />
      </div> : null}
    </div>
  );
}

function BasketResultsTable({ rows }: { rows: BasketResult[] }) {
  if (!rows.length) return null;

  const validRows = rows.filter((r) => r.trades > 0 || r.endingBalance > 0 || r.buyHoldEndingBalance > 0);
  const positive = validRows.filter((r) => r.cumulativeR > 0).length;
  const beatHold = validRows.filter((r) => r.strategyVsHold > 0).length;
  const totalR = Math.round(validRows.reduce((sum, r) => sum + r.cumulativeR, 0) * 100) / 100;
  const avgRPerSymbol = validRows.length ? Math.round((totalR / validRows.length) * 100) / 100 : 0;
  const avgPf = validRows.length ? Math.round((validRows.reduce((sum, r) => sum + r.profitFactor, 0) / validRows.length) * 100) / 100 : 0;
  const avgConsistency = validRows.length ? Math.round(validRows.reduce((sum, r) => sum + r.consistency, 0) / validRows.length) : 0;
  const warnings = rows.filter((r) => r.warning).length;
  const worst = validRows.slice().sort((a, b) => a.cumulativeR - b.cumulativeR)[0];
  const best = validRows.slice().sort((a, b) => b.cumulativeR - a.cumulativeR)[0];
  const missedLeader = validRows.filter((r) => r.personality.includes("leader") && r.strategyVsHold < 0).length;
  const weakRecent = validRows.filter((r) => r.recentThreeMonthR < 0).length;
  const avgRealisticEnding = validRows.length ? Math.round((validRows.reduce((sum, r) => sum + r.realisticEnding, 0) / validRows.length) * 100) / 100 : 0;
  const totalRealisticSkipped = validRows.reduce((sum, r) => sum + r.realisticSkipped, 0);

  const personalityCounts = validRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.personality] = (acc[r.personality] || 0) + 1;
    return acc;
  }, {});
  const issueCounts = validRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.issue] = (acc[r.issue] || 0) + 1;
    return acc;
  }, {});
  const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="basket-results">
      <div className="section-head"><h4>Basket Summary</h4><button className="secondary small" onClick={() => downloadTextFile("universal-validator-v5-3-results.csv", basketResultsCsv(rows))}>Export Validator CSV</button></div>
      <div className="mini-grid wide">
        <StatCard label="Positive symbols" value={`${positive}/${validRows.length}`} />
        <StatCard label="Beat buy/hold" value={`${beatHold}/${validRows.length}`} />
        <StatCard label="Total basket R" value={`${totalR}R`} />
        <StatCard label="Avg R / symbol" value={`${avgRPerSymbol}R`} />
        <StatCard label="Avg profit factor" value={avgPf} />
        <StatCard label="Avg consistency" value={`${avgConsistency}/100`} />
        <StatCard label="Best symbol" value={best ? `${best.symbol} ${best.cumulativeR}R` : "—"} />
        <StatCard label="Worst symbol" value={worst ? `${worst.symbol} ${worst.cumulativeR}R` : "—"} />
        <StatCard label="Avg realistic ending" value={`$${avgRealisticEnding.toLocaleString()}`} helper="Per symbol, buying-power constrained" />
        <StatCard label="Realistic skips" value={totalRealisticSkipped} helper="Buying power / shorts / whole shares" />
        <StatCard label="Leader misses" value={missedLeader} helper="Profitable but behind buy/hold" />
        <StatCard label="Negative recent 3M" value={weakRecent} />
        <StatCard label="Total short drag" value={`${Math.round(validRows.reduce((sum, r) => sum + r.shortDragR, 0) * 100) / 100}R`} />
        <StatCard label="Failed leader R" value={`${Math.round(validRows.reduce((sum, r) => sum + r.failedLeaderR, 0) * 100) / 100}R`} />
        <StatCard label="Transition R" value={`${Math.round(validRows.reduce((sum, r) => sum + r.bearTransitionR, 0) * 100) / 100}R`} />
        <StatCard label="Data warnings" value={warnings} />
      </div>

      <div className="insight-box">
        <ul>
          {Object.entries(personalityCounts).map(([name, count]) => <li key={name}>{name}: {count} symbol(s)</li>)}
          {topIssues.map(([issue, count]) => <li key={issue}>Issue: {issue} on {count} symbol(s)</li>)}
        </ul>
      </div>

      <h4>Per-symbol validator</h4>
      <div className="table-wrap compact">
        <table>
          <thead>
            <tr>
              <th>Symbol</th><th>Personality</th><th>Trades</th><th>Cum R</th><th>Long R</th><th>Short R</th><th>Avg R</th><th>PF</th><th>Max DD</th><th>Consistency</th><th>Recent 3M</th><th>Ending</th><th>Realistic</th><th>Skipped</th><th>Buy/Hold</th><th>Vs Hold</th><th>Beat Hold</th><th>Best Dir</th><th>Best Setup</th><th>Best Regime</th><th>Worst Regime</th><th>Best State</th><th>Worst State</th><th>Failed Leader R</th><th>Bear Transition R</th><th>Best Year</th><th>Worst Year</th><th>Issue</th><th>Suggestion</th><th>Data</th><th>Warning</th>
            </tr>
          </thead>
          <tbody>{rows.map((r) => (
            <tr key={r.symbol}>
              <td>{r.symbol}</td>
              <td>{r.personality}</td>
              <td>{r.trades}</td>
              <td>{r.cumulativeR}</td>
              <td>{r.longR}R</td>
              <td>{r.shortR}R</td>
              <td>{r.avgR}</td>
              <td>{r.profitFactor === 999 ? "∞" : r.profitFactor}</td>
              <td>{r.maxDrawdownR}R</td>
              <td>{r.consistency}/100</td>
              <td>{r.recentThreeMonthR}R</td>
              <td>{r.endingBalance ? `$${r.endingBalance.toLocaleString()}` : "—"}</td>
              <td>{r.realisticEnding ? `$${r.realisticEnding.toLocaleString()}` : "—"}</td>
              <td>{r.realisticSkipped}</td>
              <td>{r.buyHoldEndingBalance ? `$${r.buyHoldEndingBalance.toLocaleString()}` : "—"}</td>
              <td>{r.strategyVsHold ? `$${r.strategyVsHold.toLocaleString()}` : "—"}</td>
              <td>{r.beatHold ? "Yes" : "No"}</td>
              <td>{r.bestDirection}</td>
              <td>{r.bestSetup}</td>
              <td>{r.bestRegime}</td>
              <td>{r.worstRegime}</td>
              <td>{r.bestState}</td>
              <td>{r.worstState}</td>
              <td>{r.failedLeaderR}R</td>
              <td>{r.bearTransitionR}R</td>
              <td>{r.bestYear}</td>
              <td>{r.worstYear}</td>
              <td>{r.issue}</td>
              <td>{r.suggestion}</td>
              <td>{r.candleCount ? `${r.candleCount.toLocaleString()} candles` : "—"}</td>
              <td>{r.warning || ""}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}


function ConsistencyCurveChart({ points }: { points: BacktestSummary["consistencyCurve"] }) {
  if (!points.length) return <div className="chart-empty small-chart">No consistency curve yet.</div>;
  const width = 700;
  const height = 190;
  const allValues = points.flatMap((p) => [p.actualR, p.idealR]);
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 0);
  const range = max - min || 1;
  const xFor = (i: number) => points.length === 1 ? width : (i / (points.length - 1)) * width;
  const yFor = (value: number) => height - ((value - min) / range) * height;
  const actual = points.map((p, i) => `${xFor(i)},${yFor(p.actualR)}`).join(" ");
  const ideal = points.map((p, i) => `${xFor(i)},${yFor(p.idealR)}`).join(" ");
  const latest = points[points.length - 1];
  const avgConsistency = Math.round(points.reduce((sum, p) => sum + p.rollingConsistency, 0) / points.length);
  return (
    <div className="dated-chart-wrap">
      <div className="mini-grid wide">
        <StatCard label="Avg rolling consistency" value={`${avgConsistency}/100`} />
        <StatCard label="Latest rolling PF" value={latest.rollingProfitFactor === 999 ? "∞" : latest.rollingProfitFactor} />
        <StatCard label="Latest rolling avg R" value={`${latest.rollingAvgR}R`} />
        <StatCard label="Latest deviation" value={`${latest.deviationR}R`} helper="Actual R minus ideal straight line" />
      </div>
      <svg className="equity-curve" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline points={ideal} className="ideal-line" fill="none" />
        <polyline points={actual} className="equity-line" fill="none" />
      </svg>
      <div className="axis-labels"><span>Start</span><span>Actual R vs ideal straight-line R</span><span>End</span></div>
    </div>
  );
}

function TradeTable({ trades }: { trades: JournalTrade[] }) {
  if (!trades.length) return <div className="chart-empty small-chart">No trades yet.</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Symbol</th>
            <th>TF</th>
            <th>Score</th>
            <th>Bias</th>
            <th>Entry</th>
            <th>Stop</th>
            <th>Target</th>
            <th>R/R</th>
            <th>Target Mode</th>
            <th>Setup</th>
            <th>Regime</th>
            <th>Session</th>
            <th>Vol</th>
            <th>Ext</th>
            <th>Overnight</th>
            <th>Signal</th>
            <th>Resolved</th>
            <th>R</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id}>
              <td><span className={badgeClass(t.status)}>{t.status}</span></td>
              <td>{t.symbol}</td>
              <td>{t.timeframe}</td>
              <td>{t.score}</td>
              <td>{t.bias}</td>
              <td>{t.entry}</td>
              <td>{t.stop}</td>
              <td>{t.target}</td>
              <td>{t.rr}</td>
              <td>{t.targetMode || "—"}</td>
              <td>{t.setupType || "—"}</td>
              <td>{t.marketRegime || "—"}</td>
              <td>{t.session || "—"}</td>
              <td>{typeof t.volumeRatio === "number" ? `${t.volumeRatio}x` : "—"}</td>
              <td>{typeof t.extensionAtr === "number" ? `${t.extensionAtr} ATR` : "—"}</td>
              <td>{t.noOvernight ? "No" : "Allowed"}</td>
              <td>{formatDateTime(t.signalTime)}</td>
              <td>{t.resolvedAt ? formatDateTime(t.resolvedAt) : "—"}</td>
              <td>{typeof t.resultR === "number" ? t.resultR : "—"}</td>
              <td>{t.source}/{t.mode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
