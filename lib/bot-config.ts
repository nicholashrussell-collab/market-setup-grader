import {
  DirectionFilter,
  GradeProfile,
  LeaderExitMode,
  RegimeFilter,
  RiskModel,
  SessionFilter,
  SetupTypeFilter,
  StrategyEngine,
  TargetMode,
  Timeframe,
} from "@/lib/trading";
import { DEFAULT_TRACKED_SYMBOLS, parseTrackedSymbols } from "@/lib/watchlist";

export type ApiDataSource = "Alpaca" | "Massive";

export type BrokerExecutionMode = "Supabase Simulation" | "Alpaca Paper" | "Alpaca Live" | "Real Locked";
export type RealisticAccountType = "Cash" | "Margin";

export type CloudBotSettings = {
  enabled: boolean;
  paperTradingEnabled: boolean;
  universeLabel: string;
  symbols: string[];
  timeframe: Timeframe;
  source: ApiDataSource;
  minScore: number;
  maxScore: number;
  minRR: number;
  maxStaleMinutes: number;
  maxOpenPositions: number;
  startingEquity: number;
  riskPct: number;
  maxPositionPct: number;
  targetMode: TargetMode;
  fixedTargetR: number;
  atrTargetMultiple: number;
  gradeProfile: GradeProfile;
  directionFilter: DirectionFilter;
  regimeFilter: RegimeFilter;
  sessionFilter: SessionFilter;
  setupTypeFilter: SetupTypeFilter;
  strategyEngine: StrategyEngine;
  leaderExitMode: LeaderExitMode;
  riskModel: RiskModel;
  fixedRiskDollars: number;
  cooldownMinutes: number;
  maxBarsToHold: number;
  warmupBars: number;
  maxNewTradesPerRun: number;
  maxTotalOpenRiskPct: number;
  accountType: RealisticAccountType;
  marginMultiplier: number;
  allowFractionalShares: boolean;
  allowShorts: boolean;
  openStartMinutesEt: number;
  openEndMinutesEt: number;
  noNewTradesFirstMinutes: number;
  noNewTradesLastMinutes: number;
  longOnly: boolean;
  allowStaleSimulation: boolean;
  scanLimit: number;
  brokerMode: BrokerExecutionMode;
  brokerPaperEnabled: boolean;
  brokerLiveEnabled: boolean;
  customSymbols?: string;
};

// v9.0: admin tracked symbols and guardrails are the source of truth for the cloud bot.
export const TRACKED_WATCHLIST_LABEL = "Tracked Symbols";

export function parseSymbols(value: string, limit = 1000) {
  return parseTrackedSymbols(value, limit);
}

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function envBoolean(name: string, fallback: boolean) {
  const value = (process.env[name] || "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(value)) return true;
  if (["false", "0", "no", "off"].includes(value)) return false;
  return fallback;
}

function num(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const clean = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(clean)) return true;
    if (["false", "0", "no", "off"].includes(clean)) return false;
  }
  return fallback;
}

export function getTrackedSymbols(limit = 100) {
  const source = process.env.BOT_SYMBOLS || DEFAULT_TRACKED_SYMBOLS;
  return parseSymbols(source, Number.isFinite(limit) ? limit : 100);
}

export function getCloudBotSettings(): CloudBotSettings {
  const scanLimit = envNumber("BOT_SCAN_LIMIT", 100);
  const directionFilter = (process.env.BOT_DIRECTION_FILTER as DirectionFilter) || "Long";
  return {
    enabled: envBoolean("BOT_ENABLED", true),
    paperTradingEnabled: envBoolean("BOT_PAPER_TRADING_ENABLED", true),
    universeLabel: TRACKED_WATCHLIST_LABEL,
    symbols: getTrackedSymbols(scanLimit),
    timeframe: (process.env.BOT_TIMEFRAME as Timeframe) || "15Min",
    source: "Alpaca",
    minScore: envNumber("BOT_MIN_SCORE", 60),
    maxScore: envNumber("BOT_MAX_SCORE", 100),
    minRR: envNumber("BOT_MIN_RR", 1),
    maxStaleMinutes: envNumber("BOT_MAX_STALE_MINUTES", 30),
    maxOpenPositions: envNumber("BOT_MAX_OPEN_POSITIONS", 4),
    startingEquity: envNumber("BOT_STARTING_EQUITY", 5000),
    riskPct: envNumber("BOT_RISK_PCT", 1),
    maxPositionPct: envNumber("BOT_MAX_POSITION_PCT", 25),
    targetMode: (process.env.BOT_TARGET_MODE as TargetMode) || "FixedR",
    fixedTargetR: envNumber("BOT_FIXED_TARGET_R", 2.5),
    atrTargetMultiple: envNumber("BOT_ATR_TARGET_MULTIPLE", 2),
    gradeProfile: (process.env.BOT_GRADE_PROFILE as GradeProfile) || "Pullback",
    directionFilter,
    regimeFilter: (process.env.BOT_REGIME_FILTER as RegimeFilter) || "Off",
    sessionFilter: (process.env.BOT_SESSION_FILTER as SessionFilter) || "MiddayAfternoon",
    setupTypeFilter: (process.env.BOT_SETUP_TYPE_FILTER as SetupTypeFilter) || "AdaptiveBest",
    strategyEngine: (process.env.BOT_STRATEGY_ENGINE as StrategyEngine) || "UniversalAdaptiveProV3",
    leaderExitMode: (process.env.BOT_LEADER_EXIT_MODE as LeaderExitMode) || "Fixed",
    riskModel: (process.env.BOT_RISK_MODEL as RiskModel) || "Percent",
    fixedRiskDollars: envNumber("BOT_FIXED_RISK_DOLLARS", 50),
    cooldownMinutes: envNumber("BOT_COOLDOWN_MINUTES", 60),
    maxBarsToHold: envNumber("BOT_MAX_BARS_TO_HOLD", 120),
    warmupBars: envNumber("BOT_WARMUP_BARS", 200),
    maxNewTradesPerRun: envNumber("BOT_MAX_NEW_TRADES_PER_RUN", 1),
    maxTotalOpenRiskPct: envNumber("BOT_MAX_TOTAL_OPEN_RISK_PCT", 8),
    accountType: (process.env.BOT_ACCOUNT_TYPE as RealisticAccountType) || "Cash",
    marginMultiplier: envNumber("BOT_MARGIN_MULTIPLIER", 1),
    allowFractionalShares: envBoolean("BOT_ALLOW_FRACTIONAL_SHARES", true),
    allowShorts: envBoolean("BOT_ALLOW_SHORTS", false),
    openStartMinutesEt: envNumber("BOT_OPEN_START_MINUTES_ET", 11 * 60 + 30),
    openEndMinutesEt: envNumber("BOT_OPEN_END_MINUTES_ET", 16 * 60),
    noNewTradesFirstMinutes: envNumber("BOT_NO_NEW_TRADES_FIRST_MINUTES", 0),
    noNewTradesLastMinutes: envNumber("BOT_NO_NEW_TRADES_LAST_MINUTES", 0),
    longOnly: directionFilter === "Long" || envBoolean("BOT_LONG_ONLY", true),
    allowStaleSimulation: envBoolean("BOT_ALLOW_STALE_SIMULATION", false),
    scanLimit,
    brokerMode: (process.env.BOT_BROKER_MODE as BrokerExecutionMode) || "Supabase Simulation",
    brokerPaperEnabled: envBoolean("BOT_BROKER_PAPER_ENABLED", false),
    brokerLiveEnabled: envBoolean("BOT_BROKER_LIVE_ENABLED", false),
    customSymbols: process.env.BOT_SYMBOLS || DEFAULT_TRACKED_SYMBOLS,
  };
}

export type BotControlRow = {
  id: string;
  updated_at?: string;
  bot_enabled?: boolean;
  paper_trading_enabled?: boolean;
  universe_label?: string;
  timeframe?: string;
  min_score?: number;
  max_score?: number;
  min_rr?: number;
  max_open_positions?: number;
  starting_equity?: number;
  risk_pct?: number;
  max_position_pct?: number;
  max_stale_minutes?: number;
  allow_stale_simulation?: boolean;
  scan_limit?: number;
  notes?: string;
  broker_mode?: string;
  broker_paper_enabled?: boolean;
  broker_live_enabled?: boolean;
  custom_symbols?: string;
  target_mode?: string;
  fixed_target_r?: number;
  atr_target_multiple?: number;
  grade_profile?: string;
  direction_filter?: string;
  regime_filter?: string;
  session_filter?: string;
  setup_type_filter?: string;
  strategy_engine?: string;
  leader_exit_mode?: string;
  risk_model?: string;
  fixed_risk_dollars?: number;
  cooldown_minutes?: number;
  max_bars_to_hold?: number;
  warmup_bars?: number;
  max_new_trades_per_run?: number;
  max_total_open_risk_pct?: number;
  account_type?: string;
  margin_multiplier?: number;
  allow_fractional_shares?: boolean;
  allow_shorts?: boolean;
  open_start_minutes_et?: number;
  open_end_minutes_et?: number;
  no_new_trades_first_minutes?: number;
  no_new_trades_last_minutes?: number;
};

function applyControlRow(base: CloudBotSettings, row?: BotControlRow | null): CloudBotSettings {
  if (!row) return base;
  const scanLimit = num(row.scan_limit, base.scanLimit);
  const symbolSource = (row.custom_symbols || "").trim() || base.customSymbols || DEFAULT_TRACKED_SYMBOLS;
  const directionFilter = (row.direction_filter as DirectionFilter) || base.directionFilter;
  const allowShorts = bool(row.allow_shorts, base.allowShorts);
  return {
    ...base,
    enabled: bool(row.bot_enabled, base.enabled),
    paperTradingEnabled: bool(row.paper_trading_enabled, base.paperTradingEnabled),
    universeLabel: TRACKED_WATCHLIST_LABEL,
    symbols: parseSymbols(symbolSource, Number.isFinite(scanLimit) ? scanLimit : base.scanLimit),
    timeframe: (row.timeframe as Timeframe) || base.timeframe,
    minScore: num(row.min_score, base.minScore),
    maxScore: num(row.max_score, base.maxScore),
    minRR: num(row.min_rr, base.minRR),
    maxOpenPositions: num(row.max_open_positions, base.maxOpenPositions),
    startingEquity: num(row.starting_equity, base.startingEquity),
    riskPct: num(row.risk_pct, base.riskPct),
    maxPositionPct: num(row.max_position_pct, base.maxPositionPct),
    maxStaleMinutes: num(row.max_stale_minutes, base.maxStaleMinutes),
    allowStaleSimulation: bool(row.allow_stale_simulation, base.allowStaleSimulation),
    scanLimit: Number.isFinite(scanLimit) ? scanLimit : base.scanLimit,
    brokerMode: (row.broker_mode as BrokerExecutionMode) || base.brokerMode,
    brokerPaperEnabled: bool(row.broker_paper_enabled, base.brokerPaperEnabled),
    brokerLiveEnabled: bool(row.broker_live_enabled, base.brokerLiveEnabled),
    targetMode: (row.target_mode as TargetMode) || base.targetMode,
    fixedTargetR: num(row.fixed_target_r, base.fixedTargetR),
    atrTargetMultiple: num(row.atr_target_multiple, base.atrTargetMultiple),
    gradeProfile: (row.grade_profile as GradeProfile) || base.gradeProfile,
    directionFilter,
    regimeFilter: (row.regime_filter as RegimeFilter) || base.regimeFilter,
    sessionFilter: (row.session_filter as SessionFilter) || base.sessionFilter,
    setupTypeFilter: (row.setup_type_filter as SetupTypeFilter) || base.setupTypeFilter,
    strategyEngine: (row.strategy_engine as StrategyEngine) || base.strategyEngine,
    leaderExitMode: (row.leader_exit_mode as LeaderExitMode) || base.leaderExitMode,
    riskModel: (row.risk_model as RiskModel) || base.riskModel,
    fixedRiskDollars: num(row.fixed_risk_dollars, base.fixedRiskDollars),
    cooldownMinutes: num(row.cooldown_minutes, base.cooldownMinutes),
    maxBarsToHold: num(row.max_bars_to_hold, base.maxBarsToHold),
    warmupBars: num(row.warmup_bars, base.warmupBars),
    maxNewTradesPerRun: num(row.max_new_trades_per_run, base.maxNewTradesPerRun),
    maxTotalOpenRiskPct: num(row.max_total_open_risk_pct, base.maxTotalOpenRiskPct),
    accountType: (row.account_type as RealisticAccountType) || base.accountType,
    marginMultiplier: num(row.margin_multiplier, base.marginMultiplier),
    allowFractionalShares: bool(row.allow_fractional_shares, base.allowFractionalShares),
    allowShorts,
    openStartMinutesEt: num(row.open_start_minutes_et, base.openStartMinutesEt),
    openEndMinutesEt: num(row.open_end_minutes_et, base.openEndMinutesEt),
    noNewTradesFirstMinutes: num(row.no_new_trades_first_minutes, base.noNewTradesFirstMinutes),
    noNewTradesLastMinutes: num(row.no_new_trades_last_minutes, base.noNewTradesLastMinutes),
    longOnly: directionFilter === "Long" || !allowShorts,
    customSymbols: symbolSource,
  };
}

export async function getRuntimeCloudBotSettings(): Promise<CloudBotSettings> {
  const base = getCloudBotSettings();
  try {
    const { getSupabaseConfigStatus, supabaseRest } = await import("@/lib/supabase-rest");
    if (!getSupabaseConfigStatus().configured) return base;
    const rows = await supabaseRest<BotControlRow[]>("bot_control?id=eq.main&select=*&limit=1", { method: "GET" }).catch(() => []);
    return applyControlRow(base, rows[0]);
  } catch {
    return base;
  }
}

export function defaultBotControlRow(): BotControlRow {
  const s = getCloudBotSettings();
  return {
    id: "main",
    bot_enabled: s.enabled,
    paper_trading_enabled: false,
    universe_label: TRACKED_WATCHLIST_LABEL,
    timeframe: s.timeframe,
    min_score: s.minScore,
    max_score: s.maxScore,
    min_rr: s.minRR,
    max_open_positions: s.maxOpenPositions,
    starting_equity: s.startingEquity,
    risk_pct: s.riskPct,
    max_position_pct: s.maxPositionPct,
    max_stale_minutes: s.maxStaleMinutes,
    allow_stale_simulation: s.allowStaleSimulation,
    scan_limit: s.scanLimit,
    notes: "Managed from v9.0 /admin. Paper-trading guardrails, tracked symbols, and saved settings are the source of truth for the scheduled cloud bot.",
    broker_mode: "Supabase Simulation",
    broker_paper_enabled: false,
    broker_live_enabled: false,
    custom_symbols: s.customSymbols || DEFAULT_TRACKED_SYMBOLS,
    target_mode: s.targetMode,
    fixed_target_r: s.fixedTargetR,
    atr_target_multiple: s.atrTargetMultiple,
    grade_profile: s.gradeProfile,
    direction_filter: s.directionFilter,
    regime_filter: s.regimeFilter,
    session_filter: s.sessionFilter,
    setup_type_filter: s.setupTypeFilter,
    strategy_engine: s.strategyEngine,
    leader_exit_mode: s.leaderExitMode,
    risk_model: s.riskModel,
    fixed_risk_dollars: s.fixedRiskDollars,
    cooldown_minutes: s.cooldownMinutes,
    max_bars_to_hold: s.maxBarsToHold,
    warmup_bars: s.warmupBars,
    max_new_trades_per_run: s.maxNewTradesPerRun,
    max_total_open_risk_pct: s.maxTotalOpenRiskPct,
    account_type: s.accountType,
    margin_multiplier: s.marginMultiplier,
    allow_fractional_shares: s.allowFractionalShares,
    allow_shorts: s.allowShorts,
    open_start_minutes_et: s.openStartMinutesEt,
    open_end_minutes_et: s.openEndMinutesEt,
    no_new_trades_first_minutes: s.noNewTradesFirstMinutes,
    no_new_trades_last_minutes: s.noNewTradesLastMinutes,
  };
}
