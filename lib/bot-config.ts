import { GradeProfile, TargetMode, Timeframe } from "@/lib/trading";
import { DEFAULT_TRACKED_SYMBOLS, parseTrackedSymbols } from "@/lib/watchlist";

export type ApiDataSource = "Alpaca" | "Massive";

export type BrokerExecutionMode = "Supabase Simulation" | "Alpaca Paper" | "Alpaca Live" | "Real Locked";

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
  longOnly: boolean;
  allowStaleSimulation: boolean;
  scanLimit: number;
  brokerMode: BrokerExecutionMode;
  brokerPaperEnabled: boolean;
  brokerLiveEnabled: boolean;
  customSymbols?: string;
};

// v8.7: admin tracked symbols are the source of truth for the cloud bot.
// BOT_SYMBOLS can still override the saved list from Vercel if needed.
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

export function getTrackedSymbols(limit = 100) {
  const source = process.env.BOT_SYMBOLS || DEFAULT_TRACKED_SYMBOLS;
  return parseSymbols(source, Number.isFinite(limit) ? limit : 100);
}

export function getCloudBotSettings(): CloudBotSettings {
  const scanLimit = envNumber("BOT_SCAN_LIMIT", 100);
  return {
    enabled: envBoolean("BOT_ENABLED", true),
    paperTradingEnabled: envBoolean("BOT_PAPER_TRADING_ENABLED", true),
    universeLabel: TRACKED_WATCHLIST_LABEL,
    symbols: getTrackedSymbols(scanLimit),
    timeframe: (process.env.BOT_TIMEFRAME as Timeframe) || "15Min",
    source: "Alpaca",
    minScore: envNumber("BOT_MIN_SCORE", 80),
    maxScore: envNumber("BOT_MAX_SCORE", 89),
    minRR: envNumber("BOT_MIN_RR", 1),
    maxStaleMinutes: envNumber("BOT_MAX_STALE_MINUTES", 30),
    maxOpenPositions: envNumber("BOT_MAX_OPEN_POSITIONS", 4),
    startingEquity: envNumber("BOT_STARTING_EQUITY", 5000),
    riskPct: envNumber("BOT_RISK_PCT", 1),
    maxPositionPct: envNumber("BOT_MAX_POSITION_PCT", 25),
    targetMode: (process.env.BOT_TARGET_MODE as TargetMode) || "Structure",
    fixedTargetR: envNumber("BOT_FIXED_TARGET_R", 1.6),
    atrTargetMultiple: envNumber("BOT_ATR_TARGET_MULTIPLE", 2),
    gradeProfile: (process.env.BOT_GRADE_PROFILE as GradeProfile) || "Pullback",
    longOnly: envBoolean("BOT_LONG_ONLY", true),
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
};

function applyControlRow(base: CloudBotSettings, row?: BotControlRow | null): CloudBotSettings {
  if (!row) return base;
  const scanLimit = Number(row.scan_limit ?? base.scanLimit);
  const symbolSource = (row.custom_symbols || "").trim() || base.customSymbols || DEFAULT_TRACKED_SYMBOLS;
  const symbols = parseSymbols(symbolSource, Number.isFinite(scanLimit) ? scanLimit : base.scanLimit);
  return {
    ...base,
    enabled: typeof row.bot_enabled === "boolean" ? row.bot_enabled : base.enabled,
    paperTradingEnabled: typeof row.paper_trading_enabled === "boolean" ? row.paper_trading_enabled : base.paperTradingEnabled,
    universeLabel: TRACKED_WATCHLIST_LABEL,
    symbols,
    timeframe: (row.timeframe as Timeframe) || base.timeframe,
    minScore: Number(row.min_score ?? base.minScore),
    maxScore: Number(row.max_score ?? base.maxScore),
    minRR: Number(row.min_rr ?? base.minRR),
    maxOpenPositions: Number(row.max_open_positions ?? base.maxOpenPositions),
    startingEquity: Number(row.starting_equity ?? base.startingEquity),
    riskPct: Number(row.risk_pct ?? base.riskPct),
    maxPositionPct: Number(row.max_position_pct ?? base.maxPositionPct),
    maxStaleMinutes: Number(row.max_stale_minutes ?? base.maxStaleMinutes),
    allowStaleSimulation: typeof row.allow_stale_simulation === "boolean" ? row.allow_stale_simulation : base.allowStaleSimulation,
    scanLimit: Number.isFinite(scanLimit) ? scanLimit : base.scanLimit,
    brokerMode: (row.broker_mode as BrokerExecutionMode) || base.brokerMode,
    brokerPaperEnabled: typeof row.broker_paper_enabled === "boolean" ? row.broker_paper_enabled : base.brokerPaperEnabled,
    brokerLiveEnabled: typeof row.broker_live_enabled === "boolean" ? row.broker_live_enabled : base.brokerLiveEnabled,
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
    notes: "Managed from v8.7 /admin. The tracked symbols list and saved settings are the source of truth for the scheduled cloud bot.",
    broker_mode: "Supabase Simulation",
    broker_paper_enabled: false,
    broker_live_enabled: false,
    custom_symbols: s.customSymbols || DEFAULT_TRACKED_SYMBOLS,
  };
}
