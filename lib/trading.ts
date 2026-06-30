export type Timeframe = "1Min" | "5Min" | "15Min" | "30Min" | "1Hour";
export type Bias = "Long" | "Short" | "Neutral";
export type TradeStatus = "Open" | "Win" | "Loss" | "Ambiguous" | "Timeout";
export type AppMode = "Research" | "Live";
export type JournalSource = "Manual" | "Auto" | "Backtest";
export type TargetMode = "FixedR" | "Structure" | "ATR";
export type GradeProfile = "Balanced" | "Pullback" | "Breakout";
export type DirectionFilter = "All" | "Long" | "Short";
export type SessionFilter = "All" | "RegularHours" | "MiddayAfternoon" | "Morning" | "Midday" | "Afternoon" | "Outside";
export type RiskModel = "Percent" | "Fixed";
export type MarketRegime = "Bull" | "Neutral" | "Bear" | "Panic";
export type RegimeFilter = "Off" | "BlockLongBear" | "LongBullOnly" | "ShortBearOnly" | "LongBullShortBear";
export type SetupTypeFilter = "All" | "Continuation" | "Pullback" | "ContinuationPullback" | "ExcludeBreakoutChase" | "Breakout" | "Chase" | "LongContinuation" | "LongPullback" | "LongContinuationPullback" | "ShortPullbackReject" | "ShortRallyRejection" | "ShortContinuation" | "AdaptiveBest";
export type StrategyEngine = "Manual" | "DefensiveLong" | "BullNeutralLongBearShort" | "BullLongBearShortCashNeutral" | "BearShortOnly" | "AdaptiveRegime" | "UniversalAdaptive" | "UniversalAdaptivePro" | "UniversalAdaptiveProV2" | "UniversalAdaptiveProV3" | "UniversalAdaptiveProV4" | "UniversalAdaptiveProV5" | "UniversalAdaptiveProV6";
export type LeaderExitMode = "Fixed" | "Expanded" | "PartialRunner";

type SymbolPersonalityContext = {
  returnPct: number;
  recentReturnPct: number;
  peakReturnPct: number;
  drawdownFromHighPct: number;
  isExplosiveLeader: boolean;
  isLeader: boolean;
  wasLeader: boolean;
  isFailedLeader: boolean;
  isBearTransition: boolean;
  isBullRecovery: boolean;
  isWeak: boolean;
  isLaggard: boolean;
  isChoppy: boolean;
  longTermSlopePct: number;
};


export type PortfolioSettings = {
  startingBalance: number;
  riskModel: RiskModel;
  riskPercent: number;
  fixedRiskDollars: number;
};

export type RealisticAccountType = "Cash" | "Margin";

export type RealisticAccountSettings = {
  enabled: boolean;
  accountType: RealisticAccountType;
  allowFractionalShares: boolean;
  allowShorts: boolean;
  marginMultiplier: number;
  maxPositionPct: number;
};

export type EquityPoint = {
  time: string;
  value: number;
};

export type DataWindowSummary = {
  requestedStart?: string;
  requestedEnd?: string;
  firstCandle?: string;
  lastCandle?: string;
  candleCount: number;
  loadedDays: number;
  warning?: string;
};

export type PortfolioSummary = {
  startingBalance: number;
  endingBalance: number;
  netProfit: number;
  returnPct: number;
  maxDrawdownDollars: number;
  maxDrawdownPct: number;
  riskModel: RiskModel;
  riskLabel: string;
  equityPoints: EquityPoint[];
  buyHoldEndingBalance: number;
  buyHoldNetProfit: number;
  buyHoldReturnPct: number;
  buyHoldMaxDrawdownDollars: number;
  buyHoldMaxDrawdownPct: number;
  buyHoldEquityPoints: EquityPoint[];
  strategyVsBuyHold: number;
};

export type RealisticPortfolioSummary = {
  enabled: boolean;
  startingCash: number;
  endingCash: number;
  netProfit: number;
  returnPct: number;
  maxDrawdownDollars: number;
  maxDrawdownPct: number;
  acceptedTrades: number;
  skippedBuyingPower: number;
  skippedNoShorts: number;
  skippedWholeShare: number;
  avgCashUsedPct: number;
  maxCashUsedPct: number;
  avgUnusedCash: number;
  maxPositionValue: number;
  accountType: RealisticAccountType;
  allowFractionalShares: boolean;
  allowShorts: boolean;
  equityPoints: EquityPoint[];
};

export type ConsistencyCurvePoint = {
  time: string;
  actualR: number;
  idealR: number;
  deviationR: number;
  rollingAvgR: number;
  rollingProfitFactor: number;
  rollingDrawdownR: number;
  rollingConsistency: number;
};

export type RiskComparison = {
  riskPercent: number;
  endingBalance: number;
  netProfit: number;
  returnPct: number;
  maxDrawdownDollars: number;
  maxDrawdownPct: number;
};

export type ExposureSummary = {
  samples: number;
  maxSimultaneousTrades: number;
  avgSimultaneousTrades: number;
  maxPlannedOpenRiskPct: number;
  avgPlannedOpenRiskPct: number;
  skippedByMaxOpenTrades: number;
  skippedByMaxTotalRisk: number;
};

export type DiagnosticGroupStats = {
  label: string;
  trades: number;
  wins: number;
  losses: number;
  timeouts: number;
  positiveR: number;
  negativeR: number;
  winRate: number;
  avgR: number;
  cumulativeR: number;
  profitFactor: number;
  maxDrawdownR: number;
};

export type ConsistencySummary = {
  score: number;
  positiveMonthRate: number;
  profitableMonths: number;
  totalMonths: number;
  worstMonthR: number;
  bestMonthR: number;
  recentThreeMonthR: number;
  rOverDrawdown: number;
  notes: string[];
};

export type GradeSettings = {
  profile: GradeProfile;
};

export const DEFAULT_GRADE_SETTINGS: GradeSettings = {
  profile: "Pullback",
};

export type TargetSettings = {
  mode: TargetMode;
  fixedR: number;
  atrMultiple: number;
};

export const DEFAULT_TARGET_SETTINGS: TargetSettings = {
  mode: "FixedR",
  fixedR: 1.2,
  atrMultiple: 1.8,
};

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type GradeResult = {
  score: number;
  bias: Bias;
  entry: number;
  stop: number;
  target: number;
  rr: number;
  risk: number;
  targetMode: TargetMode;
  targetDescription: string;
  setupType: string;
  marketRegime: MarketRegime;
  regimeReasons: string[];
  gradeProfile: GradeProfile;
  signalTime: string;
  latestClose: number;
  latestCandleTime: string;
  staleMinutes: number;
  reasons: string[];
  warnings: string[];
  diagnostics: {
    rsi: number;
    atr: number;
    volumeRatio: number;
    extensionAtr: number;
    trendSlopeAtr: number;
    pullbackQuality: number;
    exhaustionRisk: number;
    tradability: number;
    regimeScore: number;
    assetStrength: number;
    assetTrendPct: number;
  };
  components: {
    trend: number;
    momentum: number;
    location: number;
    volume: number;
    volatility: number;
    riskReward: number;
    exhaustion: number;
  };
};

export type JournalTrade = {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  mode: AppMode;
  source: JournalSource;
  createdAt: string;
  signalTime: string;
  score: number;
  bias: Exclude<Bias, "Neutral">;
  entry: number;
  stop: number;
  target: number;
  rr: number;
  targetMode?: TargetMode;
  setupType?: string;
  marketRegime?: MarketRegime;
  marketState?: string;
  session?: string;
  year?: string;
  month?: string;
  rsi?: number;
  volumeRatio?: number;
  extensionAtr?: number;
  noOvernight?: boolean;
  status: TradeStatus;
  resolvedAt?: string;
  resultR?: number;
  note?: string;
};

export type BacktestSettings = {
  symbol: string;
  timeframe: Timeframe;
  minScore: number;
  maxScore: number;
  minRR: number;
  cooldownMinutes: number;
  maxBarsToHold: number;
  warmupBars: number;
  onePositionAtATime: boolean;
  noOvernight: boolean;
  targetSettings: TargetSettings;
  gradeSettings: GradeSettings;
  directionFilter?: DirectionFilter;
  sessionFilter?: SessionFilter;
  minVolumeRatio?: number;
  maxExtensionAtr?: number;
  regimeFilter?: RegimeFilter;
  setupTypeFilter?: SetupTypeFilter;
  strategyEngine?: StrategyEngine;
  maxOpenTrades?: number;
  maxTotalOpenRiskPct?: number;
  maxDailyLossR?: number;
  maxMonthlyLossR?: number;
  slippageR?: number;
  commissionR?: number;
  leaderExitMode?: LeaderExitMode;
  requestedStart?: string;
  requestedEnd?: string;
  portfolioSettings?: PortfolioSettings;
  realisticSettings?: RealisticAccountSettings;
};

export type BacktestSummary = {
  symbol: string;
  timeframe: Timeframe;
  totalTrades: number;
  wins: number;
  losses: number;
  ambiguous: number;
  timeouts: number;
  positiveR: number;
  negativeR: number;
  winRate: number;
  avgR: number;
  cumulativeR: number;
  maxDrawdownR: number;
  profitFactor: number;
  scoreRanges: ScoreRangeStats[];
  trades: JournalTrade[];
  equityCurve: number[];
  equityCurvePoints: EquityPoint[];
  dataWindow: DataWindowSummary;
  portfolio: PortfolioSummary;
  realisticPortfolio: RealisticPortfolioSummary;
  consistencyCurve: ConsistencyCurvePoint[];
  diagnostics: {
    byDirection: DiagnosticGroupStats[];
    bySession: DiagnosticGroupStats[];
    byYear: DiagnosticGroupStats[];
    byMonth: DiagnosticGroupStats[];
    bySetupType: DiagnosticGroupStats[];
    byRegime: DiagnosticGroupStats[];
    byRegimeDirection: DiagnosticGroupStats[];
    byMarketState: DiagnosticGroupStats[];
  };
  consistency: ConsistencySummary;
  riskComparisons: RiskComparison[];
  exposure: ExposureSummary;
};

export type ScoreRangeStats = {
  label: string;
  min: number;
  max: number;
  trades: number;
  wins: number;
  losses: number;
  ambiguous: number;
  timeouts: number;
  positiveR: number;
  negativeR: number;
  winRate: number;
  avgR: number;
  cumulativeR: number;
};

export const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
  "1Min": 1,
  "5Min": 5,
  "15Min": 15,
  "30Min": 30,
  "1Hour": 60,
};

export function parseCsvCandles(csv: string): Candle[] {
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) return [];

  const header = rows[0].toLowerCase().split(",").map((h) => h.trim());
  const getIndex = (names: string[]) => names.map((name) => header.indexOf(name)).find((i) => i >= 0) ?? -1;

  const timeIdx = getIndex(["time", "timestamp", "date", "t"]);
  const openIdx = getIndex(["open", "o"]);
  const highIdx = getIndex(["high", "h"]);
  const lowIdx = getIndex(["low", "l"]);
  const closeIdx = getIndex(["close", "c"]);
  const volumeIdx = getIndex(["volume", "v"]);

  if ([timeIdx, openIdx, highIdx, lowIdx, closeIdx].some((i) => i < 0)) return [];

  return rows.slice(1)
    .map((row) => row.split(",").map((cell) => cell.trim()))
    .map((cells) => ({
      time: cells[timeIdx],
      open: Number(cells[openIdx]),
      high: Number(cells[highIdx]),
      low: Number(cells[lowIdx]),
      close: Number(cells[closeIdx]),
      volume: volumeIdx >= 0 ? Number(cells[volumeIdx]) : 0,
    }))
    .filter((c) => c.time && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function candlesToCsv(candles: Candle[]): string {
  const header = "time,open,high,low,close,volume";
  const lines = candles.map((c) => [c.time, c.open, c.high, c.low, c.close, c.volume].join(","));
  return [header, ...lines].join("\n");
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sma(candles: Candle[], period: number): number {
  if (candles.length < period) return average(candles.map((c) => c.close));
  return average(candles.slice(-period).map((c) => c.close));
}

function emptySymbolPersonalityContext(): SymbolPersonalityContext {
  return {
    returnPct: 0,
    recentReturnPct: 0,
    peakReturnPct: 0,
    drawdownFromHighPct: 0,
    isExplosiveLeader: false,
    isLeader: false,
    wasLeader: false,
    isFailedLeader: false,
    isBearTransition: false,
    isBullRecovery: false,
    isWeak: false,
    isLaggard: false,
    isChoppy: true,
    longTermSlopePct: 0,
  };
}

function buildSymbolPersonalityContext(candles: Candle[]): SymbolPersonalityContext {
  const clean = candles.filter((c) => Number.isFinite(c.close));
  if (clean.length < 50) return emptySymbolPersonalityContext();

  const first = clean[0].close;
  const last = clean[clean.length - 1].close;
  const returnPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const recentAnchor = clean[Math.max(0, clean.length - 1 - Math.min(200, clean.length - 1))]?.close || first;
  const recentReturnPct = recentAnchor > 0 ? ((last - recentAnchor) / recentAnchor) * 100 : 0;
  const peakClose = Math.max(...clean.map((c) => c.close));
  const peakReturnPct = first > 0 ? ((peakClose - first) / first) * 100 : 0;
  const drawdownFromHighPct = peakClose > 0 ? ((last - peakClose) / peakClose) * 100 : 0;

  const longPeriod = Math.min(800, clean.length);
  const midPeriod = Math.min(200, clean.length);
  const fastPeriod = Math.min(50, clean.length);
  const longSma = sma(clean, longPeriod);
  const midSma = sma(clean, midPeriod);
  const fastSma = sma(clean, fastPeriod);
  const longTermSlopePct = longSma > 0 ? ((midSma - longSma) / longSma) * 100 : 0;
  const aboveLongStack = last > longSma * 1.01 && midSma >= longSma * 0.99;
  const belowLongStack = last < longSma * 0.985 && midSma <= longSma * 1.005;
  const trendDeteriorating = fastSma < midSma * 0.995 && midSma < longSma * 1.01;

  const wasLeader = peakReturnPct >= 50 || returnPct >= 50;
  const isExplosiveLeader = returnPct >= 250 && aboveLongStack && drawdownFromHighPct > -25;
  const isLeader = ((returnPct >= 35 && aboveLongStack) || isExplosiveLeader) && drawdownFromHighPct > -22;
  const isFailedLeader = wasLeader && !isExplosiveLeader && (drawdownFromHighPct <= -18 || (belowLongStack && drawdownFromHighPct <= -10)) && trendDeteriorating;
  const isBearTransition = wasLeader && !isFailedLeader && !isExplosiveLeader && drawdownFromHighPct <= -10 && (last < midSma || fastSma < midSma) && recentReturnPct < 3;
  const isBullRecovery = !isLeader && !isFailedLeader && !isBearTransition && recentReturnPct >= 8 && last > midSma && fastSma >= midSma * 0.995;
  const isLaggard = returnPct <= -20 || (belowLongStack && recentReturnPct <= 0);
  const isWeak = returnPct <= 0 || isLaggard || isFailedLeader;
  const isChoppy = !isLeader && !isWeak && !isBullRecovery && Math.abs(longTermSlopePct) < 6 && Math.abs(recentReturnPct) < 10;

  return {
    returnPct: round(returnPct, 2),
    recentReturnPct: round(recentReturnPct, 2),
    peakReturnPct: round(peakReturnPct, 2),
    drawdownFromHighPct: round(drawdownFromHighPct, 2),
    isExplosiveLeader,
    isLeader,
    wasLeader,
    isFailedLeader,
    isBearTransition,
    isBullRecovery,
    isWeak,
    isLaggard,
    isChoppy,
    longTermSlopePct: round(longTermSlopePct, 2),
  };
}

function marketStateLabel(ctx: SymbolPersonalityContext, grade?: GradeResult): string {
  if (ctx.isFailedLeader) return "Failed leader";
  if (ctx.isBearTransition) return "Bear transition";
  if (ctx.isBullRecovery) return "Bull recovery";
  if (ctx.isExplosiveLeader) return "Explosive leader";
  if (ctx.isLeader) return "Healthy leader";
  if (ctx.isLaggard || ctx.isWeak) return "Weak/laggard";
  if (ctx.isChoppy) return "Choppy/no edge";
  return grade?.marketRegime ? `${grade.marketRegime} normal` : "Tradable normal";
}

function avgRange(candles: Candle[], period = 14): number {
  const slice = candles.slice(-period);
  return average(slice.map((c) => Math.max(0, c.high - c.low)));
}

function trueRange(current: Candle, previous?: Candle): number {
  if (!previous) return current.high - current.low;
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

function atr(candles: Candle[], period = 14): number {
  const slice = candles.slice(-period - 1);
  const values: number[] = [];
  for (let i = 1; i < slice.length; i += 1) {
    values.push(trueRange(slice[i], slice[i - 1]));
  }
  return average(values) || avgRange(candles, period);
}

function rsi(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 50;
  const slice = candles.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < slice.length; i += 1) {
    const change = slice[i].close - slice[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function avgVolume(candles: Candle[], period = 20): number {
  const slice = candles.slice(-period);
  return average(slice.map((c) => c.volume || 0));
}

function highestHigh(candles: Candle[], period: number): number {
  const slice = candles.slice(-period);
  return slice.length ? Math.max(...slice.map((c) => c.high)) : 0;
}

function lowestLow(candles: Candle[], period: number): number {
  const slice = candles.slice(-period);
  return slice.length ? Math.min(...slice.map((c) => c.low)) : 0;
}

function normalizeGradeSettings(settings?: Partial<GradeSettings>): GradeSettings {
  const profile = settings?.profile || DEFAULT_GRADE_SETTINGS.profile;
  return {
    profile: profile === "Balanced" || profile === "Pullback" || profile === "Breakout" ? profile : DEFAULT_GRADE_SETTINGS.profile,
  };
}

function normalizeTargetSettings(settings?: Partial<TargetSettings>): TargetSettings {
  return {
    mode: settings?.mode || DEFAULT_TARGET_SETTINGS.mode,
    fixedR: Number.isFinite(settings?.fixedR) && (settings?.fixedR || 0) > 0 ? Number(settings?.fixedR) : DEFAULT_TARGET_SETTINGS.fixedR,
    atrMultiple: Number.isFinite(settings?.atrMultiple) && (settings?.atrMultiple || 0) > 0 ? Number(settings?.atrMultiple) : DEFAULT_TARGET_SETTINGS.atrMultiple,
  };
}

function nearestAbove(candles: Candle[], price: number, minDistance = 0): number | null {
  const values = candles.map((c) => c.high).filter((value) => value > price + minDistance);
  return values.length ? Math.min(...values) : null;
}

function nearestBelow(candles: Candle[], price: number, minDistance = 0): number | null {
  const values = candles.map((c) => c.low).filter((value) => value < price - minDistance);
  return values.length ? Math.max(...values) : null;
}

function calculateTarget(params: {
  bias: Exclude<Bias, "Neutral">;
  entry: number;
  risk: number;
  structureCandles: Candle[];
  avgRangeValue: number;
  settings: TargetSettings;
}): { target: number; description: string } {
  const { bias, entry, risk, structureCandles, avgRangeValue, settings } = params;
  const fixedMove = Math.max(risk * settings.fixedR, entry * 0.001);
  const atrMove = Math.max(avgRangeValue * settings.atrMultiple, entry * 0.001);

  if (settings.mode === "ATR") {
    return {
      target: bias === "Long" ? entry + atrMove : entry - atrMove,
      description: `ATR/range target: ${settings.atrMultiple}x recent ATR/range.`,
    };
  }

  if (settings.mode === "Structure") {
    const minDistance = risk * 0.75;
    const structureTarget = bias === "Long" ? nearestAbove(structureCandles, entry, minDistance) : nearestBelow(structureCandles, entry, minDistance);
    if (structureTarget !== null) {
      return {
        target: structureTarget,
        description: bias === "Long" ? "Structure target: nearest prior resistance with enough room." : "Structure target: nearest prior support with enough room.",
      };
    }
    return {
      target: bias === "Long" ? entry + fixedMove : entry - fixedMove,
      description: `Structure fallback: no clean level found, using ${settings.fixedR}R target.`,
    };
  }

  return {
    target: bias === "Long" ? entry + fixedMove : entry - fixedMove,
    description: `Fixed target: ${settings.fixedR}R reward target.`,
  };
}

function scoreRangeLabel(score: number): string {
  if (score < 60) return "Under 60";
  if (score < 70) return "60-69";
  if (score < 80) return "70-79";
  if (score < 90) return "80-89";
  return "90-100";
}

function easternParts(value: string): { year: string; month: string; day: string; hour: number; minute: number } {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    const fallback = value.slice(0, 10).split("-");
    return { year: fallback[0] || "0000", month: fallback[1] || "00", day: fallback[2] || "00", hour: 0, minute: 0 };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const rawHour = Number(get("hour"));
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(get("minute")),
  };
}

export function marketSession(value: string): Exclude<SessionFilter, "All" | "RegularHours" | "MiddayAfternoon"> {
  const { hour, minute } = easternParts(value);
  const minutes = hour * 60 + minute;
  if (minutes >= 9 * 60 + 30 && minutes < 11 * 60 + 30) return "Morning";
  if (minutes >= 11 * 60 + 30 && minutes < 14 * 60) return "Midday";
  if (minutes >= 14 * 60 && minutes <= 16 * 60) return "Afternoon";
  return "Outside";
}

function sessionAllowsTrade(filter: SessionFilter | undefined, session: Exclude<SessionFilter, "All" | "RegularHours" | "MiddayAfternoon">): boolean {
  const mode = filter || "All";
  if (mode === "All") return true;
  if (mode === "RegularHours") return session === "Morning" || session === "Midday" || session === "Afternoon";
  if (mode === "MiddayAfternoon") return session === "Midday" || session === "Afternoon";
  return session === mode;
}

export function yearLabel(value: string): string {
  return easternParts(value).year;
}

export function monthLabel(value: string): string {
  const p = easternParts(value);
  return `${p.year}-${p.month}`;
}

function regimeLabel(regime: MarketRegime): string {
  return regime;
}

function detectMarketRegime(candles: Candle[]): { regime: MarketRegime; score: number; reasons: string[] } {
  const clean = candles.filter((c) => Number.isFinite(c.close));
  if (clean.length < 80) return { regime: "Neutral", score: 0, reasons: ["Not enough history for regime filter."] };

  const close = clean[clean.length - 1].close;
  const sma20 = sma(clean, 20);
  const sma50 = sma(clean, 50);
  const sma100 = sma(clean, Math.min(100, clean.length));
  const sma200 = sma(clean, Math.min(200, clean.length));
  const atrValue = atr(clean, 14) || close * 0.002;
  const prior50 = sma(clean.slice(0, -Math.min(30, clean.length - 1)), 50);
  const slopeAtr = (sma50 - prior50) / Math.max(atrValue, 0.000001);
  const rsiValue = rsi(clean, 14);
  const recentHigh = highestHigh(clean, Math.min(80, clean.length));
  const drawdownAtr = (recentHigh - close) / Math.max(atrValue, 0.000001);
  const below200Pct = ((sma200 - close) / Math.max(close, 0.000001)) * 100;

  let bull = 0;
  let bear = 0;
  const reasons: string[] = [];

  if (close > sma50) { bull += 1; reasons.push("Close above 50-bar average."); }
  else { bear += 1; reasons.push("Close below 50-bar average."); }

  if (close > sma200) { bull += 1; reasons.push("Close above long regime average."); }
  else { bear += 1; reasons.push("Close below long regime average."); }

  if (sma20 > sma50 && sma50 >= sma100 * 0.998) bull += 1;
  if (sma20 < sma50 && sma50 <= sma100 * 1.002) bear += 1;

  if (slopeAtr > 0.15) { bull += 1; reasons.push("50-bar trend slope is positive."); }
  if (slopeAtr < -0.15) { bear += 1; reasons.push("50-bar trend slope is negative."); }

  if (drawdownAtr < 3) bull += 0.5;
  if (drawdownAtr > 5) bear += 0.5;
  if (rsiValue > 55) bull += 0.5;
  if (rsiValue < 45) bear += 0.5;

  const score = round(bull - bear, 2);
  let regime: MarketRegime = "Neutral";
  if (score >= 1.75) regime = "Bull";
  if (score <= -1.75) regime = "Bear";

  // Panic means the market is weak and stretched down. It is often too late to chase shorts.
  if (regime === "Bear" && rsiValue < 28 && below200Pct > 1 && drawdownAtr > 6) {
    regime = "Panic";
    reasons.push("Panic/oversold bear condition: bearish but shorts may be late.");
  }

  if (regime === "Neutral") reasons.push("Regime is mixed/choppy, so cash mode may be better.");
  return { regime, score, reasons: reasons.slice(0, 4) };
}

function regimeDirectionLabel(trade: JournalTrade): string {
  return `${trade.marketRegime || "Unknown"} ${trade.bias}`;
}

function regimeAllowsTrade(filter: RegimeFilter | undefined, bias: Exclude<Bias, "Neutral">, regime: MarketRegime): boolean {
  const mode = filter || "Off";
  if (mode === "Off") return true;
  if (mode === "BlockLongBear") {
    if (bias === "Long" && (regime === "Bear" || regime === "Panic")) return false;
    return true;
  }
  if (mode === "LongBullOnly") return bias === "Long" && regime === "Bull";
  if (mode === "ShortBearOnly") return bias === "Short" && regime === "Bear";
  if (mode === "LongBullShortBear") {
    if (bias === "Long") return regime === "Bull";
    if (bias === "Short") return regime === "Bear";
  }
  return true;
}

function setupTypeAllowsTrade(filter: SetupTypeFilter | undefined, setupType: string): boolean {
  const mode = filter || "All";
  const label = (setupType || "").toLowerCase();
  const isLong = label.startsWith("long");
  const isShort = label.startsWith("short");
  const isContinuation = label.includes("continuation");
  const isPullback = label.includes("pullback") || label.includes("reclaim") || label.includes("reject");
  const isBreakout = label.includes("breakout") || label.includes("breakdown");
  const isChase = label.includes("chase") || label.includes("extended");
  const isShortPullbackReject = isShort && label.includes("pullback/reject");
  const isShortRallyRejection = isShort && label.includes("rally rejection");
  if (mode === "All") return true;
  if (mode === "Continuation") return isContinuation;
  if (mode === "Pullback") return isPullback;
  if (mode === "ContinuationPullback") return isContinuation || isPullback;
  if (mode === "ExcludeBreakoutChase") return !isBreakout && !isChase;
  if (mode === "Breakout") return isBreakout;
  if (mode === "Chase") return isChase;
  if (mode === "LongContinuation") return isLong && isContinuation;
  if (mode === "LongPullback") return isLong && isPullback;
  if (mode === "LongContinuationPullback") return isLong && (isContinuation || isPullback);
  if (mode === "ShortPullbackReject") return isShortPullbackReject;
  if (mode === "ShortRallyRejection") return isShortRallyRejection;
  if (mode === "ShortContinuation") return isShort && isContinuation;
  if (mode === "AdaptiveBest") return (isLong && (isContinuation || isPullback)) || isShortPullbackReject;
  return true;
}

function strategyEngineAllowsTrade(engine: StrategyEngine | undefined, grade: GradeResult, symbolContext?: SymbolPersonalityContext): boolean {
  const mode = engine || "Manual";
  if (mode === "Manual") return true;

  // Keeps the current long edge but stops buying into confirmed bear/panic regimes.
  if (mode === "DefensiveLong") {
    return grade.bias === "Long" && grade.marketRegime !== "Bear" && grade.marketRegime !== "Panic";
  }

  // v3.2 adaptive engine: use the proven long continuation/pullback edge in bull/neutral regimes,
  // use only the short pullback/reject shape in bear regimes, and stay cash in panic.
  if (mode === "AdaptiveRegime") {
    const setup = (grade.setupType || "").toLowerCase();
    if (grade.marketRegime === "Bull" || grade.marketRegime === "Neutral") {
      return grade.bias === "Long" && (setup.includes("continuation") || setup.includes("pullback") || setup.includes("reclaim"));
    }
    if (grade.marketRegime === "Bear") {
      return grade.bias === "Short" && setup.includes("pullback/reject");
    }
    return false;
  }

  // v3.3 universal adaptive engine. This is intentionally more selective than v3.2.
  // It tries to behave like one simple system across strong stocks, weak stocks, and chop:
  // - Strong/bull: long continuation or long pullback/reclaim.
  // - Neutral/choppy: mostly cash; only very high-quality pullback setups are allowed.
  // - Bear/weak: short pullback/reject only; no breakdown chasing or rally-rejection guessing.
  // - Panic/oversold: cash.
  if (mode === "UniversalAdaptive") {
    const setup = (grade.setupType || "").toLowerCase();
    const isLongContinuation = grade.bias === "Long" && setup.includes("continuation");
    const isLongPullback = grade.bias === "Long" && (setup.includes("pullback") || setup.includes("reclaim"));
    const isShortPullbackReject = grade.bias === "Short" && setup.includes("pullback/reject");
    const volumeOk = grade.diagnostics.volumeRatio >= 0.9;
    const notTooExtended = grade.diagnostics.extensionAtr <= 1.8;
    const veryClean = grade.score >= 85 && volumeOk && notTooExtended;

    if (grade.marketRegime === "Bull") {
      return volumeOk && (isLongContinuation || isLongPullback);
    }
    if (grade.marketRegime === "Neutral") {
      return veryClean && isLongPullback;
    }
    if (grade.marketRegime === "Bear") {
      return grade.score >= 80 && volumeOk && notTooExtended && isShortPullbackReject;
    }
    return false;
  }

  // v3.5 Universal Adaptive Pro. This keeps one simple preset, but reacts more intelligently:
  // - Bull/leader regimes: favor long continuation + pullback and allow a little more extension so monster leaders are not under-traded.
  // - Neutral/chop: mostly cash; neutral has been a big source of losses on weak names.
  // - Bear/laggard: only short pullback/reject, and only when the bear trend is strong enough.
  // - Panic/oversold: cash; do not chase late shorts.
  if (mode === "UniversalAdaptivePro") {
    const setup = (grade.setupType || "").toLowerCase();
    const isLongContinuation = grade.bias === "Long" && setup.includes("continuation");
    const isLongPullback = grade.bias === "Long" && (setup.includes("pullback") || setup.includes("reclaim"));
    const isShortPullbackReject = grade.bias === "Short" && setup.includes("pullback/reject");
    const volumeOk = grade.diagnostics.volumeRatio >= 0.8;
    const strongVolume = grade.diagnostics.volumeRatio >= 1.0;
    const leaderExtensionOk = grade.diagnostics.extensionAtr <= 2.2;
    const normalExtensionOk = grade.diagnostics.extensionAtr <= 1.8;
    const bearTrendStrong = grade.diagnostics.regimeScore <= -2.2 || grade.diagnostics.trendSlopeAtr <= -0.25;
    const notOversoldShort = grade.diagnostics.rsi >= 32;

    if (grade.marketRegime === "Bull") {
      return volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
    }
    if (grade.marketRegime === "Neutral") {
      return grade.score >= 90 && strongVolume && normalExtensionOk && isLongPullback;
    }
    if (grade.marketRegime === "Bear") {
      return grade.score >= 80 && strongVolume && normalExtensionOk && bearTrendStrong && notOversoldShort && isShortPullbackReject;
    }
    return false;
  }

  // v3.6 Universal Adaptive Pro v2. The key difference from v3.5 is stock
  // personality control: leaders are not shorted just because a local bear
  // regime appears, weak/laggard names can use bear pullback shorts, and neutral
  // chop is mostly cash. This is meant to be one universal preset across a basket.
  if (mode === "UniversalAdaptiveProV2") {
    const setup = (grade.setupType || "").toLowerCase();
    const isLongContinuation = grade.bias === "Long" && setup.includes("continuation");
    const isLongPullback = grade.bias === "Long" && (setup.includes("pullback") || setup.includes("reclaim"));
    const isShortPullbackReject = grade.bias === "Short" && setup.includes("pullback/reject");
    const strength = grade.diagnostics.assetStrength || 0;
    const isLeader = strength >= 1.15;
    const isExplosiveLeader = strength >= 2.35;
    const isLaggard = strength <= -0.85;
    const isChoppy = Math.abs(strength) < 0.55;
    const volumeOk = grade.diagnostics.volumeRatio >= 0.8;
    const strongVolume = grade.diagnostics.volumeRatio >= 1.0;
    const leaderExtensionOk = grade.diagnostics.extensionAtr <= (isExplosiveLeader ? 2.8 : 2.35);
    const normalExtensionOk = grade.diagnostics.extensionAtr <= 1.8;
    const bearTrendStrong = grade.diagnostics.regimeScore <= -2.0 || grade.diagnostics.trendSlopeAtr <= -0.22 || isLaggard;
    const notOversoldShort = grade.diagnostics.rsi >= 32;

    if (grade.marketRegime === "Bull") {
      // Leaders get long continuation + pullback. Laggards only get clean pullbacks.
      if (isLaggard) return grade.score >= 75 && strongVolume && normalExtensionOk && isLongPullback;
      return volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
    }

    if (grade.marketRegime === "Neutral") {
      // Neutral was a major failure source. Let only very clean leader pullbacks through.
      if (isLeader) return grade.score >= 88 && strongVolume && normalExtensionOk && isLongPullback;
      if (isChoppy) return false;
      return grade.score >= 92 && strongVolume && normalExtensionOk && isLongPullback;
    }

    if (grade.marketRegime === "Bear") {
      // Do not short leaders/uptrend names. This was the biggest SPY/QQQ/AAPL drag.
      if (isLeader) return false;
      return grade.score >= 80 && strongVolume && normalExtensionOk && bearTrendStrong && notOversoldShort && isShortPullbackReject;
    }

    return false;
  }


  // v3.7 Universal Adaptive Pro v3. This uses broad stock personality from the full loaded
  // historical window in addition to the local signal. It is stricter about shorting leader
  // and index-like names, but still allows laggard shorts and explosive leader longs.
  if (mode === "UniversalAdaptiveProV3") {
    const setup = (grade.setupType || "").toLowerCase();
    const isLongContinuation = grade.bias === "Long" && setup.includes("continuation");
    const isLongPullback = grade.bias === "Long" && (setup.includes("pullback") || setup.includes("reclaim"));
    const isShortPullbackReject = grade.bias === "Short" && setup.includes("pullback/reject");
    const ctx = symbolContext || emptySymbolPersonalityContext();
    const localStrength = grade.diagnostics.assetStrength || 0;
    const volumeOk = grade.diagnostics.volumeRatio >= 0.8;
    const strongVolume = grade.diagnostics.volumeRatio >= 1.0;
    const veryStrongVolume = grade.diagnostics.volumeRatio >= 1.15;
    const leaderExtensionOk = grade.diagnostics.extensionAtr <= (ctx.isExplosiveLeader ? 3.2 : 2.6);
    const normalExtensionOk = grade.diagnostics.extensionAtr <= 1.8;
    const tightShortExtensionOk = grade.diagnostics.extensionAtr <= 1.35;
    const notOversoldShort = grade.diagnostics.rsi >= 34;
    const strongBearBreakdown = grade.diagnostics.regimeScore <= -3.1 || grade.diagnostics.trendSlopeAtr <= -0.32;
    const weakBearTrend = grade.diagnostics.regimeScore <= -2.0 || grade.diagnostics.trendSlopeAtr <= -0.2 || ctx.isLaggard;

    if (grade.marketRegime === "Bull") {
      if (ctx.isWeak && !ctx.isLeader) return grade.score >= 80 && strongVolume && normalExtensionOk && isLongPullback;
      if (ctx.isExplosiveLeader) return grade.score >= 60 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isLeader) return grade.score >= 60 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      return grade.score >= 72 && strongVolume && normalExtensionOk && isLongPullback;
    }

    if (grade.marketRegime === "Neutral") {
      if (ctx.isExplosiveLeader && localStrength >= 1.5) return grade.score >= 86 && strongVolume && normalExtensionOk && isLongPullback;
      if (ctx.isLeader && localStrength >= 1.2) return grade.score >= 90 && strongVolume && normalExtensionOk && isLongPullback;
      return false;
    }

    if (grade.marketRegime === "Bear") {
      // Strong long-bias stocks usually do better by going cash during bear pullbacks.
      // Short only when the breakdown is truly strong and clean.
      if (ctx.isExplosiveLeader) return false;
      if (ctx.isLeader) {
        return grade.score >= 94 && veryStrongVolume && tightShortExtensionOk && strongBearBreakdown && notOversoldShort && isShortPullbackReject;
      }
      if (ctx.isWeak || ctx.isLaggard) {
        return grade.score >= 78 && strongVolume && normalExtensionOk && weakBearTrend && notOversoldShort && isShortPullbackReject;
      }
      return grade.score >= 88 && veryStrongVolume && tightShortExtensionOk && strongBearBreakdown && notOversoldShort && isShortPullbackReject;
    }

    return false;
  }


  // v3.8 Universal Adaptive Pro v4. This is the most "one-system" version so far:
  // - Explosive leaders and leaders are long-or-cash only. Shorts on leaders were the biggest drag.
  // - Choppy symbols trade less and require clean pullbacks.
  // - Weak/laggard symbols can short only the setup that proved useful: short pullback/reject.
  // - Neutral regimes are mostly cash unless a leader pullback is very clean.
  if (mode === "UniversalAdaptiveProV4") {
    const setup = (grade.setupType || "").toLowerCase();
    const isLongContinuation = grade.bias === "Long" && setup.includes("continuation");
    const isLongPullback = grade.bias === "Long" && (setup.includes("pullback") || setup.includes("reclaim"));
    const isShortPullbackReject = grade.bias === "Short" && setup.includes("pullback/reject");
    const ctx = symbolContext || emptySymbolPersonalityContext();
    const localStrength = grade.diagnostics.assetStrength || 0;
    const volumeOk = grade.diagnostics.volumeRatio >= 0.8;
    const strongVolume = grade.diagnostics.volumeRatio >= 1.0;
    const veryStrongVolume = grade.diagnostics.volumeRatio >= 1.2;
    const leaderExtensionOk = grade.diagnostics.extensionAtr <= (ctx.isExplosiveLeader ? 3.4 : 2.65);
    const normalExtensionOk = grade.diagnostics.extensionAtr <= 1.75;
    const choppyExtensionOk = grade.diagnostics.extensionAtr <= 1.15;
    const shortExtensionOk = grade.diagnostics.extensionAtr <= 1.25;
    const notOversoldShort = grade.diagnostics.rsi >= 35;
    const strongBearBreakdown = grade.diagnostics.regimeScore <= -3.25 || grade.diagnostics.trendSlopeAtr <= -0.35;
    const weakBearTrend = grade.diagnostics.regimeScore <= -2.05 || grade.diagnostics.trendSlopeAtr <= -0.22 || ctx.isLaggard;

    if (grade.marketRegime === "Bull") {
      if (ctx.isExplosiveLeader) return grade.score >= 58 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isLeader) return grade.score >= 60 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isChoppy) return grade.score >= 82 && strongVolume && choppyExtensionOk && isLongPullback;
      if (ctx.isWeak || ctx.isLaggard) return grade.score >= 82 && strongVolume && normalExtensionOk && isLongPullback;
      return grade.score >= 72 && strongVolume && normalExtensionOk && isLongPullback;
    }

    if (grade.marketRegime === "Neutral") {
      if (ctx.isExplosiveLeader && localStrength >= 1.35) return grade.score >= 82 && strongVolume && normalExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isLeader && localStrength >= 1.15) return grade.score >= 88 && strongVolume && normalExtensionOk && isLongPullback;
      return false;
    }

    if (grade.marketRegime === "Bear") {
      // The validator repeatedly showed SPY/QQQ/IWM/AAPL shorts dragging performance.
      // Leaders now go cash in bear mode instead of fighting their long-term bias.
      if (ctx.isExplosiveLeader || ctx.isLeader) return false;
      if (ctx.isWeak || ctx.isLaggard) {
        return grade.score >= 78 && strongVolume && shortExtensionOk && weakBearTrend && notOversoldShort && isShortPullbackReject;
      }
      return grade.score >= 92 && veryStrongVolume && shortExtensionOk && strongBearBreakdown && notOversoldShort && isShortPullbackReject;
    }

    return false;
  }



  // v4.0 Realistic Adaptive engine: v3.8 base plus cash-first failure overlay.
  // Healthy leaders are long/cash; failed leaders go cash first. Shorts require very clean evidence.
  if (mode === "UniversalAdaptiveProV6") {
    const setup = (grade.setupType || "").toLowerCase();
    const isLongContinuation = grade.bias === "Long" && setup.includes("continuation");
    const isLongPullback = grade.bias === "Long" && (setup.includes("pullback") || setup.includes("reclaim"));
    const isShortPullbackReject = grade.bias === "Short" && setup.includes("pullback/reject");
    const ctx = symbolContext || emptySymbolPersonalityContext();
    const localStrength = grade.diagnostics.assetStrength || 0;
    const volumeOk = grade.diagnostics.volumeRatio >= 0.8;
    const strongVolume = grade.diagnostics.volumeRatio >= 1.0;
    const veryStrongVolume = grade.diagnostics.volumeRatio >= 1.25;
    const leaderExtensionOk = grade.diagnostics.extensionAtr <= (ctx.isExplosiveLeader ? 3.5 : 2.65);
    const normalExtensionOk = grade.diagnostics.extensionAtr <= 1.7;
    const choppyExtensionOk = grade.diagnostics.extensionAtr <= 1.05;
    const shortExtensionOk = grade.diagnostics.extensionAtr <= 1.15;
    const notOversoldShort = grade.diagnostics.rsi >= 38 && grade.diagnostics.rsi <= 62;
    const confirmedBearPressure = grade.diagnostics.regimeScore <= -3.1 || grade.diagnostics.trendSlopeAtr <= -0.34;

    if (grade.marketRegime === "Bull") {
      if (ctx.isFailedLeader || ctx.isBearTransition) return ctx.isBullRecovery && grade.score >= 86 && strongVolume && normalExtensionOk && isLongPullback;
      if (ctx.isExplosiveLeader) return grade.score >= 58 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isLeader) return grade.score >= 60 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isBullRecovery) return grade.score >= 78 && strongVolume && normalExtensionOk && isLongPullback;
      if (ctx.isChoppy) return grade.score >= 88 && strongVolume && choppyExtensionOk && isLongPullback;
      if (ctx.isWeak || ctx.isLaggard) return grade.score >= 84 && strongVolume && normalExtensionOk && isLongPullback && localStrength > 0.75;
      return grade.score >= 76 && strongVolume && normalExtensionOk && isLongPullback;
    }

    if (grade.marketRegime === "Neutral") {
      if (ctx.isFailedLeader || ctx.isBearTransition || ctx.isChoppy || ctx.isWeak || ctx.isLaggard) return false;
      if (ctx.isExplosiveLeader && localStrength >= 1.35) return grade.score >= 84 && strongVolume && normalExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isLeader && localStrength >= 1.25) return grade.score >= 90 && strongVolume && normalExtensionOk && isLongPullback;
      return false;
    }

    if (grade.marketRegime === "Bear") {
      // Cash first: leaders and early breakdowns do not short by default.
      if ((ctx.isExplosiveLeader || ctx.isLeader) && !ctx.isFailedLeader) return false;
      if (ctx.isFailedLeader) return grade.score >= 94 && veryStrongVolume && shortExtensionOk && notOversoldShort && confirmedBearPressure && isShortPullbackReject;
      if (ctx.isBearTransition) return grade.score >= 96 && veryStrongVolume && shortExtensionOk && notOversoldShort && confirmedBearPressure && isShortPullbackReject;
      if (ctx.isWeak || ctx.isLaggard) return grade.score >= 80 && strongVolume && shortExtensionOk && notOversoldShort && isShortPullbackReject;
      return grade.score >= 94 && veryStrongVolume && shortExtensionOk && notOversoldShort && confirmedBearPressure && isShortPullbackReject;
    }

    return false;
  }

  // v3.9 Dynamic Market State engine.
  // The main goal is readiness for change: a leader can become a failed leader.
  // Healthy leaders are long-or-cash, failed leaders go cash first and only short after a clean retest/rejection,
  // weak laggards can use short pullback/reject, and choppy names mostly stay cash.
  if (mode === "UniversalAdaptiveProV5") {
    const setup = (grade.setupType || "").toLowerCase();
    const isLongContinuation = grade.bias === "Long" && setup.includes("continuation");
    const isLongPullback = grade.bias === "Long" && (setup.includes("pullback") || setup.includes("reclaim"));
    const isShortPullbackReject = grade.bias === "Short" && setup.includes("pullback/reject");
    const ctx = symbolContext || emptySymbolPersonalityContext();
    const localStrength = grade.diagnostics.assetStrength || 0;
    const volumeOk = grade.diagnostics.volumeRatio >= 0.8;
    const strongVolume = grade.diagnostics.volumeRatio >= 1.0;
    const veryStrongVolume = grade.diagnostics.volumeRatio >= 1.15;
    const leaderExtensionOk = grade.diagnostics.extensionAtr <= (ctx.isExplosiveLeader ? 3.4 : 2.65);
    const normalExtensionOk = grade.diagnostics.extensionAtr <= 1.75;
    const choppyExtensionOk = grade.diagnostics.extensionAtr <= 1.05;
    const shortExtensionOk = grade.diagnostics.extensionAtr <= 1.28;
    const notOversoldShort = grade.diagnostics.rsi >= 34 && grade.diagnostics.rsi <= 64;
    const confirmedBearPressure = grade.diagnostics.regimeScore <= -2.65 || grade.diagnostics.trendSlopeAtr <= -0.28;
    const strongBearBreakdown = grade.diagnostics.regimeScore <= -3.25 || grade.diagnostics.trendSlopeAtr <= -0.36;
    const cleanShortRetest = strongVolume && shortExtensionOk && notOversoldShort && isShortPullbackReject;

    if (grade.marketRegime === "Bull") {
      if (ctx.isFailedLeader || ctx.isBearTransition) {
        // Do not immediately buy the first bounce in a broken former leader. Wait for recovery evidence.
        return ctx.isBullRecovery && grade.score >= 82 && strongVolume && normalExtensionOk && isLongPullback;
      }
      if (ctx.isExplosiveLeader) return grade.score >= 58 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isLeader) return grade.score >= 60 && volumeOk && leaderExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isBullRecovery) return grade.score >= 78 && strongVolume && normalExtensionOk && isLongPullback;
      if (ctx.isChoppy) return grade.score >= 86 && strongVolume && choppyExtensionOk && isLongPullback;
      if (ctx.isWeak || ctx.isLaggard) return grade.score >= 84 && strongVolume && normalExtensionOk && isLongPullback && localStrength > 0.6;
      return grade.score >= 74 && strongVolume && normalExtensionOk && isLongPullback;
    }

    if (grade.marketRegime === "Neutral") {
      if (ctx.isFailedLeader || ctx.isBearTransition) return false;
      if (ctx.isExplosiveLeader && localStrength >= 1.35) return grade.score >= 82 && strongVolume && normalExtensionOk && (isLongContinuation || isLongPullback);
      if (ctx.isLeader && localStrength >= 1.15) return grade.score >= 88 && strongVolume && normalExtensionOk && isLongPullback;
      if (ctx.isBullRecovery) return grade.score >= 88 && veryStrongVolume && choppyExtensionOk && isLongPullback;
      return false;
    }

    if (grade.marketRegime === "Bear") {
      // Healthy leaders should not be shorted just because of a normal pullback.
      // Failed leaders are different: after breakdown evidence, allow only clean pullback/reject shorts.
      if (ctx.isExplosiveLeader && !ctx.isFailedLeader) return false;
      if (ctx.isLeader && !ctx.isFailedLeader && !ctx.isBearTransition) return false;
      if (ctx.isFailedLeader) {
        return grade.score >= 82 && cleanShortRetest && (confirmedBearPressure || ctx.drawdownFromHighPct <= -22);
      }
      if (ctx.isBearTransition) {
        return grade.score >= 88 && veryStrongVolume && shortExtensionOk && strongBearBreakdown && notOversoldShort && isShortPullbackReject;
      }
      if (ctx.isWeak || ctx.isLaggard) {
        return grade.score >= 78 && cleanShortRetest && (confirmedBearPressure || ctx.isLaggard);
      }
      return grade.score >= 92 && veryStrongVolume && shortExtensionOk && strongBearBreakdown && notOversoldShort && isShortPullbackReject;
    }

    return false;
  }


  // Flexible dual engine kept for comparison: long in bull/neutral regimes, any qualifying short in bear regimes, cash in panic.
  if (mode === "BullNeutralLongBearShort") {
    if (grade.marketRegime === "Bull" || grade.marketRegime === "Neutral") return grade.bias === "Long";
    if (grade.marketRegime === "Bear") return grade.bias === "Short";
    return false;
  }

  // Stricter dual engine: longs only in bull, shorts only in bear, cash in neutral/panic.
  if (mode === "BullLongBearShortCashNeutral") {
    if (grade.marketRegime === "Bull") return grade.bias === "Long";
    if (grade.marketRegime === "Bear") return grade.bias === "Short";
    return false;
  }

  if (mode === "BearShortOnly") return grade.bias === "Short" && grade.marketRegime === "Bear";
  return true;
}

function tradeOpenAt(trade: JournalTrade, timeMs: number): boolean {
  const start = new Date(trade.signalTime).getTime();
  const end = new Date(trade.resolvedAt || trade.signalTime).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start < timeMs && end > timeMs;
}

function perTradeRiskPct(settings: BacktestSettings): number {
  const ps = normalizePortfolioSettings(settings.portfolioSettings);
  if (ps.riskModel === "Percent") return Math.max(0, ps.riskPercent);
  return ps.startingBalance > 0 ? Math.max(0, (ps.fixedRiskDollars / ps.startingBalance) * 100) : 0;
}

function applyTradeCosts(trade: JournalTrade, settings: BacktestSettings): JournalTrade {
  const raw = trade.resultR ?? 0;
  const cost = Math.max(0, Number(settings.slippageR || 0)) + Math.max(0, Number(settings.commissionR || 0));
  if (!cost || trade.status === "Ambiguous") return trade;
  return { ...trade, resultR: round(raw - cost, 2), note: `${trade.note || ""}${cost ? ` Cost adjustment: -${round(cost, 2)}R for slippage/commission.` : ""}`.trim() };
}

function countHigherLows(candles: Candle[]): number {
  let count = 0;
  for (let i = 1; i < candles.length; i += 1) if (candles[i].low > candles[i - 1].low) count += 1;
  return count;
}

function countLowerHighs(candles: Candle[]): number {
  let count = 0;
  for (let i = 1; i < candles.length; i += 1) if (candles[i].high < candles[i - 1].high) count += 1;
  return count;
}

function scoreLocation(params: {
  bias: Exclude<Bias, "Neutral">;
  close: number;
  midSma: number;
  recentHigh: number;
  recentLow: number;
  atrValue: number;
  reclaimLong: boolean;
  rejectShort: boolean;
  breakoutLong: boolean;
  breakdownShort: boolean;
}): { score: number; pullbackQuality: number; extensionAtr: number } {
  const { bias, close, midSma, recentHigh, recentLow, atrValue, reclaimLong, rejectShort, breakoutLong, breakdownShort } = params;
  const extensionAtr = bias === "Long" ? (close - midSma) / Math.max(atrValue, 0.000001) : (midSma - close) / Math.max(atrValue, 0.000001);
  let score = 8;

  if (bias === "Long") {
    const aboveLowAtr = (close - recentLow) / Math.max(atrValue, 0.000001);
    if (reclaimLong) score += 10;
    if (breakoutLong && extensionAtr <= 1.4) score += 8;
    if (extensionAtr >= -0.2 && extensionAtr <= 1.2) score += 8;
    if (aboveLowAtr >= 0.8 && aboveLowAtr <= 3.5) score += 4;
    if (extensionAtr > 1.8) score -= 10;
    if (extensionAtr > 2.5) score -= 18;
  } else {
    const belowHighAtr = (recentHigh - close) / Math.max(atrValue, 0.000001);
    if (rejectShort) score += 10;
    if (breakdownShort && extensionAtr <= 1.4) score += 8;
    if (extensionAtr >= -0.2 && extensionAtr <= 1.2) score += 8;
    if (belowHighAtr >= 0.8 && belowHighAtr <= 3.5) score += 4;
    if (extensionAtr > 1.8) score -= 10;
    if (extensionAtr > 2.5) score -= 18;
  }

  return { score: clamp(Math.round(score), 0, 22), pullbackQuality: score, extensionAtr };
}

export function gradeSetup(candles: Candle[], timeframe: Timeframe = "15Min", now = new Date(), targetSettingsInput?: Partial<TargetSettings>, gradeSettingsInput?: Partial<GradeSettings>): GradeResult | null {
  if (candles.length < 50) return null;

  const clean = candles
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (clean.length < 50) return null;

  const targetSettings = normalizeTargetSettings(targetSettingsInput);
  const gradeSettings = normalizeGradeSettings(gradeSettingsInput);
  const latest = clean[clean.length - 1];
  const prev = clean[clean.length - 2];
  const close = latest.close;
  const shortSma = sma(clean, 9);
  const midSma = sma(clean, 20);
  const longSma = sma(clean, 50);
  const atrValue = atr(clean, 14) || close * 0.002;
  const range = avgRange(clean, 14) || atrValue;
  const rsiValue = rsi(clean, 14);
  const recentVolume = latest.volume || 0;
  const normalVolume = avgVolume(clean.slice(0, -1), 20) || recentVolume || 1;
  const volumeRatio = recentVolume / normalVolume;
  const lookback = Math.min(20, clean.length - 1);
  const prior = clean.slice(0, -1);
  const recentHigh = highestHigh(prior, lookback);
  const recentLow = lowestLow(prior, lookback);
  const recentSwing = clean.slice(-8);
  const regimeInfo = detectMarketRegime(clean);

  const priorMidSma = sma(clean.slice(0, -8), 20);
  const trendSlope = midSma - priorMidSma;
  const trendSlopeAtr = trendSlope / Math.max(atrValue, 0.000001);

  // v3.6 stock-personality context. This is deliberately slower-moving than the
  // candle setup score so the universal engine can treat leaders, laggards, and
  // choppy symbols differently without making the user pick separate settings.
  const anchorClose = (barsBack: number) => clean[Math.max(0, clean.length - 1 - Math.min(barsBack, clean.length - 1))]?.close || close;
  const ret100Pct = ((close / Math.max(anchorClose(100), 0.000001)) - 1) * 100;
  const ret400Pct = ((close / Math.max(anchorClose(400), 0.000001)) - 1) * 100;
  const personalitySma200 = sma(clean, Math.min(200, clean.length));
  const personalitySma400 = sma(clean, Math.min(400, clean.length));
  const aboveLongStack = close > personalitySma200 && personalitySma200 >= personalitySma400 * 0.995;
  const belowLongStack = close < personalitySma200 && personalitySma200 <= personalitySma400 * 1.005;
  const assetStrengthRaw =
    (aboveLongStack ? 1.25 : belowLongStack ? -1.25 : 0) +
    clamp(ret100Pct / 8, -1.25, 1.25) +
    clamp(ret400Pct / 18, -1.75, 1.75) +
    clamp(trendSlopeAtr / 0.35, -1.25, 1.25) +
    (rsiValue > 56 ? 0.35 : rsiValue < 44 ? -0.35 : 0);
  const assetStrength = round(assetStrengthRaw, 2);
  const assetTrendPct = round(ret400Pct, 2);

  const bullishTrend = close > midSma && midSma >= longSma * 0.998 && trendSlopeAtr > -0.08;
  const bearishTrend = close < midSma && midSma <= longSma * 1.002 && trendSlopeAtr < 0.08;

  const momentum5 = close - clean[clean.length - 6].close;
  const momentumAtr = momentum5 / Math.max(atrValue, 0.000001);
  const bullishMomentum = momentumAtr > 0.15 && close >= prev.close;
  const bearishMomentum = momentumAtr < -0.15 && close <= prev.close;

  const breakoutLong = close > recentHigh;
  const breakdownShort = close < recentLow;
  const reclaimLong = prev.close < midSma && close > midSma;
  const rejectShort = prev.close > midSma && close < midSma;
  const higherLowStructure = countHigherLows(recentSwing) >= 4;
  const lowerHighStructure = countLowerHighs(recentSwing) >= 4;

  // v3.2 bear engine: shorts should not simply chase red candles.
  // The preferred bear setup is a rally into resistance that fails, while the broader regime is bearish.
  const downsideExtensionAtr = (midSma - close) / Math.max(atrValue, 0.000001);
  const testedBearResistance = latest.high >= midSma - atrValue * 0.35 || latest.high >= shortSma - atrValue * 0.2;
  const failedRallyShort = close < shortSma && latest.high >= shortSma - atrValue * 0.15 && close <= prev.close;
  const cleanBearRallyRejection = regimeInfo.regime === "Bear" && bearishTrend && testedBearResistance && (rejectShort || failedRallyShort || lowerHighStructure) && rsiValue >= 32 && rsiValue <= 62 && downsideExtensionAtr <= 1.45;

  let longLean = 0;
  if (bullishTrend) longLean += 3;
  if (bullishMomentum) longLean += 2;
  if (breakoutLong || reclaimLong) longLean += 2;
  if (close > shortSma) longLean += 1;
  if (higherLowStructure) longLean += 1;
  if (regimeInfo.regime === "Bear" || regimeInfo.regime === "Panic") longLean -= 2;
  if (rsiValue > 82) longLean -= 3;

  let shortLean = 0;
  if (bearishTrend) shortLean += 3;
  if (bearishMomentum) shortLean += 2;
  if (breakdownShort || rejectShort) shortLean += 2;
  if (close < shortSma) shortLean += 1;
  if (lowerHighStructure) shortLean += 1;
  if (regimeInfo.regime === "Bear") shortLean += 2;
  if (cleanBearRallyRejection) shortLean += 1;
  if (regimeInfo.regime === "Bull") shortLean -= 2;
  if (rsiValue < 28) shortLean -= 2;
  if (rsiValue < 18) shortLean -= 3;

  let bias: Bias = "Neutral";
  if (longLean >= 4 && longLean >= shortLean + 2) bias = "Long";
  if (shortLean >= 4 && shortLean >= longLean + 2) bias = "Short";

  const candleBody = Math.abs(latest.close - latest.open);
  const candleRange = Math.max(0.000001, latest.high - latest.low);
  const bodyStrength = candleBody / candleRange;
  const upperWick = latest.high - Math.max(latest.open, latest.close);
  const lowerWick = Math.min(latest.open, latest.close) - latest.low;
  const choppiness = atrValue / Math.max(0.000001, close) * 100;

  let entry = close;
  let stop = close;
  let target = close;
  let targetDescription = "No trade target because bias is neutral.";
  const structureCandles = clean.slice(0, -1).slice(-100);

  if (bias === "Long") {
    const structureStop = Math.min(recentLow, midSma - atrValue * 0.35);
    stop = Math.min(structureStop, close - atrValue * 0.75);
    const riskValue = Math.max(close - stop, close * 0.001);
    const targetResult = calculateTarget({ bias: "Long", entry, risk: riskValue, structureCandles, avgRangeValue: atrValue, settings: targetSettings });
    target = targetResult.target;
    targetDescription = targetResult.description;
  } else if (bias === "Short") {
    const structureStop = Math.max(recentHigh, midSma + atrValue * 0.35);
    stop = Math.max(structureStop, close + atrValue * 0.75);
    const riskValue = Math.max(stop - close, close * 0.001);
    const targetResult = calculateTarget({ bias: "Short", entry, risk: riskValue, structureCandles, avgRangeValue: atrValue, settings: targetSettings });
    target = targetResult.target;
    targetDescription = targetResult.description;
  } else {
    stop = close - atrValue;
    target = close + atrValue;
  }

  const risk = bias === "Long" ? Math.max(entry - stop, 0.000001) : bias === "Short" ? Math.max(stop - entry, 0.000001) : atrValue;
  const reward = bias === "Long" ? Math.max(target - entry, 0) : bias === "Short" ? Math.max(entry - target, 0) : 0;
  const rr = reward / risk;

  const trendScore = bias === "Long"
    ? (bullishTrend ? 18 : close > midSma ? 11 : 4)
    : bias === "Short"
      ? (bearishTrend ? 18 : close < midSma ? 11 : 4)
      : 4;

  const momentumScore = bias === "Long"
    ? (momentumAtr > 2.2 ? 8 : bullishMomentum ? 15 : close > prev.close ? 9 : 3)
    : bias === "Short"
      ? (momentumAtr < -2.2 ? 8 : bearishMomentum ? 15 : close < prev.close ? 9 : 3)
      : 4;

  const locationResult = bias === "Neutral" ? { score: 4, pullbackQuality: 0, extensionAtr: 0 } : scoreLocation({
    bias,
    close,
    midSma,
    recentHigh,
    recentLow,
    atrValue,
    reclaimLong,
    rejectShort,
    breakoutLong,
    breakdownShort,
  });

  const cleanLongPullback = bias === "Long" && close > longSma && locationResult.extensionAtr >= -0.35 && locationResult.extensionAtr <= 0.95 && (reclaimLong || latest.low <= midSma + atrValue * 0.35 || higherLowStructure);
  const cleanShortPullback = bias === "Short" && close < longSma && locationResult.extensionAtr >= -0.35 && locationResult.extensionAtr <= 0.95 && (rejectShort || latest.high >= midSma - atrValue * 0.35 || lowerHighStructure);
  const cleanLongBreakout = bias === "Long" && breakoutLong && locationResult.extensionAtr <= 1.35 && volumeRatio >= 0.9 && bodyStrength >= 0.35;
  const cleanShortBreakout = bias === "Short" && breakdownShort && locationResult.extensionAtr <= 1.35 && volumeRatio >= 0.9 && bodyStrength >= 0.35;

  let setupType = "Neutral / no clear setup";
  if (bias === "Long") {
    setupType = cleanLongPullback ? "Long pullback/reclaim" : cleanLongBreakout ? "Long breakout" : locationResult.extensionAtr > 1.35 ? "Long chase/extended" : "Long continuation";
  } else if (bias === "Short") {
    setupType = cleanShortPullback ? "Short pullback/reject" : cleanBearRallyRejection ? "Short rally rejection" : cleanShortBreakout ? "Short breakdown" : locationResult.extensionAtr > 1.35 ? "Short chase/extended" : "Short continuation";
  }

  const volumeScore = volumeRatio >= 1.25 && bodyStrength > 0.35 ? 12 : volumeRatio >= 0.9 ? 8 : volumeRatio >= 0.6 ? 5 : 2;
  const volatilityScore = choppiness < 0.08 ? 4 : choppiness < 0.75 ? 11 : choppiness < 1.35 ? 7 : 3;
  const riskRewardScore = rr >= 2 ? 14 : rr >= 1.5 ? 12 : rr >= 1.2 ? 10 : rr >= 1.0 ? 8 : rr >= 0.75 ? 4 : 1;

  let exhaustionRisk = 0;
  if (bias === "Long") {
    if (rsiValue > 72) exhaustionRisk += 8;
    if (rsiValue > 80) exhaustionRisk += 14;
    if (locationResult.extensionAtr > 1.6) exhaustionRisk += 8;
    if (locationResult.extensionAtr > 2.3) exhaustionRisk += 16;
    if (upperWick / candleRange > 0.45) exhaustionRisk += 6;
  } else if (bias === "Short") {
    if (rsiValue < 28) exhaustionRisk += 8;
    if (rsiValue < 20) exhaustionRisk += 14;
    if (locationResult.extensionAtr > 1.6) exhaustionRisk += 8;
    if (locationResult.extensionAtr > 2.3) exhaustionRisk += 16;
    if (lowerWick / candleRange > 0.45) exhaustionRisk += 6;
  }
  const exhaustionScore = clamp(14 - exhaustionRisk, 0, 14);

  let rawScore = trendScore + momentumScore + locationResult.score + volumeScore + volatilityScore + riskRewardScore + exhaustionScore;

  // v2.2 turns the grade into a tradability score, not just a strength/momentum score.
  // Clean pullbacks/reclaims and controlled breakouts are rewarded. Chasing extended candles is capped hard.
  const isPullbackSetup = setupType.includes("pullback") || setupType.includes("reclaim") || setupType.includes("reject") || setupType.includes("rejection");
  const isBreakoutSetup = setupType.includes("breakout") || setupType.includes("breakdown");
  const isChaseSetup = setupType.includes("chase") || setupType.includes("extended");

  let profileBonus = 0;
  if (gradeSettings.profile === "Pullback") {
    if (isPullbackSetup) profileBonus += 8;
    if (isBreakoutSetup) profileBonus -= 2;
    if (isChaseSetup) profileBonus -= 10;
  } else if (gradeSettings.profile === "Breakout") {
    if (isBreakoutSetup) profileBonus += 7;
    if (isPullbackSetup) profileBonus += 1;
    if (isChaseSetup) profileBonus -= 8;
  } else {
    if (isPullbackSetup || isBreakoutSetup) profileBonus += 4;
    if (isChaseSetup) profileBonus -= 8;
  }

  rawScore += profileBonus;

  // v3.2 bear engine cleanup: testing showed short pullback/reject was the only short setup with promise.
  // Reward that shape and penalize broad rally-rejection/chase shorts unless they prove themselves later.
  if (bias === "Short" && setupType.includes("pullback/reject") && regimeInfo.regime === "Bear") rawScore += 10;
  if (bias === "Short" && setupType.includes("rally rejection")) rawScore -= 4;
  if (bias === "Short" && setupType.includes("breakdown") && locationResult.extensionAtr > 1.0) rawScore -= 6;

  // Regime-aware grading: longs should be easier in bull regimes; shorts must prove themselves in bear regimes.
  if (bias === "Long") {
    if (regimeInfo.regime === "Bull") rawScore += 4;
    if (regimeInfo.regime === "Bear" || regimeInfo.regime === "Panic") rawScore = Math.min(rawScore - 8, 74);
  }
  if (bias === "Short") {
    if (regimeInfo.regime === "Bear") rawScore += 8;
    if (regimeInfo.regime === "Bull") rawScore = Math.min(rawScore - 12, 70);
    if (regimeInfo.regime === "Panic") rawScore = Math.min(rawScore - 10, 68);
    if (rsiValue < 28) rawScore = Math.min(rawScore, 76);
    if (rsiValue < 22) rawScore = Math.min(rawScore, 66);
  }

  if (bias === "Neutral") rawScore = Math.min(rawScore, 48);
  if (rr < 0.75) rawScore = Math.min(rawScore, 58);
  else if (rr < 1.0) rawScore = Math.min(rawScore, 68);

  // Hard caps that make 90+ rare. A high score should mean clean, tradable, and not late.
  if (isChaseSetup) rawScore = Math.min(rawScore, 72);
  if (locationResult.extensionAtr > 1.25 && !isBreakoutSetup) rawScore = Math.min(rawScore, 76);
  if (locationResult.extensionAtr > 1.7) rawScore = Math.min(rawScore, 68);
  if (locationResult.extensionAtr > 2.3) rawScore = Math.min(rawScore, 58);

  if (bias === "Long" && rsiValue > 70 && !isPullbackSetup) rawScore = Math.min(rawScore, 78);
  if (bias === "Long" && rsiValue > 76) rawScore = Math.min(rawScore, 70);
  if (bias === "Short" && rsiValue < 30 && !isPullbackSetup) rawScore = Math.min(rawScore, 78);
  if (bias === "Short" && rsiValue < 24) rawScore = Math.min(rawScore, 70);

  if (bodyStrength < 0.22) rawScore = Math.min(rawScore - 4, 72);
  if (recentVolume === 0) rawScore -= 3;

  // Reserve elite scores for clean setup shapes with acceptable reward and no serious exhaustion.
  if (rawScore >= 90 && !(isPullbackSetup || isBreakoutSetup)) rawScore = 84;
  if (rawScore >= 90 && (rr < 1.2 || exhaustionRisk >= 10 || locationResult.extensionAtr > 1.15)) rawScore = 86;

  const latestTime = new Date(latest.time);
  const staleMinutes = Number.isFinite(latestTime.getTime()) ? Math.max(0, (now.getTime() - latestTime.getTime()) / 60000) : 9999;

  const reasons: string[] = [];
  const warnings: string[] = [];

  reasons.push(`v3.6 profile: ${gradeSettings.profile}; detected setup: ${setupType}.`);
  reasons.push(`Market regime: ${regimeInfo.regime}. ${regimeInfo.reasons[0] || "Regime filter is neutral."}`);

  if (bias === "Long") {
    if (bullishTrend) reasons.push("Trend is bullish, but the v2.2 score mainly rewards tradable location, not just strength.");
    if (bullishMomentum) reasons.push("Momentum is positive without being automatically treated as a perfect setup.");
    if (reclaimLong) reasons.push("Price reclaimed the 20-period average, which is usually a cleaner location than chasing far above it.");
    if (breakoutLong && locationResult.extensionAtr <= 1.6) reasons.push("Price broke resistance without being too stretched from the average.");
  } else if (bias === "Short") {
    if (bearishTrend) reasons.push("Trend is bearish, but the v2.2 score mainly rewards tradable location, not just strength.");
    if (bearishMomentum) reasons.push("Momentum is negative without being automatically treated as a perfect setup.");
    if (cleanShortPullback) reasons.push("Bear engine: price pulled back into resistance and rejected without being too oversold.");
    if (cleanBearRallyRejection) reasons.push("Bear engine watchlist: price rejected a rally, but this setup is treated more cautiously in v3.3.");
    if (rejectShort) reasons.push("Price rejected the 20-period average, which is usually a cleaner location than chasing far below it.");
    if (breakdownShort && locationResult.extensionAtr <= 1.6) reasons.push("Price broke support without being too stretched from the average.");
  } else {
    reasons.push("No clean long or short bias was found.");
  }

  if (volumeRatio >= 1.25) reasons.push(`Volume confirmation is decent at ${round(volumeRatio, 2)}x recent average.`);
  if (rr >= 1) reasons.push(`Risk/reward is acceptable at about ${round(rr, 2)}R.`);
  if (bias !== "Neutral") reasons.push(targetDescription);

  if (rr < 1) warnings.push("Risk/reward is below 1.0, so this setup should usually be skipped.");
  if (staleMinutes > TIMEFRAME_MINUTES[timeframe] * 3) warnings.push("Data looks stale for this timeframe.");
  if (bodyStrength < 0.22) warnings.push("Latest candle has a small body, which can mean indecision.");
  if (choppiness > 1.35) warnings.push("Recent candles are wide/choppy compared with price.");
  if (bias === "Long" && rsiValue > 72) warnings.push(`RSI is high at ${round(rsiValue, 1)}, so this may be a chase/late long.`);
  if (bias === "Short" && rsiValue < 28) warnings.push(`RSI is low at ${round(rsiValue, 1)}, so this may be a chase/late short.`);
  if (locationResult.extensionAtr > 1.8) warnings.push(`Entry is ${round(locationResult.extensionAtr, 2)} ATRs away from the 20-period average, which is extended.`);
  if (exhaustionRisk >= 14) warnings.push("Overextension penalty applied; v2.2 prevents late moves from getting elite scores.");
  if (setupType.includes("chase") || setupType.includes("extended")) warnings.push("This looks more like a late/chase entry than a clean setup, so the score was capped.");
  if (gradeSettings.profile === "Pullback" && !(setupType.includes("pullback") || setupType.includes("reclaim") || setupType.includes("reject")) && bias !== "Neutral") warnings.push("Pullback profile is selected, but this candle is not a clean pullback/reclaim/reject setup.");
  if (bias === "Long" && (regimeInfo.regime === "Bear" || regimeInfo.regime === "Panic")) warnings.push("Regime filter warning: long setup appeared during a weak/bearish market regime.");
  if (bias === "Short" && regimeInfo.regime !== "Bear") warnings.push("Regime filter warning: short setup did not occur in a confirmed bear regime.");
  if (regimeInfo.regime === "Panic") warnings.push("Panic/oversold regime: avoid chasing shorts late; cash may be safer.");

  if (reasons.length === 0) reasons.push("The setup is mostly rule-based and does not have strong confirmation.");

  return {
    score: clamp(Math.round(rawScore), 0, 100),
    bias,
    entry: round(entry, 2),
    stop: round(stop, 2),
    target: round(target, 2),
    rr: round(rr, 2),
    risk: round(risk, 4),
    targetMode: targetSettings.mode,
    targetDescription,
    setupType,
    marketRegime: regimeInfo.regime,
    regimeReasons: regimeInfo.reasons,
    gradeProfile: gradeSettings.profile,
    signalTime: latest.time,
    latestClose: round(close, 2),
    latestCandleTime: latest.time,
    staleMinutes: round(staleMinutes, 1),
    reasons,
    warnings,
    diagnostics: {
      rsi: round(rsiValue, 1),
      atr: round(atrValue, 4),
      volumeRatio: round(volumeRatio, 2),
      extensionAtr: round(locationResult.extensionAtr, 2),
      trendSlopeAtr: round(trendSlopeAtr, 2),
      pullbackQuality: round(locationResult.pullbackQuality, 1),
      exhaustionRisk: round(exhaustionRisk, 1),
      tradability: clamp(Math.round(rawScore), 0, 100),
      regimeScore: regimeInfo.score,
      assetStrength,
      assetTrendPct,
    },
    components: {
      trend: trendScore,
      momentum: momentumScore,
      location: locationResult.score,
      volume: volumeScore,
      volatility: volatilityScore,
      riskReward: riskRewardScore,
      exhaustion: exhaustionScore,
    },
  };
}

function easternDateKey(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function resultRAtClose(trade: JournalTrade, close: number): number {
  const risk = trade.bias === "Long" ? trade.entry - trade.stop : trade.stop - trade.entry;
  const r = trade.bias === "Long"
    ? (close - trade.entry) / Math.max(risk, 0.000001)
    : (trade.entry - close) / Math.max(risk, 0.000001);
  return round(r, 2);
}

function timeoutAtClose(trade: JournalTrade, candle: Candle, note: string): JournalTrade {
  return {
    ...trade,
    status: "Timeout",
    resolvedAt: candle.time,
    resultR: resultRAtClose(trade, candle.close),
    note,
  };
}

export function evaluateTradeWithCandles(trade: JournalTrade, candles: Candle[], noOvernight = false): JournalTrade {
  if (trade.status !== "Open") return trade;

  const signalMs = new Date(trade.signalTime).getTime();
  const signalDay = easternDateKey(trade.signalTime);
  const futureCandles = candles
    .filter((c) => new Date(c.time).getTime() > signalMs)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  let lastSameDayCandle: Candle | null = null;

  for (const candle of futureCandles) {
    if (noOvernight && easternDateKey(candle.time) !== signalDay) {
      if (lastSameDayCandle) {
        return timeoutAtClose(trade, lastSameDayCandle, `No overnight hold: closed at ${lastSameDayCandle.close} on ${lastSameDayCandle.time}.`);
      }
      return { ...trade, status: "Timeout", resolvedAt: trade.signalTime, resultR: 0, note: "No overnight hold: signal had no later same-day candle to evaluate." };
    }

    lastSameDayCandle = candle;

    const hitTarget = trade.bias === "Long" ? candle.high >= trade.target : candle.low <= trade.target;
    const hitStop = trade.bias === "Long" ? candle.low <= trade.stop : candle.high >= trade.stop;

    if (hitTarget && hitStop) {
      return { ...trade, status: "Ambiguous", resolvedAt: candle.time, resultR: 0, note: `Both stop and target touched in the same candle at ${candle.time}.` };
    }

    if (hitTarget) {
      return { ...trade, status: "Win", resolvedAt: candle.time, resultR: round(trade.rr, 2), note: `Target hit on ${candle.time}.` };
    }

    if (hitStop) {
      return { ...trade, status: "Loss", resolvedAt: candle.time, resultR: -1, note: `Stop hit on ${candle.time}.` };
    }
  }

  return trade;
}

export function createJournalTrade(params: {
  symbol: string;
  timeframe: Timeframe;
  mode: AppMode;
  source: JournalSource;
  grade: GradeResult;
  noOvernight?: boolean;
}): JournalTrade | null {
  if (params.grade.bias === "Neutral") return null;

  return {
    id: `${params.symbol}-${params.timeframe}-${params.grade.signalTime}-${params.grade.bias}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    symbol: params.symbol.toUpperCase(),
    timeframe: params.timeframe,
    mode: params.mode,
    source: params.source,
    createdAt: new Date().toISOString(),
    signalTime: params.grade.signalTime,
    score: params.grade.score,
    bias: params.grade.bias,
    entry: params.grade.entry,
    stop: params.grade.stop,
    target: params.grade.target,
    rr: params.grade.rr,
    targetMode: params.grade.targetMode,
    setupType: params.grade.setupType,
    marketRegime: params.grade.marketRegime,
    session: marketSession(params.grade.signalTime),
    year: yearLabel(params.grade.signalTime),
    month: monthLabel(params.grade.signalTime),
    rsi: params.grade.diagnostics.rsi,
    volumeRatio: params.grade.diagnostics.volumeRatio,
    extensionAtr: params.grade.diagnostics.extensionAtr,
    noOvernight: params.noOvernight || false,
    status: "Open",
  };
}

export function canAutoSave(params: {
  existingTrades: JournalTrade[];
  grade: GradeResult | null;
  symbol: string;
  timeframe: Timeframe;
  minScore: number;
  maxScore: number;
  minRR: number;
  cooldownMinutes: number;
  appMode: AppMode;
  maxStaleMinutes: number;
}): { ok: boolean; reason: string } {
  const { existingTrades, grade, symbol, timeframe, minScore, maxScore, minRR, cooldownMinutes, appMode, maxStaleMinutes } = params;
  if (!grade) return { ok: false, reason: "No grade yet." };
  if (grade.bias === "Neutral") return { ok: false, reason: "Bias is neutral." };
  if (grade.score < minScore) return { ok: false, reason: `Score ${grade.score} is below min score ${minScore}.` };
  if (grade.score > maxScore) return { ok: false, reason: `Score ${grade.score} is above max score ${maxScore}. This can avoid overextended/chase setups.` };
  if (grade.rr < minRR) return { ok: false, reason: `R/R ${grade.rr} is below min R/R ${minRR}.` };
  if (appMode === "Live" && grade.staleMinutes > maxStaleMinutes) return { ok: false, reason: `Live Mode blocked stale data (${grade.staleMinutes} min old).` };

  const symbolUpper = symbol.toUpperCase();
  const sameCandleDuplicate = existingTrades.some((t) =>
    t.symbol === symbolUpper &&
    t.timeframe === timeframe &&
    t.signalTime === grade.signalTime &&
    t.bias === grade.bias &&
    t.source === "Auto"
  );
  if (sameCandleDuplicate) return { ok: false, reason: "Already saved this signal candle." };

  const latestSameSymbol = existingTrades
    .filter((t) => t.symbol === symbolUpper && t.timeframe === timeframe && t.source === "Auto")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (latestSameSymbol) {
    const elapsed = (Date.now() - new Date(latestSameSymbol.createdAt).getTime()) / 60000;
    if (elapsed < cooldownMinutes) return { ok: false, reason: `Cooldown active for ${round(cooldownMinutes - elapsed, 1)} more min.` };
  }

  return { ok: true, reason: "Signal qualifies." };
}

function emptyExposureSummary(): ExposureSummary {
  return {
    samples: 0,
    maxSimultaneousTrades: 0,
    avgSimultaneousTrades: 0,
    maxPlannedOpenRiskPct: 0,
    avgPlannedOpenRiskPct: 0,
    skippedByMaxOpenTrades: 0,
    skippedByMaxTotalRisk: 0,
  };
}

function applyStrategyTradeAdjustments(trade: JournalTrade, grade: GradeResult, engine: StrategyEngine, settings?: BacktestSettings): JournalTrade {
  if (engine !== "UniversalAdaptiveProV2" && engine !== "UniversalAdaptiveProV3" && engine !== "UniversalAdaptiveProV4" && engine !== "UniversalAdaptiveProV5") return trade;

  const setup = (trade.setupType || "").toLowerCase();
  const strength = grade.diagnostics.assetStrength || 0;
  const isLeaderLong = trade.bias === "Long" && trade.marketRegime === "Bull" && strength >= 2.35 && (setup.includes("continuation") || setup.includes("pullback") || setup.includes("reclaim"));
  if (!isLeaderLong) return trade;

  const risk = trade.entry - trade.stop;
  if (!Number.isFinite(risk) || risk <= 0) return trade;
  const leaderExitMode = settings?.leaderExitMode || ((engine === "UniversalAdaptiveProV4" || engine === "UniversalAdaptiveProV5") ? "PartialRunner" : "Expanded");
  if (leaderExitMode === "Fixed") return trade;

  if (leaderExitMode === "PartialRunner") {
    const firstTargetR = Math.max(2.5, trade.rr || 2.5);
    return {
      ...trade,
      target: round(trade.entry + risk * firstTargetR, 2),
      rr: firstTargetR,
      note: `${trade.note || ""}${trade.note ? " " : ""}v3.9 leader runner: if ${firstTargetR}R is hit, record 50% at target and trail the other 50%.`.trim(),
    };
  }

  const targetR = (engine === "UniversalAdaptiveProV4" || engine === "UniversalAdaptiveProV5")
    ? (strength >= 3.25 ? 7.5 : 5.5)
    : engine === "UniversalAdaptiveProV3"
      ? (strength >= 3.25 ? 6 : 4.5)
      : (strength >= 3.25 ? 4 : 3.25);
  return {
    ...trade,
    target: round(trade.entry + risk * targetR, 2),
    rr: targetR,
    note: `${trade.note || ""}${trade.note ? " " : ""}${engine === "UniversalAdaptiveProV5" ? "v3.9" : engine === "UniversalAdaptiveProV4" ? "v3.8" : engine === "UniversalAdaptiveProV3" ? "v3.7" : "v3.6"} leader expansion: target widened to ${targetR}R because this symbol is acting like an explosive leader.`.trim(),
  };
}

function resolveLeaderPartialRunner(trade: JournalTrade, candles: Candle[], targetIndex: number, maxIndex: number, noOvernight: boolean, signalDay: string): { trade: JournalTrade; exitIndex: number } {
  const risk = trade.entry - trade.stop;
  if (risk <= 0 || trade.bias !== "Long") {
    return { trade: { ...trade, status: "Win", resolvedAt: candles[targetIndex].time, resultR: round(trade.rr, 2), note: `Backtest: target hit on ${candles[targetIndex].time}.` }, exitIndex: targetIndex };
  }

  const firstTargetR = trade.rr || 2.5;
  let trail = Math.max(trade.entry, candles[targetIndex].close - (atr(candles.slice(Math.max(0, targetIndex - 30), targetIndex + 1), 14) || risk) * 2.5);
  let exitCandle = candles[targetIndex];
  let exitPrice = candles[targetIndex].close;
  let exitIndex = targetIndex;
  let reason = `Backtest: first target hit on ${candles[targetIndex].time}; runner exited at max hold.`;

  for (let k = targetIndex + 1; k <= maxIndex; k += 1) {
    const candle = candles[k];
    if (noOvernight && easternDateKey(candle.time) !== signalDay) {
      const lastSameDay = candles[Math.max(targetIndex, k - 1)];
      exitCandle = lastSameDay;
      exitPrice = lastSameDay.close;
      exitIndex = Math.max(targetIndex, k - 1);
      reason = `Backtest: leader runner hit first target, then no-overnight close on ${lastSameDay.time}.`;
      break;
    }
    const localAtr = atr(candles.slice(Math.max(0, k - 30), k + 1), 14) || risk;
    trail = Math.max(trail, candle.close - localAtr * 2.5, trade.entry);
    exitCandle = candle;
    exitPrice = candle.close;
    exitIndex = k;
    if (candle.low <= trail) {
      exitPrice = trail;
      reason = `Backtest: leader runner hit first target on ${candles[targetIndex].time}, then trailed out on ${candle.time}.`;
      break;
    }
  }

  const runnerR = (exitPrice - trade.entry) / Math.max(risk, 0.000001);
  const blendedR = round(firstTargetR * 0.5 + runnerR * 0.5, 2);
  return {
    trade: {
      ...trade,
      status: "Win",
      resolvedAt: exitCandle.time,
      resultR: blendedR,
      note: `${reason} 50% target R=${round(firstTargetR, 2)}, 50% runner R=${round(runnerR, 2)}, blended=${blendedR}R.`,
    },
    exitIndex,
  };
}

export function runBacktest(candles: Candle[], settings: BacktestSettings): BacktestSummary {
  const clean = candles
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const trades: JournalTrade[] = [];
  const directionFilter = settings.directionFilter || "All";
  const sessionFilter = settings.sessionFilter || "All";
  const minVolumeRatio = Number.isFinite(settings.minVolumeRatio) ? Number(settings.minVolumeRatio) : 0;
  const maxExtensionAtr = Number.isFinite(settings.maxExtensionAtr) && Number(settings.maxExtensionAtr) > 0 ? Number(settings.maxExtensionAtr) : 99;
  const regimeFilter = settings.regimeFilter || "Off";
  const setupTypeFilter = settings.setupTypeFilter || "All";
  const strategyEngine = settings.strategyEngine || "Manual";
  const maxOpenTrades = Number.isFinite(settings.maxOpenTrades) ? Math.max(0, Number(settings.maxOpenTrades)) : (settings.onePositionAtATime ? 1 : 0);
  const maxTotalOpenRiskPct = Number.isFinite(settings.maxTotalOpenRiskPct) ? Math.max(0, Number(settings.maxTotalOpenRiskPct)) : 0;
  const riskPct = perTradeRiskPct(settings);
  const maxDailyLossR = Number.isFinite(settings.maxDailyLossR) ? Math.max(0, Number(settings.maxDailyLossR)) : 0;
  const maxMonthlyLossR = Number.isFinite(settings.maxMonthlyLossR) ? Math.max(0, Number(settings.maxMonthlyLossR)) : 0;
  const dayR = new Map<string, number>();
  const monthR = new Map<string, number>();
  let lastSignalTime = 0;
  let exposureSamples = 0;
  let openCountSum = 0;
  let openRiskPctSum = 0;
  let maxSimultaneousTradesObserved = 0;
  let maxPlannedOpenRiskPctObserved = 0;
  let skippedByMaxOpenTrades = 0;
  let skippedByMaxTotalRisk = 0;
  let i = Math.max(settings.warmupBars, 50);

  while (i < clean.length - 2) {
    const loopTime = new Date(clean[i].time).getTime();
    const loopActiveCount = trades.filter((t) => tradeOpenAt(t, loopTime)).length;
    exposureSamples += 1;
    openCountSum += loopActiveCount;
    openRiskPctSum += loopActiveCount * riskPct;
    maxSimultaneousTradesObserved = Math.max(maxSimultaneousTradesObserved, loopActiveCount);
    maxPlannedOpenRiskPctObserved = Math.max(maxPlannedOpenRiskPctObserved, loopActiveCount * riskPct);

    const contextBars = Math.max(settings.warmupBars, strategyEngine === "UniversalAdaptiveProV5" || strategyEngine === "UniversalAdaptiveProV6" ? 4000 : 1000);
    const window = clean.slice(Math.max(0, i - contextBars + 1), i + 1);
    const symbolContext = buildSymbolPersonalityContext(window);
    const grade = gradeSetup(window, settings.timeframe, new Date(clean[i].time), settings.targetSettings, settings.gradeSettings);

    if (!grade || grade.bias === "Neutral" || grade.score < settings.minScore || grade.score > settings.maxScore || grade.rr < settings.minRR) {
      i += 1;
      continue;
    }

    if (strategyEngine !== "Manual" && !strategyEngineAllowsTrade(strategyEngine, grade, symbolContext)) {
      i += 1;
      continue;
    }
    if (directionFilter !== "All" && grade.bias !== directionFilter) {
      i += 1;
      continue;
    }
    if (!regimeAllowsTrade(regimeFilter, grade.bias, grade.marketRegime)) {
      i += 1;
      continue;
    }
    const gradeSession = marketSession(grade.signalTime);
    if (!sessionAllowsTrade(sessionFilter, gradeSession)) {
      i += 1;
      continue;
    }
    if (grade.diagnostics.volumeRatio < minVolumeRatio) {
      i += 1;
      continue;
    }
    if (grade.diagnostics.extensionAtr > maxExtensionAtr) {
      i += 1;
      continue;
    }
    if (!setupTypeAllowsTrade(setupTypeFilter, grade.setupType)) {
      i += 1;
      continue;
    }

    const currentTime = loopTime;
    const activeTrades = trades.filter((t) => tradeOpenAt(t, currentTime));
    if (maxOpenTrades > 0 && activeTrades.length >= maxOpenTrades) {
      skippedByMaxOpenTrades += 1;
      i += 1;
      continue;
    }
    const plannedOpenCount = activeTrades.length + 1;
    const plannedOpenRiskPct = plannedOpenCount * riskPct;
    if (maxTotalOpenRiskPct > 0 && riskPct > 0 && plannedOpenRiskPct > maxTotalOpenRiskPct + 0.000001) {
      skippedByMaxTotalRisk += 1;
      i += 1;
      continue;
    }
    maxSimultaneousTradesObserved = Math.max(maxSimultaneousTradesObserved, plannedOpenCount);
    maxPlannedOpenRiskPctObserved = Math.max(maxPlannedOpenRiskPctObserved, plannedOpenRiskPct);

    const dayKey = easternDateKey(grade.signalTime);
    const monthKey = monthLabel(grade.signalTime);
    if (maxDailyLossR > 0 && (dayR.get(dayKey) || 0) <= -maxDailyLossR) {
      i += 1;
      continue;
    }
    if (maxMonthlyLossR > 0 && (monthR.get(monthKey) || 0) <= -maxMonthlyLossR) {
      i += 1;
      continue;
    }

    const cooldownOk = lastSignalTime === 0 || (currentTime - lastSignalTime) / 60000 >= settings.cooldownMinutes;
    if (!cooldownOk) {
      i += 1;
      continue;
    }

    const initialTrade = createJournalTrade({ symbol: settings.symbol, timeframe: settings.timeframe, mode: "Research", source: "Backtest", grade, noOvernight: settings.noOvernight });
    if (!initialTrade) {
      i += 1;
      continue;
    }
    const adjustedInitialTrade = applyStrategyTradeAdjustments(initialTrade, grade, strategyEngine, settings);
    const baseTrade: JournalTrade = { ...adjustedInitialTrade, marketState: marketStateLabel(symbolContext, grade) };

    let resolvedTrade: JournalTrade | null = null;
    let exitIndex = Math.min(clean.length - 1, i + settings.maxBarsToHold);
    const signalDay = easternDateKey(baseTrade.signalTime);

    for (let j = i + 1; j <= Math.min(clean.length - 1, i + settings.maxBarsToHold); j += 1) {
      const candle = clean[j];

      if (settings.noOvernight && easternDateKey(candle.time) !== signalDay) {
        const lastSameDay = clean[Math.max(i, j - 1)];
        resolvedTrade = timeoutAtClose(baseTrade, lastSameDay, `Backtest: no overnight hold, closed at ${lastSameDay.close} on ${lastSameDay.time}.`);
        exitIndex = Math.max(i, j - 1);
        break;
      }

      const hitTarget = baseTrade.bias === "Long" ? candle.high >= baseTrade.target : candle.low <= baseTrade.target;
      const hitStop = baseTrade.bias === "Long" ? candle.low <= baseTrade.stop : candle.high >= baseTrade.stop;

      if (hitTarget && hitStop) {
        resolvedTrade = { ...baseTrade, status: "Ambiguous", resolvedAt: candle.time, resultR: 0, note: `Backtest: both target and stop touched in candle ${candle.time}.` };
        exitIndex = j;
        break;
      }
      if (hitTarget) {
        if ((baseTrade.note || "").includes("leader runner")) {
          const runner = resolveLeaderPartialRunner(baseTrade, clean, j, Math.min(clean.length - 1, i + settings.maxBarsToHold), settings.noOvernight, signalDay);
          resolvedTrade = runner.trade;
          exitIndex = runner.exitIndex;
        } else {
          resolvedTrade = { ...baseTrade, status: "Win", resolvedAt: candle.time, resultR: round(baseTrade.rr, 2), note: `Backtest: target hit on ${candle.time}.` };
          exitIndex = j;
        }
        break;
      }
      if (hitStop) {
        resolvedTrade = { ...baseTrade, status: "Loss", resolvedAt: candle.time, resultR: -1, note: `Backtest: stop hit on ${candle.time}.` };
        exitIndex = j;
        break;
      }
    }

    if (!resolvedTrade) {
      const endCandle = clean[exitIndex];
      resolvedTrade = timeoutAtClose(baseTrade, endCandle, `Backtest: max hold reached after ${settings.maxBarsToHold} bars.`);
    }

    resolvedTrade = applyTradeCosts(resolvedTrade, settings);
    trades.push(resolvedTrade);
    const r = resolvedTrade.resultR || 0;
    const resolvedDay = easternDateKey(resolvedTrade.resolvedAt || resolvedTrade.signalTime);
    const resolvedMonth = monthLabel(resolvedTrade.resolvedAt || resolvedTrade.signalTime);
    dayR.set(resolvedDay, round((dayR.get(resolvedDay) || 0) + r, 2));
    monthR.set(resolvedMonth, round((monthR.get(resolvedMonth) || 0) + r, 2));
    lastSignalTime = currentTime;
    i = settings.onePositionAtATime ? Math.max(exitIndex + 1, i + 1) : i + 1;
  }

  const summary = summarizeBacktest(settings.symbol, settings.timeframe, trades, clean, settings);
  return {
    ...summary,
    exposure: {
      samples: exposureSamples,
      maxSimultaneousTrades: maxSimultaneousTradesObserved,
      avgSimultaneousTrades: exposureSamples ? round(openCountSum / exposureSamples, 2) : 0,
      maxPlannedOpenRiskPct: round(maxPlannedOpenRiskPctObserved, 2),
      avgPlannedOpenRiskPct: exposureSamples ? round(openRiskPctSum / exposureSamples, 2) : 0,
      skippedByMaxOpenTrades,
      skippedByMaxTotalRisk,
    },
  };
}

function maxDrawdown(values: number[]): number {
  let peak = 0;
  let maxDd = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    maxDd = Math.max(maxDd, peak - value);
  }
  return round(maxDd, 2);
}



function maxDrawdownDollars(values: number[]): { dollars: number; pct: number } {
  if (!values.length) return { dollars: 0, pct: 0 };
  let peak = values[0];
  let maxDd = 0;
  let maxPct = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    const dd = peak - value;
    const pct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
    if (pct > maxPct) maxPct = pct;
  }
  return { dollars: round(maxDd, 2), pct: round(maxPct, 2) };
}

function normalizePortfolioSettings(settings?: Partial<PortfolioSettings>): PortfolioSettings {
  const startingBalance = Number.isFinite(settings?.startingBalance) && (settings?.startingBalance || 0) > 0 ? Number(settings?.startingBalance) : 5000;
  const riskPercent = Number.isFinite(settings?.riskPercent) && (settings?.riskPercent || 0) > 0 ? Number(settings?.riskPercent) : 1;
  const fixedRiskDollars = Number.isFinite(settings?.fixedRiskDollars) && (settings?.fixedRiskDollars || 0) > 0 ? Number(settings?.fixedRiskDollars) : 100;
  const riskModel = settings?.riskModel === "Fixed" ? "Fixed" : "Percent";
  return { startingBalance, riskModel, riskPercent, fixedRiskDollars };
}

function buyHoldSummary(candles: Candle[], startingBalance: number): { ending: number; profit: number; returnPct: number; maxDdDollars: number; maxDdPct: number; points: EquityPoint[] } {
  if (candles.length < 2) {
    return { ending: startingBalance, profit: 0, returnPct: 0, maxDdDollars: 0, maxDdPct: 0, points: [] };
  }
  const first = candles[0];
  const firstClose = Math.max(first.close, 0.000001);
  const points = candles.map((c) => ({ time: c.time, value: round(startingBalance * (c.close / firstClose), 2) }));
  const ending = points[points.length - 1]?.value ?? startingBalance;
  const dd = maxDrawdownDollars(points.map((p) => p.value));
  return {
    ending: round(ending, 2),
    profit: round(ending - startingBalance, 2),
    returnPct: round(((ending - startingBalance) / startingBalance) * 100, 2),
    maxDdDollars: dd.dollars,
    maxDdPct: dd.pct,
    points,
  };
}


function normalizeRealisticSettings(settings?: Partial<RealisticAccountSettings>): RealisticAccountSettings {
  return {
    enabled: settings?.enabled ?? true,
    accountType: settings?.accountType === "Margin" ? "Margin" : "Cash",
    allowFractionalShares: settings?.allowFractionalShares ?? true,
    allowShorts: settings?.allowShorts ?? false,
    marginMultiplier: Number.isFinite(settings?.marginMultiplier) && (settings?.marginMultiplier || 0) > 0 ? Number(settings?.marginMultiplier) : 1,
    maxPositionPct: Number.isFinite(settings?.maxPositionPct) && (settings?.maxPositionPct || 0) > 0 ? Number(settings?.maxPositionPct) : 100,
  };
}

function tradeRiskPerShare(trade: JournalTrade): number {
  const risk = trade.bias === "Long" ? trade.entry - trade.stop : trade.stop - trade.entry;
  return Math.max(Math.abs(risk), 0.000001);
}

function maxDrawdownFromPoints(points: EquityPoint[]): { dollars: number; pct: number } {
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
  return { dollars: round(maxDd, 2), pct: round(maxPct, 2) };
}

function simulateRealisticPortfolio(
  trades: JournalTrade[],
  portfolioSettingsInput?: Partial<PortfolioSettings>,
  realisticInput?: Partial<RealisticAccountSettings>
): RealisticPortfolioSummary {
  const portfolio = normalizePortfolioSettings(portfolioSettingsInput);
  const realistic = normalizeRealisticSettings(realisticInput);
  const startingCash = portfolio.startingBalance;
  const candidates = trades
    .filter((t) => typeof t.resultR === "number" && t.resolvedAt)
    .sort((a, b) => new Date(a.signalTime).getTime() - new Date(b.signalTime).getTime());

  type OpenPosition = { trade: JournalTrade; shares: number; positionValue: number; riskDollars: number; reservedCash: number; resolvedMs: number };
  let cash = startingCash;
  let equity = startingCash;
  const open: OpenPosition[] = [];
  const equityPoints: EquityPoint[] = candidates.length ? [{ time: candidates[0].signalTime, value: round(equity, 2) }] : [];
  let acceptedTrades = 0;
  let skippedBuyingPower = 0;
  let skippedNoShorts = 0;
  let skippedWholeShare = 0;
  let cashUsedPctSum = 0;
  let cashUsedSamples = 0;
  let maxCashUsedPct = 0;

  const closeDuePositions = (timeMs: number, timeLabel: string) => {
    open.sort((a, b) => a.resolvedMs - b.resolvedMs);
    let changed = false;
    while (open.length && open[0].resolvedMs <= timeMs) {
      const pos = open.shift()!;
      const pnl = (pos.trade.resultR || 0) * pos.riskDollars;
      cash += pos.reservedCash + pnl;
      equity = cash;
      equityPoints.push({ time: pos.trade.resolvedAt || timeLabel, value: round(equity, 2) });
      changed = true;
    }
    if (!changed && equityPoints.length === 0) equityPoints.push({ time: timeLabel, value: round(equity, 2) });
  };

  for (const trade of candidates) {
    const signalMs = new Date(trade.signalTime).getTime();
    const resolvedMs = new Date(trade.resolvedAt || trade.signalTime).getTime();
    if (!Number.isFinite(signalMs) || !Number.isFinite(resolvedMs)) continue;
    closeDuePositions(signalMs, trade.signalTime);

    if (trade.bias === "Short" && !realistic.allowShorts) {
      skippedNoShorts += 1;
      continue;
    }

    const riskDollarsTarget = portfolio.riskModel === "Percent"
      ? equity * (portfolio.riskPercent / 100)
      : portfolio.fixedRiskDollars;
    const rawShares = riskDollarsTarget / tradeRiskPerShare(trade);
    const affordableBuyingPower = realistic.accountType === "Margin" ? Math.max(0, cash * realistic.marginMultiplier) : Math.max(0, cash);
    const maxPositionByPct = equity * (realistic.maxPositionPct / 100);
    const maxPositionValue = Math.max(0, Math.min(affordableBuyingPower, maxPositionByPct));
    const sharesByPosition = trade.entry > 0 ? maxPositionValue / trade.entry : 0;
    let shares = Math.min(rawShares, sharesByPosition);
    if (!realistic.allowFractionalShares) shares = Math.floor(shares);
    if (shares <= 0) {
      if (!realistic.allowFractionalShares && rawShares > 0) skippedWholeShare += 1;
      else skippedBuyingPower += 1;
      continue;
    }
    const positionValue = shares * trade.entry;
    const actualRiskDollars = shares * tradeRiskPerShare(trade);
    if (positionValue > affordableBuyingPower + 0.000001 || positionValue > maxPositionByPct + 0.000001) {
      skippedBuyingPower += 1;
      continue;
    }
    const reservedCash = realistic.accountType === "Cash" || trade.bias === "Long" ? positionValue : Math.min(positionValue, cash);
    cash -= reservedCash;
    acceptedTrades += 1;
    const cashUsedPct = equity > 0 ? ((startingCash - Math.max(0, cash)) / equity) * 100 : 0;
    cashUsedPctSum += Math.max(0, Math.min(100, cashUsedPct));
    cashUsedSamples += 1;
    maxCashUsedPct = Math.max(maxCashUsedPct, Math.max(0, Math.min(100, cashUsedPct)));
    open.push({ trade, shares, positionValue, riskDollars: actualRiskDollars, reservedCash, resolvedMs });
  }
  closeDuePositions(Number.POSITIVE_INFINITY, candidates[candidates.length - 1]?.resolvedAt || candidates[candidates.length - 1]?.signalTime || new Date().toISOString());

  const dd = maxDrawdownFromPoints(equityPoints);
  return {
    enabled: realistic.enabled,
    startingCash,
    endingCash: round(equity, 2),
    netProfit: round(equity - startingCash, 2),
    returnPct: startingCash > 0 ? round(((equity - startingCash) / startingCash) * 100, 2) : 0,
    maxDrawdownDollars: dd.dollars,
    maxDrawdownPct: dd.pct,
    acceptedTrades,
    skippedBuyingPower,
    skippedNoShorts,
    skippedWholeShare,
    avgCashUsedPct: cashUsedSamples ? round(cashUsedPctSum / cashUsedSamples, 2) : 0,
    maxCashUsedPct: round(maxCashUsedPct, 2),
    avgUnusedCash: round(Math.max(0, startingCash - (cashUsedPctSum / Math.max(1, cashUsedSamples)) / 100 * startingCash), 2),
    maxPositionValue: round(startingCash * (realistic.maxPositionPct / 100), 2),
    accountType: realistic.accountType,
    allowFractionalShares: realistic.allowFractionalShares,
    allowShorts: realistic.allowShorts,
    equityPoints,
  };
}

function buildConsistencyCurve(trades: JournalTrade[], finalR: number): ConsistencyCurvePoint[] {
  const ordered = trades.slice().sort((a, b) => new Date(a.resolvedAt || a.signalTime).getTime() - new Date(b.resolvedAt || b.signalTime).getTime());
  const windowSize = 30;
  let cumulative = 0;
  return ordered.map((trade, index) => {
    cumulative = round(cumulative + (trade.resultR || 0), 2);
    const ideal = ordered.length > 1 ? round((finalR * index) / (ordered.length - 1), 2) : round(finalR, 2);
    const window = ordered.slice(Math.max(0, index - windowSize + 1), index + 1).map((t) => t.resultR || 0);
    const wins = window.filter((r) => r > 0).reduce((a, b) => a + b, 0);
    const losses = Math.abs(window.filter((r) => r < 0).reduce((a, b) => a + b, 0));
    let running = 0;
    let peak = 0;
    let dd = 0;
    for (const r of window) { running += r; peak = Math.max(peak, running); dd = Math.max(dd, peak - running); }
    const avgR = window.length ? average(window) : 0;
    const pf = losses > 0 ? wins / losses : wins > 0 ? 999 : 0;
    const consistency = clamp(Math.round(70 + avgR * 45 + Math.min(20, pf * 5) - dd * 4 - Math.abs(cumulative - ideal) * 0.25), 0, 100);
    return {
      time: trade.resolvedAt || trade.signalTime,
      actualR: cumulative,
      idealR: ideal,
      deviationR: round(cumulative - ideal, 2),
      rollingAvgR: round(avgR, 2),
      rollingProfitFactor: pf === 999 ? 999 : round(pf, 2),
      rollingDrawdownR: round(dd, 2),
      rollingConsistency: consistency,
    };
  });
}

function simulatePortfolio(trades: JournalTrade[], candles: Candle[], portfolioSettingsInput?: Partial<PortfolioSettings>): PortfolioSummary {
  const settings = normalizePortfolioSettings(portfolioSettingsInput);
  let balance = settings.startingBalance;
  const points: EquityPoint[] = [];
  if (candles[0]) points.push({ time: candles[0].time, value: round(balance, 2) });

  const ordered = [...trades].sort((a, b) => new Date(a.resolvedAt || a.signalTime).getTime() - new Date(b.resolvedAt || b.signalTime).getTime());
  for (const trade of ordered) {
    const r = trade.resultR ?? 0;
    const riskDollars = settings.riskModel === "Percent" ? balance * (settings.riskPercent / 100) : settings.fixedRiskDollars;
    balance += riskDollars * r;
    points.push({ time: trade.resolvedAt || trade.signalTime, value: round(balance, 2) });
  }

  if (candles.length && points[points.length - 1]?.time !== candles[candles.length - 1].time) {
    points.push({ time: candles[candles.length - 1].time, value: round(balance, 2) });
  }

  const values = points.map((p) => p.value);
  const strategyDd = maxDrawdownDollars(values.length ? values : [settings.startingBalance]);
  const hold = buyHoldSummary(candles, settings.startingBalance);
  return {
    startingBalance: round(settings.startingBalance, 2),
    endingBalance: round(balance, 2),
    netProfit: round(balance - settings.startingBalance, 2),
    returnPct: round(((balance - settings.startingBalance) / settings.startingBalance) * 100, 2),
    maxDrawdownDollars: strategyDd.dollars,
    maxDrawdownPct: strategyDd.pct,
    riskModel: settings.riskModel,
    riskLabel: settings.riskModel === "Percent" ? `${settings.riskPercent}% account risk per trade` : `$${settings.fixedRiskDollars} fixed risk per trade`,
    equityPoints: points,
    buyHoldEndingBalance: hold.ending,
    buyHoldNetProfit: hold.profit,
    buyHoldReturnPct: hold.returnPct,
    buyHoldMaxDrawdownDollars: hold.maxDdDollars,
    buyHoldMaxDrawdownPct: hold.maxDdPct,
    buyHoldEquityPoints: hold.points,
    strategyVsBuyHold: round(balance - hold.ending, 2),
  };
}

function simulateRiskComparisons(trades: JournalTrade[], candles: Candle[], portfolioSettingsInput?: Partial<PortfolioSettings>): RiskComparison[] {
  const base = normalizePortfolioSettings(portfolioSettingsInput);
  const risks = [0.5, 1, 1.5, 2, 3];
  return risks.map((riskPercent) => {
    const sim = simulatePortfolio(trades, candles, {
      startingBalance: base.startingBalance,
      riskModel: "Percent",
      riskPercent,
      fixedRiskDollars: base.fixedRiskDollars,
    });
    return {
      riskPercent,
      endingBalance: sim.endingBalance,
      netProfit: sim.netProfit,
      returnPct: sim.returnPct,
      maxDrawdownDollars: sim.maxDrawdownDollars,
      maxDrawdownPct: sim.maxDrawdownPct,
    };
  });
}

function dataWindowSummary(candles: Candle[], requestedStart?: string, requestedEnd?: string): DataWindowSummary {
  const first = candles[0]?.time;
  const last = candles[candles.length - 1]?.time;
  const firstMs = first ? new Date(first).getTime() : NaN;
  const lastMs = last ? new Date(last).getTime() : NaN;
  const loadedDays = Number.isFinite(firstMs) && Number.isFinite(lastMs) ? Math.max(0, (lastMs - firstMs) / 86400000) : 0;
  let warning = "";
  if (!candles.length) warning = "No candles loaded for this backtest.";
  else if (requestedStart) {
    const reqStartMs = new Date(requestedStart).getTime();
    if (Number.isFinite(reqStartMs) && Number.isFinite(firstMs) && firstMs - reqStartMs > 2 * 86400000) {
      warning = "Loaded data starts later than the requested start date. The API may have returned a limited window.";
    }
  }
  return {
    requestedStart,
    requestedEnd,
    firstCandle: first,
    lastCandle: last,
    candleCount: candles.length,
    loadedDays: round(loadedDays, 1),
    warning: warning || undefined,
  };
}

function groupSummary(label: string, trades: JournalTrade[]): DiagnosticGroupStats {
  const wins = trades.filter((t) => t.status === "Win").length;
  const losses = trades.filter((t) => t.status === "Loss").length;
  const timeouts = trades.filter((t) => t.status === "Timeout").length;
  const completed = wins + losses;
  const rValues = trades.map((t) => t.resultR ?? 0);
  const positiveR = rValues.filter((r) => r > 0).length;
  const negativeR = rValues.filter((r) => r < 0).length;
  const cumulativeR = rValues.reduce((sum, r) => sum + r, 0);
  const grossProfit = rValues.filter((r) => r > 0).reduce((sum, r) => sum + r, 0);
  const grossLoss = Math.abs(rValues.filter((r) => r < 0).reduce((sum, r) => sum + r, 0));
  const equityCurve: number[] = [];
  let running = 0;
  for (const r of rValues) {
    running += r;
    equityCurve.push(round(running, 2));
  }
  return {
    label,
    trades: trades.length,
    wins,
    losses,
    timeouts,
    positiveR,
    negativeR,
    winRate: completed > 0 ? round((wins / completed) * 100, 1) : 0,
    avgR: rValues.length ? round(cumulativeR / rValues.length, 2) : 0,
    cumulativeR: round(cumulativeR, 2),
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss, 2) : grossProfit > 0 ? 999 : 0,
    maxDrawdownR: maxDrawdown(equityCurve),
  };
}

function groupByStats(trades: JournalTrade[], labels: string[], getter: (trade: JournalTrade) => string): DiagnosticGroupStats[] {
  const seen = new Set(labels);
  for (const trade of trades) seen.add(getter(trade));
  return Array.from(seen)
    .filter(Boolean)
    .sort((a, b) => {
      const ai = labels.indexOf(a);
      const bi = labels.indexOf(b);
      if (ai >= 0 || bi >= 0) return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
      return a.localeCompare(b);
    })
    .map((label) => groupSummary(label, trades.filter((t) => getter(t) === label)));
}

export function diagnosticBreakdowns(trades: JournalTrade[]): BacktestSummary["diagnostics"] {
  return {
    byDirection: groupByStats(trades, ["Long", "Short"], (t) => t.bias),
    bySession: groupByStats(trades, ["Morning", "Midday", "Afternoon", "Outside"], (t) => t.session || marketSession(t.signalTime)),
    byYear: groupByStats(trades, [], (t) => t.year || yearLabel(t.signalTime)),
    byMonth: groupByStats(trades, [], (t) => t.month || monthLabel(t.signalTime)),
    bySetupType: groupByStats(trades, [], (t) => t.setupType || "Unknown"),
    byRegime: groupByStats(trades, ["Bull", "Neutral", "Bear", "Panic"], (t) => t.marketRegime || "Unknown"),
    byRegimeDirection: groupByStats(trades, ["Bull Long", "Bull Short", "Neutral Long", "Neutral Short", "Bear Long", "Bear Short", "Panic Long", "Panic Short"], regimeDirectionLabel),
    byMarketState: groupByStats(trades, ["Healthy leader", "Failed leader", "Bear transition", "Bull recovery", "Explosive leader", "Weak/laggard", "Choppy/no edge", "Tradable normal"], (t) => t.marketState || "Unknown"),
  };
}

function consistencySummary(trades: JournalTrade[], cumulativeR: number, maxDrawdownR: number, portfolio: PortfolioSummary, diagnostics: BacktestSummary["diagnostics"]): ConsistencySummary {
  const months = diagnostics.byMonth.filter((m) => m.trades > 0);
  const profitableMonths = months.filter((m) => m.cumulativeR > 0).length;
  const worstMonthR = months.length ? Math.min(...months.map((m) => m.cumulativeR)) : 0;
  const bestMonthR = months.length ? Math.max(...months.map((m) => m.cumulativeR)) : 0;
  const recentThree = months.slice(-3).reduce((sum, m) => sum + m.cumulativeR, 0);
  const positiveMonthRate = months.length ? round((profitableMonths / months.length) * 100, 1) : 0;
  const rOverDrawdown = maxDrawdownR > 0 ? round(cumulativeR / maxDrawdownR, 2) : cumulativeR > 0 ? 999 : 0;
  const tradeCount = trades.length;

  let score = 50;
  score += clamp(cumulativeR / 2, -25, 35);
  score += clamp((portfolio.returnPct - portfolio.buyHoldReturnPct) / 4, -15, 20);
  score += clamp((portfolio.buyHoldMaxDrawdownPct - portfolio.maxDrawdownPct) / 2, -15, 20);
  score += clamp(positiveMonthRate / 5 - 10, -10, 10);
  score += clamp(recentThree, -15, 15);
  score -= clamp(maxDrawdownR / 2, 0, 25);
  if (tradeCount < 50) score -= 15;
  if (tradeCount < 20) score -= 20;

  const notes: string[] = [];
  if (portfolio.returnPct > portfolio.buyHoldReturnPct) notes.push("Strategy beat buy-and-hold over the loaded window.");
  else notes.push("Strategy did not beat buy-and-hold over the loaded window.");
  if (portfolio.maxDrawdownPct < portfolio.buyHoldMaxDrawdownPct) notes.push("Strategy drawdown was lower than buy-and-hold.");
  else notes.push("Strategy drawdown was higher than buy-and-hold.");
  if (positiveMonthRate < 50) notes.push("Less than half of traded months were profitable; consistency is weak.");
  if (recentThree < 0) notes.push("Recent 3-month R is negative; forward-test carefully.");
  if (maxDrawdownR > Math.max(10, Math.abs(cumulativeR) * 0.35)) notes.push("R drawdown is large relative to total R.");
  if (tradeCount < 50) notes.push("Sample size is small; do not trust this setting yet.");

  return {
    score: clamp(Math.round(score), 0, 100),
    positiveMonthRate,
    profitableMonths,
    totalMonths: months.length,
    worstMonthR: round(worstMonthR, 2),
    bestMonthR: round(bestMonthR, 2),
    recentThreeMonthR: round(recentThree, 2),
    rOverDrawdown,
    notes,
  };
}

export function summarizeBacktest(symbol: string, timeframe: Timeframe, trades: JournalTrade[], candles: Candle[] = [], settings?: BacktestSettings): BacktestSummary {
  const wins = trades.filter((t) => t.status === "Win").length;
  const losses = trades.filter((t) => t.status === "Loss").length;
  const ambiguous = trades.filter((t) => t.status === "Ambiguous").length;
  const timeouts = trades.filter((t) => t.status === "Timeout").length;
  const completed = wins + losses;
  const winRate = completed > 0 ? (wins / completed) * 100 : 0;
  const rValues = trades.map((t) => t.resultR ?? 0);
  const positiveR = rValues.filter((r) => r > 0).length;
  const negativeR = rValues.filter((r) => r < 0).length;
  const cumulativeR = rValues.reduce((sum, r) => sum + r, 0);
  const avgR = rValues.length ? cumulativeR / rValues.length : 0;
  const grossProfit = rValues.filter((r) => r > 0).reduce((sum, r) => sum + r, 0);
  const grossLoss = Math.abs(rValues.filter((r) => r < 0).reduce((sum, r) => sum + r, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const equityCurve: number[] = [];
  const equityCurvePoints: EquityPoint[] = [];
  let running = 0;
  if (candles[0]) equityCurvePoints.push({ time: candles[0].time, value: 0 });
  const orderedTrades = [...trades].sort((a, b) => new Date(a.resolvedAt || a.signalTime).getTime() - new Date(b.resolvedAt || b.signalTime).getTime());
  for (const trade of orderedTrades) {
    const r = trade.resultR ?? 0;
    running += r;
    const rounded = round(running, 2);
    equityCurve.push(rounded);
    equityCurvePoints.push({ time: trade.resolvedAt || trade.signalTime, value: rounded });
  }
  if (candles.length && equityCurvePoints[equityCurvePoints.length - 1]?.time !== candles[candles.length - 1].time) {
    equityCurvePoints.push({ time: candles[candles.length - 1].time, value: round(running, 2) });
  }

  const dataWindow = dataWindowSummary(candles, settings?.requestedStart, settings?.requestedEnd);
  const portfolio = simulatePortfolio(orderedTrades, candles, settings?.portfolioSettings);
  const realisticPortfolio = simulateRealisticPortfolio(orderedTrades, settings?.portfolioSettings, settings?.realisticSettings);
  const riskComparisons = simulateRiskComparisons(orderedTrades, candles, settings?.portfolioSettings);
  const diagnostics = diagnosticBreakdowns(trades);
  const consistency = consistencySummary(trades, round(cumulativeR, 2), maxDrawdown(equityCurve), portfolio, diagnostics);
  const consistencyCurve = buildConsistencyCurve(orderedTrades, round(cumulativeR, 2));

  return {
    symbol,
    timeframe,
    totalTrades: trades.length,
    wins,
    losses,
    ambiguous,
    timeouts,
    positiveR,
    negativeR,
    winRate: round(winRate, 1),
    avgR: round(avgR, 2),
    cumulativeR: round(cumulativeR, 2),
    maxDrawdownR: maxDrawdown(equityCurve),
    profitFactor: profitFactor === Infinity ? 999 : round(profitFactor, 2),
    scoreRanges: scoreRangeStats(trades),
    trades,
    equityCurve,
    equityCurvePoints,
    dataWindow,
    portfolio,
    realisticPortfolio,
    consistencyCurve,
    diagnostics,
    consistency,
    riskComparisons,
    exposure: emptyExposureSummary(),
  };
}

export function scoreRangeStats(trades: JournalTrade[]): ScoreRangeStats[] {
  const ranges = [
    { label: "Under 60", min: 0, max: 59 },
    { label: "60-69", min: 60, max: 69 },
    { label: "70-79", min: 70, max: 79 },
    { label: "80-89", min: 80, max: 89 },
    { label: "90-100", min: 90, max: 100 },
  ];

  return ranges.map((range) => {
    const items = trades.filter((t) => t.score >= range.min && t.score <= range.max);
    const wins = items.filter((t) => t.status === "Win").length;
    const losses = items.filter((t) => t.status === "Loss").length;
    const ambiguous = items.filter((t) => t.status === "Ambiguous").length;
    const timeouts = items.filter((t) => t.status === "Timeout").length;
    const completed = wins + losses;
    const rValues = items.map((t) => t.resultR ?? 0);
    const positiveR = rValues.filter((r) => r > 0).length;
    const negativeR = rValues.filter((r) => r < 0).length;
    const cumulativeR = rValues.reduce((sum, value) => sum + value, 0);
    return {
      ...range,
      trades: items.length,
      wins,
      losses,
      ambiguous,
      timeouts,
      positiveR,
      negativeR,
      winRate: completed > 0 ? round((wins / completed) * 100, 1) : 0,
      avgR: rValues.length ? round(cumulativeR / rValues.length, 2) : 0,
      cumulativeR: round(cumulativeR, 2),
    };
  });
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return `${date.toLocaleString("en-US", { timeZone: "America/New_York", month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} ET`;
}

export function sampleCsv(): string {
  const start = new Date();
  start.setHours(9, 30, 0, 0);
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < 160; i += 1) {
    const open = price;
    const drift = i < 80 ? 0.03 : 0.06;
    const noise = Math.sin(i / 4) * 0.08;
    const close = open + drift + noise;
    const high = Math.max(open, close) + 0.2 + Math.abs(Math.sin(i)) * 0.1;
    const low = Math.min(open, close) - 0.2 - Math.abs(Math.cos(i)) * 0.1;
    price = close;
    const t = new Date(start.getTime() + i * 15 * 60000).toISOString();
    candles.push({ time: t, open: round(open, 2), high: round(high, 2), low: round(low, 2), close: round(close, 2), volume: Math.round(900000 + i * 2500 + Math.sin(i / 3) * 80000) });
  }
  return candlesToCsv(candles);
}

export function scoreRangeLabelForTrade(trade: JournalTrade): string {
  return scoreRangeLabel(trade.score);
}
