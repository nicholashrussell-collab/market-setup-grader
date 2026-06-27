import { GradeProfile, TargetMode, Timeframe } from "@/lib/trading";

export type ApiDataSource = "Alpaca" | "Massive";

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
};

export const CORE_9_SYMBOLS = "AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA, SPY, QQQ";
export const SUPER_WIDE_100_SYMBOLS = "SPY, QQQ, IWM, DIA, XLK, XLF, XLE, XLY, XLV, XLI, PYPL, DIS, AAPL, NVDA, TSLA, MSFT, AMD, WMT, XOM, KO, JNJ, NFLX, JPM, GOOGL, AMZN, AVGO, COST, V, MA, LLY, UNH, HD, NKE, CRM, MCD, CAT, GE, META, ORCL, IBM, NOW, ADBE, INTU, PLTR, MU, QCOM, TXN, MRK, ABBV, TMO, PEP, SBUX, BA, GS, BAC, CVX, COP, C, MS, BLK, SCHW, AMAT, LRCX, KLAC, INTC, CSCO, PANW, CRWD, SNOW, SHOP, UBER, ABNB, BKNG, TGT, LOW, TJX, PG, CL, EL, MRNA, PFE, ISRG, DHR, CVS, WBA, DE, HON, UPS, FDX, GM, F, RTX, LMT, NOC, LIN, APD, FCX, SLB, OXY, T";
export const SUPER_WIDE_500_SYMBOLS = "AAPL, MSFT, NVDA, AMZN, META, GOOGL, GOOG, AVGO, TSLA, BRK.B, LLY, JPM, V, XOM, UNH, MA, COST, NFLX, WMT, PG, JNJ, HD, ABBV, BAC, KO, PLTR, PM, CRM, ORCL, CVX, CSCO, IBM, WFC, GE, ABT, MCD, LIN, AMD, DIS, MRK, ISRG, NOW, TMO, ACN, GS, INTU, PEP, QCOM, TXN, VZ, BKNG, CAT, RTX, AXP, MS, AMGN, C, SPGI, UBER, LOW, PGR, HON, ETN, BSX, NEE, DHR, BLK, TJX, BA, SCHW, SYK, GILD, ADP, DE, MDT, PANW, COP, LMT, ADI, CB, MMC, UPS, PLD, FI, AMAT, SBUX, BMY, ELV, ANET, MU, LRCX, KLAC, SO, TMUS, ICE, MO, CME, AMT, WM, WELL, CEG, MCO, SHW, EQIX, PH, CI, CDNS, HCA, CRWD, APH, MDLZ, MMM, NKE, MSI, ORLY, TDG, SNPS, AJG, COF, ECL, ZTS, USB, ITW, CVS, EMR, WMB, PYPL, AON, MAR, NOC, CMG, GD, REGN, PNC, FTNT, ROP, TFC, CARR, APD, BK, CSX, FCX, ABNB, NSC, JCI, AZO, AEP, TRV, HLT, TGT, ADSK, URI, SLB, COR, NXPI, RSG, PWR, AFL, GM, MPC, HWM, SRE, PSX, ALL, PCAR, O, OKE, VLO, DHI, GWW, SPG, KMI, FICO, TEL, CPRT, MET, PSA, DFS, AIG, RCL, EW, CCI, MSCI, LHX, AMP, FANG, CMI, KDP, FAST, VST, KMB, KR, KVUE, PAYX, HES, BKR, PRU, PEG, CTVA, ACGL, CTSH, FIS, ODFL, VRSK, EXC, TRGP, YUM, IT, EOG, GEHC, RMD, XEL, GLW, IR, DAL, CHTR, CBOE, EA, LEN, OTIS, MNST, ED, MLM, VMC, MPWR, NUE, DXCM, WAB, IQV, ROK, HPQ, MTB, DD, HIG, GRMN, NDAQ, STZ, AVB, EFX, CBRE, EIX, BRO, FITB, CAH, MCHP, XYL, TSCO, KHC, HPE, DOW, WEC, ANSS, TROW, KEYS, NVR, DTE, FSLR, VLTO, WBD, HAL, HSY, STT, EQR, SYF, GPN, APTV, ADM, PPG, DVN, AWK, WY, WTW, LYB, DOV, WST, BR, CINF, DECK, WDC, ETR, EXR, CHD, TYL, PHM, VTR, AEE, TER, STE, WAT, ZBH, NTAP, RF, PPL, FE, ES, OMC, HUBB, SBAC, MKC, NTRS, CCL, HBAN, LDOS, INVH, GDDY, CNP, CMS, BALL, COO, LULU, DG, LH, LUV, ULTA, J, NDSN, MOH, ESS, PFG, CTAS, TXT, IEX, DPZ, SWKS, STX, AVY, MAS, EG, DRI, HOLX, BBY, CLX, TPR, K, MTCH, CF, TRMB, GEN, AES, PKG, ALLE, JBHT, TSN, ARE, AKAM, IP, EVRG, PTC, WRB, VRSN, SNA, KIM, RL, EPAM, CAG, LKQ, NWSA, UAL, INCY, BAX, FDS, POOL, UDR, ATO, HST, HII, REG, WYNN, NCLH, QRVO, BXP, TAP, BEN, DAY, SJM, FOXA, EMN, MKTX, AOS, CRL, ROL, MHK, FFIV, GNRC, CPB, AIZ, HAS, BWA, ETSY, IVZ, APA, PAYC, CZR, TECH, BIO, CTLT, GL, HSIC, MGM, CMA, MOS, SOLV, FMC, PARA, MRNA, WBA, ENPH, DVA, AAL, XRAY, VFC, NWS, FOX, PNW, ALB, SWK, CE, LW, CTRA, NI, EXPE, FRT, HRL, TFX, NEM, KMX, DOC, MAA, CPT, ZBRA, ALGN, ROST, PFE, JNPR, JBL, WSM, NET, DDOG, SNOW, MDB, TEAM, OKTA, SHOP, SQ, COIN, RBLX, PATH, U, DASH, PINS, TWLO, ZM, DOCU, AFRM, HOOD, SOFI, DKNG, RIVN, LCID, CHWY, SE, BABA, JD, BIDU, TSM, ASML, NVO, ARM, SMCI, DELL, INTC, MRVL, ON, CRUS, ALGM, LSCC, RUN, BE, STEM, PLUG, FCEL, BLNK, VRT, TT, X, CLF, AA, SCCO, TECK, GOLD, AEM, FNV, WPM, RIO, BHP, VALE, NTR, BG, GIS";

export function parseSymbols(value: string, limit = 600) {
  return Array.from(new Set(value.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))).slice(0, limit);
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

export function getUniverseSymbols(label: string) {
  const custom = process.env.BOT_SYMBOLS;
  if (custom) return parseSymbols(custom, envNumber("BOT_SCAN_LIMIT", 120));
  if (label === "Core 9") return parseSymbols(CORE_9_SYMBOLS, 20);
  if (label === "Super Wide 500") return parseSymbols(SUPER_WIDE_500_SYMBOLS, envNumber("BOT_SCAN_LIMIT", 500));
  return parseSymbols(SUPER_WIDE_100_SYMBOLS, envNumber("BOT_SCAN_LIMIT", 120));
}

export function getCloudBotSettings(): CloudBotSettings {
  const universeLabel = process.env.BOT_UNIVERSE || "Super Wide 100";
  return {
    enabled: envBoolean("BOT_ENABLED", true),
    paperTradingEnabled: envBoolean("BOT_PAPER_TRADING_ENABLED", true),
    universeLabel,
    symbols: getUniverseSymbols(universeLabel),
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
    scanLimit: envNumber("BOT_SCAN_LIMIT", universeLabel === "Super Wide 500" ? 500 : 120),
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
};

function applyControlRow(base: CloudBotSettings, row?: BotControlRow | null): CloudBotSettings {
  if (!row) return base;
  const universeLabel = row.universe_label || base.universeLabel;
  const scanLimit = Number(row.scan_limit ?? base.scanLimit);
  return {
    ...base,
    enabled: typeof row.bot_enabled === "boolean" ? row.bot_enabled : base.enabled,
    paperTradingEnabled: typeof row.paper_trading_enabled === "boolean" ? row.paper_trading_enabled : base.paperTradingEnabled,
    universeLabel,
    symbols: getUniverseSymbols(universeLabel).slice(0, Number.isFinite(scanLimit) ? scanLimit : base.scanLimit),
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
    universe_label: s.universeLabel,
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
    notes: "Managed from v7.7 /admin.",
  };
}
