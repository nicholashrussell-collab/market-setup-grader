"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TradingChart from "@/components/TradingChart";
import {
  AppMode,
  Candle,
  GradeProfile,
  GradeResult,
  TargetMode,
  Timeframe,
  formatDateTime,
  gradeSetup,
} from "@/lib/trading";

type ApiDataSource = "Alpaca" | "Massive";
type AlpacaAdjustment = "raw" | "split" | "dividend" | "all";
type BotMode = "paper" | "signals";

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
  lastPrice: number;
};

type PaperPosition = {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  bias: "Long" | "Short";
  status: "Open" | "Closed";
  openedAt: string;
  signalTime: string;
  entry: number;
  stop: number;
  target: number;
  rr: number;
  score: number;
  setup: string;
  regime: string;
  state: string;
  shares: number;
  riskDollars: number;
  positionValue: number;
  lastPrice: number;
  unrealizedPnl: number;
  realizedPnl?: number;
  resultR?: number;
  closeReason?: string;
  closedAt?: string;
  notes?: string;
};

type CloudHealth = {
  configured: boolean;
  message?: string;
  urlHost?: string;
};

type CloudRunSummary = {
  id: string;
  created_at: string;
  universe_label?: string;
  timeframe?: string;
  candidates_count?: number;
  actionable_count?: number;
};

const TIMEFRAMES: Timeframe[] = ["1Min", "5Min", "15Min", "30Min", "1Hour"];
const POSITIONS_KEY = "market-setup-grader-v7-4-paper-positions";
const ACTIVITY_KEY = "market-setup-grader-v7-4-activity";
const SETTINGS_KEY = "market-setup-grader-v7-4-settings";

const CORE_9_SYMBOLS = "AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA, SPY, QQQ";
const SUPER_WIDE_100_SYMBOLS = "SPY, QQQ, IWM, DIA, XLK, XLF, XLE, XLY, XLV, XLI, PYPL, DIS, AAPL, NVDA, TSLA, MSFT, AMD, WMT, XOM, KO, JNJ, NFLX, JPM, GOOGL, AMZN, AVGO, COST, V, MA, LLY, UNH, HD, NKE, CRM, MCD, CAT, GE, META, ORCL, IBM, NOW, ADBE, INTU, PLTR, MU, QCOM, TXN, MRK, ABBV, TMO, PEP, SBUX, BA, GS, BAC, CVX, COP, C, MS, BLK, SCHW, AMAT, LRCX, KLAC, INTC, CSCO, PANW, CRWD, SNOW, SHOP, UBER, ABNB, BKNG, TGT, LOW, TJX, PG, CL, EL, MRNA, PFE, ISRG, DHR, CVS, WBA, DE, HON, UPS, FDX, GM, F, RTX, LMT, NOC, LIN, APD, FCX, SLB, OXY, T";
const SUPER_WIDE_500_SYMBOLS = "AAPL, MSFT, NVDA, AMZN, META, GOOGL, GOOG, AVGO, TSLA, BRK.B, LLY, JPM, V, XOM, UNH, MA, COST, NFLX, WMT, PG, JNJ, HD, ABBV, BAC, KO, PLTR, PM, CRM, ORCL, CVX, CSCO, IBM, WFC, GE, ABT, MCD, LIN, AMD, DIS, MRK, ISRG, NOW, TMO, ACN, GS, INTU, PEP, QCOM, TXN, VZ, BKNG, CAT, RTX, AXP, MS, AMGN, C, SPGI, UBER, LOW, PGR, HON, ETN, BSX, NEE, DHR, BLK, TJX, BA, SCHW, SYK, GILD, ADP, DE, MDT, PANW, COP, LMT, ADI, CB, MMC, UPS, PLD, FI, AMAT, SBUX, BMY, ELV, ANET, MU, LRCX, KLAC, SO, TMUS, ICE, MO, CME, AMT, WM, WELL, CEG, MCO, SHW, EQIX, PH, CI, CDNS, HCA, CRWD, APH, MDLZ, MMM, NKE, MSI, ORLY, TDG, SNPS, AJG, COF, ECL, ZTS, USB, ITW, CVS, EMR, WMB, PYPL, AON, MAR, NOC, CMG, GD, REGN, PNC, FTNT, ROP, TFC, CARR, APD, BK, CSX, FCX, ABNB, NSC, JCI, AZO, AEP, TRV, HLT, TGT, ADSK, URI, SLB, COR, NXPI, RSG, PWR, AFL, GM, MPC, HWM, SRE, PSX, ALL, PCAR, O, OKE, VLO, DHI, GWW, SPG, KMI, FICO, TEL, CPRT, MET, PSA, DFS, AIG, RCL, EW, CCI, MSCI, LHX, AMP, FANG, CMI, KDP, FAST, VST, KMB, KR, KVUE, PAYX, HES, BKR, PRU, PEG, CTVA, ACGL, CTSH, FIS, ODFL, VRSK, EXC, TRGP, YUM, IT, EOG, GEHC, RMD, XEL, GLW, IR, DAL, CHTR, CBOE, EA, LEN, OTIS, MNST, ED, MLM, VMC, MPWR, NUE, DXCM, WAB, IQV, ROK, HPQ, MTB, DD, HIG, GRMN, NDAQ, STZ, AVB, EFX, CBRE, EIX, BRO, FITB, CAH, MCHP, XYL, TSCO, KHC, HPE, DOW, WEC, ANSS, TROW, KEYS, NVR, DTE, FSLR, VLTO, WBD, HAL, HSY, STT, EQR, SYF, GPN, APTV, ADM, PPG, DVN, AWK, WY, WTW, LYB, DOV, WST, BR, CINF, DECK, WDC, ETR, EXR, CHD, TYL, PHM, VTR, AEE, TER, STE, WAT, ZBH, NTAP, RF, PPL, FE, ES, OMC, HUBB, SBAC, MKC, NTRS, CCL, HBAN, LDOS, INVH, GDDY, CNP, CMS, BALL, COO, LULU, DG, LH, LUV, ULTA, J, NDSN, MOH, ESS, PFG, CTAS, TXT, IEX, DPZ, SWKS, STX, AVY, MAS, EG, DRI, HOLX, BBY, CLX, TPR, K, MTCH, CF, TRMB, GEN, AES, PKG, ALLE, JBHT, TSN, ARE, AKAM, IP, EVRG, PTC, WRB, VRSN, SNA, KIM, RL, EPAM, CAG, LKQ, NWSA, UAL, INCY, BAX, FDS, POOL, UDR, ATO, HST, HII, REG, WYNN, NCLH, QRVO, BXP, TAP, BEN, DAY, SJM, FOXA, EMN, MKTX, AOS, CRL, ROL, MHK, FFIV, GNRC, CPB, AIZ, HAS, BWA, ETSY, IVZ, APA, PAYC, CZR, TECH, BIO, CTLT, GL, HSIC, MGM, CMA, MOS, SOLV, FMC, PARA, MRNA, WBA, ENPH, DVA, AAL, XRAY, VFC, NWS, FOX, PNW, ALB, SWK, CE, LW, CTRA, NI, EXPE, FRT, HRL, TFX, NEM, KMX, DOC, MAA, CPT, ZBRA, ALGN, ROST, PFE, JNPR, JBL, WSM, NET, DDOG, SNOW, MDB, TEAM, OKTA, SHOP, SQ, COIN, RBLX, PATH, U, DASH, PINS, TWLO, ZM, DOCU, AFRM, HOOD, SOFI, DKNG, RIVN, LCID, CHWY, SE, BABA, JD, BIDU, TSM, ASML, NVO, ARM, SMCI, DELL, INTC, MRVL, ON, CRUS, ALGM, LSCC, RUN, BE, STEM, PLUG, FCEL, BLNK, VRT, TT, X, CLF, AA, SCCO, TECK, GOLD, AEM, FNV, WPM, RIO, BHP, VALE, NTR, BG, GIS";

function parseSymbols(value: string) {
  return Array.from(new Set(value.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))).slice(0, 600);
}

function barsApiUrl(source: ApiDataSource, params: { symbol: string; timeframe: Timeframe; mode?: "latest" | "range"; limit?: number; start?: string; end?: string; adjustment?: AlpacaAdjustment; }) {
  const search = new URLSearchParams({
    symbol: params.symbol.toUpperCase(),
    timeframe: params.timeframe,
    mode: params.mode || "latest",
  });
  if (params.limit) search.set("limit", String(params.limit));
  if (params.start) search.set("start", params.start);
  if (params.end) search.set("end", params.end);
  if (params.adjustment) search.set("adjustment", params.adjustment);
  return source === "Massive" ? `/api/massive/bars?${search.toString()}` : `/api/alpaca/bars?${search.toString()}`;
}

function money(value: number) {
  return `$${Math.round(value * 100) / 100}`;
}

function pct(value: number) {
  return `${Math.round(value * 100) / 100}%`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value >= 100 ? value.toFixed(2) : value.toFixed(3);
}

function safeLatestPrice(candles: Candle[]) {
  return candles[candles.length - 1]?.close || 0;
}

function createPosition(candidate: LiveScanCandidate, settings: { equity: number; riskPct: number; maxPositionPct: number; timeframe: Timeframe; }): PaperPosition | null {
  if (candidate.bias !== "Long" && candidate.bias !== "Short") return null;
  const riskPerShare = Math.abs(candidate.entry - candidate.stop);
  if (!Number.isFinite(riskPerShare) || riskPerShare <= 0) return null;
  const targetRisk = settings.equity * (settings.riskPct / 100);
  const maxPositionValue = settings.equity * (settings.maxPositionPct / 100);
  const rawShares = targetRisk / riskPerShare;
  const cappedShares = Math.max(0, Math.min(rawShares, maxPositionValue / Math.max(candidate.entry, 0.01)));
  if (!Number.isFinite(cappedShares) || cappedShares <= 0) return null;
  const now = new Date().toISOString();
  const id = `${candidate.symbol}-${candidate.latestTime}-${candidate.bias}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    symbol: candidate.symbol,
    timeframe: settings.timeframe,
    bias: candidate.bias as "Long" | "Short",
    status: "Open",
    openedAt: now,
    signalTime: candidate.latestTime,
    entry: candidate.entry,
    stop: candidate.stop,
    target: candidate.target,
    rr: candidate.rr,
    score: candidate.score,
    setup: candidate.setup,
    regime: candidate.regime,
    state: candidate.state,
    shares: Number(cappedShares.toFixed(4)),
    riskDollars: Number((riskPerShare * cappedShares).toFixed(2)),
    positionValue: Number((candidate.entry * cappedShares).toFixed(2)),
    lastPrice: candidate.lastPrice || candidate.entry,
    unrealizedPnl: 0,
    notes: "Paper trade opened by v7.4 live dashboard. No broker order was placed.",
  };
}

function updatePositionFromCandles(position: PaperPosition, candles: Candle[]): PaperPosition {
  if (position.status !== "Open" || !candles.length) return position;
  const latest = safeLatestPrice(candles);
  let closePrice = 0;
  let closeReason = "";
  let closedAt = "";
  for (const candle of candles) {
    if (new Date(candle.time).getTime() < new Date(position.signalTime).getTime()) continue;
    if (position.bias === "Long") {
      if (candle.low <= position.stop) {
        closePrice = position.stop;
        closeReason = "Stop hit";
        closedAt = candle.time;
        break;
      }
      if (candle.high >= position.target) {
        closePrice = position.target;
        closeReason = "Target hit";
        closedAt = candle.time;
        break;
      }
    } else {
      if (candle.high >= position.stop) {
        closePrice = position.stop;
        closeReason = "Stop hit";
        closedAt = candle.time;
        break;
      }
      if (candle.low <= position.target) {
        closePrice = position.target;
        closeReason = "Target hit";
        closedAt = candle.time;
        break;
      }
    }
  }
  const direction = position.bias === "Long" ? 1 : -1;
  const unrealizedPnl = (latest - position.entry) * position.shares * direction;
  if (!closePrice) {
    return { ...position, lastPrice: latest, unrealizedPnl: Number(unrealizedPnl.toFixed(2)) };
  }
  const realizedPnl = (closePrice - position.entry) * position.shares * direction;
  const resultR = position.riskDollars > 0 ? realizedPnl / position.riskDollars : 0;
  return {
    ...position,
    status: "Closed",
    lastPrice: closePrice,
    unrealizedPnl: 0,
    realizedPnl: Number(realizedPnl.toFixed(2)),
    resultR: Number(resultR.toFixed(2)),
    closeReason,
    closedAt,
  };
}

function StatTile({ label, value, helper, tone }: { label: string; value: string | number; helper?: string; tone?: "good" | "warn" | "bad" }) {
  return <div className={`dash-tile ${tone || ""}`}><span>{label}</span><strong>{value}</strong>{helper ? <small>{helper}</small> : null}</div>;
}

export default function Home() {
  const [mode, setMode] = useState<AppMode>("Live");
  const [dataSource, setDataSource] = useState<ApiDataSource>("Alpaca");
  const [timeframe, setTimeframe] = useState<Timeframe>("15Min");
  const [universeLabel, setUniverseLabel] = useState("Super Wide 100");
  const [symbolsText, setSymbolsText] = useState(SUPER_WIDE_100_SYMBOLS);
  const [selectedSymbol, setSelectedSymbol] = useState("SPY");
  const [selectedCandles, setSelectedCandles] = useState<Candle[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeResult | null>(null);
  const [candidates, setCandidates] = useState<LiveScanCandidate[]>([]);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [cloudHealth, setCloudHealth] = useState<CloudHealth | null>(null);
  const [cloudRuns, setCloudRuns] = useState<CloudRunSummary[]>([]);
  const [status, setStatus] = useState("Ready. Dashboard is paper-only; no broker orders are placed.");
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isCheckingPositions, setIsCheckingPositions] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(300);
  const [progress, setProgress] = useState({ current: "", done: 0, total: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [botMode, setBotMode] = useState<BotMode>("paper");
  const [startingEquity, setStartingEquity] = useState(5000);
  const [riskPct, setRiskPct] = useState(1);
  const [maxPositionPct, setMaxPositionPct] = useState(25);
  const [maxOpenPositions, setMaxOpenPositions] = useState(4);
  const [minScore, setMinScore] = useState(80);
  const [maxScore, setMaxScore] = useState(89);
  const [minRR, setMinRR] = useState(1);
  const [maxStaleMinutes, setMaxStaleMinutes] = useState(30);
  const [targetMode, setTargetMode] = useState<TargetMode>("Structure");
  const [gradeProfile, setGradeProfile] = useState<GradeProfile>("Pullback");
  const [fixedTargetR, setFixedTargetR] = useState(1.6);
  const [atrTargetMultiple, setAtrTargetMultiple] = useState(2);
  const chartCache = useRef(new Map<string, { candles: Candle[]; grade: GradeResult | null; loadedAt: string }>());
  const scanInFlight = useRef(false);

  const symbols = useMemo(() => parseSymbols(symbolsText), [symbolsText]);
  const openPositions = positions.filter((p) => p.status === "Open");
  const closedPositions = positions.filter((p) => p.status === "Closed");
  const realizedPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const unrealizedPnl = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const currentEquity = startingEquity + realizedPnl + unrealizedPnl;
  const actionable = candidates.filter((c) => c.actionable);
  const selectedPosition = positions.find((p) => p.symbol === selectedSymbol && p.status === "Open") || positions.find((p) => p.symbol === selectedSymbol);

  const addActivity = useCallback((message: string) => {
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setActivity((prev) => [`${stamp} · ${message}`, ...prev].slice(0, 80));
  }, []);

  useEffect(() => {
    try {
      const rawPositions = localStorage.getItem(POSITIONS_KEY);
      const rawActivity = localStorage.getItem(ACTIVITY_KEY);
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawPositions) setPositions(JSON.parse(rawPositions));
      if (rawActivity) setActivity(JSON.parse(rawActivity));
      if (rawSettings) {
        const saved = JSON.parse(rawSettings);
        if (saved.timeframe) setTimeframe(saved.timeframe);
        if (saved.universeLabel) setUniverseLabel(saved.universeLabel);
        if (saved.symbolsText) setSymbolsText(saved.symbolsText);
        if (saved.startingEquity) setStartingEquity(saved.startingEquity);
        if (saved.riskPct) setRiskPct(saved.riskPct);
        if (saved.maxPositionPct) setMaxPositionPct(saved.maxPositionPct);
        if (saved.maxOpenPositions) setMaxOpenPositions(saved.maxOpenPositions);
        if (saved.minScore) setMinScore(saved.minScore);
        if (saved.maxScore) setMaxScore(saved.maxScore);
        if (saved.minRR) setMinRR(saved.minRR);
      }
    } catch {
      // Keep the dashboard usable even if local storage is malformed.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  }, [activity]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ timeframe, universeLabel, symbolsText, startingEquity, riskPct, maxPositionPct, maxOpenPositions, minScore, maxScore, minRR }));
  }, [timeframe, universeLabel, symbolsText, startingEquity, riskPct, maxPositionPct, maxOpenPositions, minScore, maxScore, minRR]);

  const targetSettings = useMemo(() => ({ mode: targetMode, fixedR: fixedTargetR, atrMultiple: atrTargetMultiple }), [targetMode, fixedTargetR, atrTargetMultiple]);
  const gradeSettings = useMemo(() => ({ profile: gradeProfile }), [gradeProfile]);

  const fetchSymbolChart = useCallback(async (scanSymbol: string, reason = "manual") => {
    const normalized = scanSymbol.toUpperCase();
    setSelectedSymbol(normalized);
    const cached = chartCache.current.get(`${normalized}|${timeframe}|${targetMode}|${gradeProfile}`);
    if (cached && Date.now() - new Date(cached.loadedAt).getTime() < 60_000) {
      setSelectedCandles(cached.candles);
      setSelectedGrade(cached.grade);
      return { candles: cached.candles, grade: cached.grade };
    }
    setIsLoadingChart(true);
    setError("");
    try {
      const res = await fetch(barsApiUrl(dataSource, { symbol: normalized, timeframe, mode: "latest", limit: 250 }));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
      const nextCandles: Candle[] = data.bars || [];
      const nextGrade = gradeSetup(nextCandles, timeframe, new Date(), targetSettings, gradeSettings);
      setSelectedCandles(nextCandles);
      setSelectedGrade(nextGrade);
      chartCache.current.set(`${normalized}|${timeframe}|${targetMode}|${gradeProfile}`, { candles: nextCandles, grade: nextGrade, loadedAt: new Date().toISOString() });
      setStatus(`Loaded ${normalized} chart (${reason}).`);
      return { candles: nextCandles, grade: nextGrade };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load chart.";
      setError(message);
      setStatus(message);
      return { candles: [], grade: null };
    } finally {
      setIsLoadingChart(false);
    }
  }, [dataSource, timeframe, targetSettings, gradeSettings, targetMode, gradeProfile]);

  useEffect(() => {
    void fetchSymbolChart(selectedSymbol, "initial load");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const makeCandidate = useCallback((scanSymbol: string, scanCandles: Candle[], g: GradeResult): LiveScanCandidate => {
    const latestTime = scanCandles[scanCandles.length - 1]?.time || g.latestCandleTime || "";
    const staleMinutes = latestTime ? Math.max(0, Math.round((Date.now() - new Date(latestTime).getTime()) / 60000)) : 999999;
    const rr = Number.isFinite(g.rr) ? g.rr : 0;
    const isFreshEnough = mode === "Research" || staleMinutes <= maxStaleMinutes;
    const actionableRow = g.bias !== "Neutral" && g.score >= minScore && g.score <= maxScore && rr >= minRR && isFreshEnough;
    const priority = (actionableRow ? 1000 : 0) + g.score * 10 + rr - Math.min(staleMinutes, 500) / 100;
    return {
      symbol: scanSymbol,
      score: g.score,
      bias: g.bias,
      setup: g.setupType,
      regime: g.marketRegime,
      state: g.marketRegime || "—",
      rr,
      entry: g.entry,
      stop: g.stop,
      target: g.target,
      latestTime,
      staleMinutes,
      actionable: actionableRow,
      priority,
      reasons: g.reasons || [],
      warnings: g.warnings || [],
      lastPrice: safeLatestPrice(scanCandles),
    };
  }, [maxScore, maxStaleMinutes, minRR, minScore, mode]);

  const runLiveScan = useCallback(async (reason = "manual") => {
    if (scanInFlight.current) return [] as LiveScanCandidate[];
    scanInFlight.current = true;
    setIsScanning(true);
    setError("");
    setProgress({ current: "", done: 0, total: symbols.length });
    const rows: LiveScanCandidate[] = [];
    try {
      for (let index = 0; index < symbols.length; index += 1) {
        const scanSymbol = symbols[index];
        setProgress({ current: scanSymbol, done: index + 1, total: symbols.length });
        try {
          const res = await fetch(barsApiUrl(dataSource, { symbol: scanSymbol, timeframe, mode: "latest", limit: 250 }));
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
          const scanCandles: Candle[] = data.bars || [];
          const g = gradeSetup(scanCandles, timeframe, new Date(), targetSettings, gradeSettings);
          if (g) rows.push(makeCandidate(scanSymbol, scanCandles, g));
          if (scanSymbol === selectedSymbol) {
            setSelectedCandles(scanCandles);
            setSelectedGrade(g);
            chartCache.current.set(`${scanSymbol}|${timeframe}|${targetMode}|${gradeProfile}`, { candles: scanCandles, grade: g, loadedAt: new Date().toISOString() });
          }
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
            lastPrice: 0,
          });
        }
        if (index % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const sorted = rows.sort((a, b) => b.priority - a.priority || b.score - a.score);
      setCandidates(sorted);
      const count = sorted.filter((r) => r.actionable).length;
      setStatus(`Live scan complete: ${count}/${symbols.length} actionable setups.`);
      addActivity(`Scan complete: ${count}/${symbols.length} actionable setups (${reason}).`);
      return sorted;
    } finally {
      scanInFlight.current = false;
      setIsScanning(false);
      setProgress((prev) => ({ ...prev, current: "" }));
    }
  }, [symbols, dataSource, timeframe, targetSettings, gradeSettings, makeCandidate, selectedSymbol, targetMode, gradeProfile, addActivity]);

  const saveScanToCloud = useCallback(async (rows = candidates) => {
    if (!rows.length) {
      setStatus("Run a scan before saving to cloud DB.");
      return;
    }
    setIsSavingCloud(true);
    try {
      const res = await fetch("/api/cloud/save-live-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "v7.4-live-dashboard-save",
          source: dataSource,
          timeframe,
          mode,
          universeLabel: `${universeLabel} · v7.4 paper dashboard`,
          symbolsCount: symbols.length,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          settings: { minScore, maxScore, minRR, maxOpenPositions, riskPct, maxPositionPct, paperOnly: true },
          candidates: rows,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || "Cloud save failed.");
      setStatus(`Saved scan to cloud DB: ${data.savedSignals} signals, ${data.actionableCount} actionable.`);
      addActivity(`Saved scan to cloud DB: ${data.savedSignals} signals.`);
      await loadRecentCloudRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cloud save failed.";
      setStatus(message);
      addActivity(`Cloud save failed: ${message}`);
    } finally {
      setIsSavingCloud(false);
    }
  }, [addActivity, candidates, dataSource, timeframe, mode, universeLabel, symbols.length, minScore, maxScore, minRR, maxOpenPositions, riskPct, maxPositionPct]);

  const loadRecentCloudRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/cloud/recent?limit=5", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Could not load recent cloud scans.");
      setCloudRuns(Array.isArray(data.runs) ? data.runs : []);
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
      setStatus(data.configured ? `Cloud DB connected (${data.urlHost}).` : data.message || "Cloud DB not configured.");
      await loadRecentCloudRuns();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cloud health check failed.";
      setCloudHealth({ configured: false, message });
      setStatus(message);
    } finally {
      setIsCheckingCloud(false);
    }
  }, [loadRecentCloudRuns]);

  useEffect(() => {
    void checkCloudStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTopPaperTrades = useCallback((rows = candidates) => {
    const currentOpen = positions.filter((p) => p.status === "Open");
    const openSymbols = new Set(currentOpen.map((p) => p.symbol));
    const slots = Math.max(0, maxOpenPositions - currentOpen.length);
    if (!slots) {
      setStatus("No open paper slots available. Close/check positions first.");
      return [] as PaperPosition[];
    }
    const top = rows.filter((r) => r.actionable && (r.bias === "Long" || r.bias === "Short") && !openSymbols.has(r.symbol)).slice(0, slots);
    const nextPositions = top.map((row) => createPosition(row, { equity: currentEquity, riskPct, maxPositionPct, timeframe })).filter(Boolean) as PaperPosition[];
    if (!nextPositions.length) {
      setStatus("No new actionable setups to open as paper trades.");
      return [] as PaperPosition[];
    }
    setPositions((prev) => [...nextPositions, ...prev]);
    addActivity(`Opened ${nextPositions.length} paper trade(s): ${nextPositions.map((p) => p.symbol).join(", ")}.`);
    setStatus(`Opened ${nextPositions.length} paper trade(s). No broker orders placed.`);
    return nextPositions;
  }, [addActivity, candidates, currentEquity, maxOpenPositions, maxPositionPct, positions, riskPct, timeframe]);

  const runBotCycle = useCallback(async () => {
    const rows = await runLiveScan("bot cycle");
    if (botMode === "paper") openTopPaperTrades(rows);
    await saveScanToCloud(rows);
  }, [botMode, openTopPaperTrades, runLiveScan, saveScanToCloud]);

  const checkOpenPositions = useCallback(async () => {
    const open = positions.filter((p) => p.status === "Open");
    if (!open.length) {
      setStatus("No open paper positions to check.");
      return;
    }
    setIsCheckingPositions(true);
    const updated: PaperPosition[] = [];
    for (const pos of positions) {
      if (pos.status !== "Open") {
        updated.push(pos);
        continue;
      }
      try {
        const res = await fetch(barsApiUrl(dataSource, { symbol: pos.symbol, timeframe: pos.timeframe, mode: "latest", limit: 250 }));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || JSON.stringify(data.details || data));
        const nextCandles: Candle[] = data.bars || [];
        updated.push(updatePositionFromCandles(pos, nextCandles));
      } catch {
        updated.push(pos);
      }
    }
    const beforeClosed = positions.filter((p) => p.status === "Closed").length;
    const afterClosed = updated.filter((p) => p.status === "Closed").length;
    setPositions(updated);
    const newlyClosed = afterClosed - beforeClosed;
    setStatus(`Checked ${open.length} open paper position(s). ${newlyClosed} newly closed.`);
    if (newlyClosed > 0) addActivity(`${newlyClosed} paper position(s) closed after stop/target check.`);
    setIsCheckingPositions(false);
  }, [addActivity, dataSource, positions]);

  useEffect(() => {
    if (!autoScan) return;
    const id = window.setInterval(() => {
      void runBotCycle();
    }, Math.max(60, refreshSeconds) * 1000);
    return () => window.clearInterval(id);
  }, [autoScan, refreshSeconds, runBotCycle]);

  const chooseUniverse = (label: string) => {
    setUniverseLabel(label);
    if (label === "Core 9") setSymbolsText(CORE_9_SYMBOLS);
    if (label === "Super Wide 100") setSymbolsText(SUPER_WIDE_100_SYMBOLS);
    if (label === "Super Wide 500") setSymbolsText(SUPER_WIDE_500_SYMBOLS);
  };

  const resetPaperPortfolio = () => {
    if (!window.confirm("Clear all local paper positions and activity? This does not touch cloud scan logs.")) return;
    setPositions([]);
    setActivity([]);
    setStatus("Local paper portfolio cleared.");
  };

  const manualClosePosition = (id: string) => {
    setPositions((prev) => prev.map((p) => {
      if (p.id !== id || p.status !== "Open") return p;
      const direction = p.bias === "Long" ? 1 : -1;
      const closePrice = p.lastPrice || p.entry;
      const realizedPnl = (closePrice - p.entry) * p.shares * direction;
      return { ...p, status: "Closed", realizedPnl: Number(realizedPnl.toFixed(2)), resultR: Number((realizedPnl / Math.max(p.riskDollars, 0.01)).toFixed(2)), closeReason: "Manual close", closedAt: new Date().toISOString(), unrealizedPnl: 0 };
    }));
    addActivity("Manually closed one paper position.");
  };

  const statusTone = cloudHealth?.configured ? "good" : "warn";
  const selectedCandidate = candidates.find((c) => c.symbol === selectedSymbol);

  return (
    <main className="dash-shell">
      <header className="dash-header">
        <div>
          <div className="eyebrow">Paper-live trading dashboard</div>
          <h1>Market Setup Grader v7.4</h1>
          <p>Simple live dashboard for paper trading: scan stocks, open paper positions, track the portfolio, and inspect the bot's decisions. No real broker orders are placed.</p>
        </div>
        <div className="dash-header-actions">
          <a className="secondary ghost-link" href="/research">Open old research lab</a>
          <button className="secondary" onClick={() => setShowSettings((v) => !v)}>{showSettings ? "Hide settings" : "Bot settings"}</button>
          <button onClick={() => void runBotCycle()} disabled={isScanning || isSavingCloud}>{isScanning ? `Scanning ${progress.current || "..."}` : "Run bot cycle"}</button>
        </div>
      </header>

      <section className="dash-status-row">
        <StatTile label="Paper equity" value={money(currentEquity)} helper={`${money(realizedPnl)} realized · ${money(unrealizedPnl)} open`} tone={currentEquity >= startingEquity ? "good" : "bad"} />
        <StatTile label="Open positions" value={openPositions.length} helper={`${closedPositions.length} closed paper trades`} />
        <StatTile label="Latest scan" value={candidates.length ? `${actionable.length} actionable` : "Not scanned"} helper={candidates.length ? `${candidates.length} symbols ranked` : `${symbols.length} symbols loaded`} />
        <StatTile label="Cloud DB" value={cloudHealth?.configured ? "Connected" : "Not ready"} helper={cloudHealth?.urlHost || cloudHealth?.message || "Checking..."} tone={statusTone} />
      </section>

      <section className="dash-command-card">
        <div className="command-left">
          <label>Universe
            <select value={universeLabel} onChange={(e) => chooseUniverse(e.target.value)}>
              <option>Core 9</option>
              <option>Super Wide 100</option>
              <option>Super Wide 500</option>
              <option>Custom</option>
            </select>
          </label>
          <label>Timeframe
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
              {TIMEFRAMES.map((tf) => <option key={tf}>{tf}</option>)}
            </select>
          </label>
          <label>Paper mode
            <select value={botMode} onChange={(e) => setBotMode(e.target.value as BotMode)}>
              <option value="paper">Open paper trades</option>
              <option value="signals">Signals only</option>
            </select>
          </label>
          <label>Auto scan
            <select value={autoScan ? "on" : "off"} onChange={(e) => setAutoScan(e.target.value === "on")}>
              <option value="off">OFF</option>
              <option value="on">ON</option>
            </select>
          </label>
        </div>
        <div className="command-actions">
          <button onClick={() => void runLiveScan("manual")} disabled={isScanning}>{isScanning ? "Scanning..." : "Scan now"}</button>
          <button className="secondary" onClick={() => openTopPaperTrades()} disabled={!actionable.length}>Open top paper trades</button>
          <button className="secondary" onClick={() => void checkOpenPositions()} disabled={isCheckingPositions || !openPositions.length}>{isCheckingPositions ? "Checking..." : "Check positions"}</button>
          <button className="secondary" onClick={() => void saveScanToCloud()} disabled={isSavingCloud || !candidates.length}>{isSavingCloud ? "Saving..." : "Save scan"}</button>
        </div>
        {isScanning ? <div className="scan-progress"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /> <b>{progress.current}</b> {progress.done}/{progress.total}</div> : null}
        <div className="status-line">{status}</div>
        {error ? <div className="error-box">{error}</div> : null}
      </section>

      {showSettings ? (
        <section className="dash-settings panel-lite">
          <h3>Bot settings</h3>
          <p className="muted small">These are the live/paper rules. Backtest controls are hidden in the old research lab.</p>
          <div className="form-grid settings-grid">
            <label>Starting paper equity <input type="number" value={startingEquity} onChange={(e) => setStartingEquity(Number(e.target.value) || 5000)} /></label>
            <label>Risk per trade % <input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value) || 1)} /></label>
            <label>Max position % <input type="number" value={maxPositionPct} onChange={(e) => setMaxPositionPct(Number(e.target.value) || 25)} /></label>
            <label>Max open trades <input type="number" value={maxOpenPositions} onChange={(e) => setMaxOpenPositions(Number(e.target.value) || 4)} /></label>
            <label>Min score <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value) || 80)} /></label>
            <label>Max score <input type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value) || 89)} /></label>
            <label>Min R/R <input type="number" step="0.1" value={minRR} onChange={(e) => setMinRR(Number(e.target.value) || 1)} /></label>
            <label>Max stale minutes <input type="number" value={maxStaleMinutes} onChange={(e) => setMaxStaleMinutes(Number(e.target.value) || 30)} /></label>
            <label>Refresh seconds <input type="number" min={60} value={refreshSeconds} onChange={(e) => setRefreshSeconds(Number(e.target.value) || 300)} /></label>
            <label>Data source <select value={dataSource} onChange={(e) => setDataSource(e.target.value as ApiDataSource)}><option value="Alpaca">Alpaca</option><option value="Massive">Massive</option></select></label>
            <label>Data mode <select value={mode} onChange={(e) => setMode(e.target.value as AppMode)}><option value="Live">Live: stale signals blocked</option><option value="Research">Research: delayed/stale allowed</option></select></label>
            <label>Grader profile <select value={gradeProfile} onChange={(e) => setGradeProfile(e.target.value as GradeProfile)}><option value="Pullback">Pullback/reclaim</option><option value="Balanced">Balanced</option><option value="Breakout">Breakout</option></select></label>
            <label>Target mode <select value={targetMode} onChange={(e) => setTargetMode(e.target.value as TargetMode)}><option value="Structure">Structure</option><option value="FixedR">Fixed R</option><option value="ATR">ATR</option></select></label>
            <label>Fixed target R <input type="number" step="0.1" value={fixedTargetR} onChange={(e) => setFixedTargetR(Number(e.target.value) || 1.6)} /></label>
            <label>ATR multiple <input type="number" step="0.1" value={atrTargetMultiple} onChange={(e) => setAtrTargetMultiple(Number(e.target.value) || 2)} /></label>
          </div>
          <label className="full-width-label">Symbols to scan
            <textarea value={symbolsText} onChange={(e) => { setUniverseLabel("Custom"); setSymbolsText(e.target.value); }} rows={4} />
          </label>
          <div className="row-actions"><button className="secondary small" onClick={() => void checkCloudStatus()} disabled={isCheckingCloud}>{isCheckingCloud ? "Checking..." : "Check cloud DB"}</button><button className="secondary small" onClick={resetPaperPortfolio}>Clear local paper portfolio</button></div>
        </section>
      ) : null}

      <section className="dash-main-grid">
        <div className="dash-left-column">
          <section className="dash-panel chart-panel">
            <div className="panel-heading-row">
              <div><h2>{selectedSymbol} chart</h2><p>{selectedGrade ? `${selectedGrade.bias} · score ${selectedGrade.score} · ${selectedGrade.setupType}` : "Click a stock or run a scan."}</p></div>
              <button className="secondary small" onClick={() => void fetchSymbolChart(selectedSymbol, "refresh chart")} disabled={isLoadingChart}>{isLoadingChart ? "Loading..." : "Refresh chart"}</button>
            </div>
            <TradingChart candles={selectedCandles} grade={selectedGrade} />
          </section>

          <section className="dash-panel">
            <div className="panel-heading-row"><div><h2>Live ranked stocks</h2><p>Click any row to inspect the chart without losing scan or portfolio data.</p></div><span className="small-pill">{candidates.length || 0} scanned</span></div>
            <div className="table-wrap compact live-table">
              <table>
                <thead><tr><th>Symbol</th><th>Score</th><th>Bias</th><th>Setup</th><th>R/R</th><th>Last</th><th>Status</th></tr></thead>
                <tbody>
                  {(candidates.length ? candidates : symbols.slice(0, 25).map((s) => ({ symbol: s } as LiveScanCandidate))).slice(0, 40).map((row) => (
                    <tr key={row.symbol} className={`${row.symbol === selectedSymbol ? "selected-row" : ""} ${row.actionable ? "action-row" : ""}`} onClick={() => void fetchSymbolChart(row.symbol, "row click")}>
                      <td><button className="text-button">{row.symbol}</button></td>
                      <td>{row.score ?? "—"}</td>
                      <td>{row.bias || "—"}</td>
                      <td>{row.setup || "—"}</td>
                      <td>{row.rr ? row.rr.toFixed(2) : "—"}</td>
                      <td>{row.lastPrice ? formatPrice(row.lastPrice) : "—"}</td>
                      <td>{row.actionable ? "Paper candidate" : row.warnings?.[0] || "Watch"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="dash-right-column">
          <section className="dash-panel selected-card">
            <h2>{selectedSymbol}</h2>
            {selectedGrade ? <div className="selected-score"><span>{selectedGrade.score}</span><div><strong>{selectedGrade.bias}</strong><small>{selectedGrade.setupType}</small></div></div> : <p className="muted">No grade loaded yet.</p>}
            <div className="mini-stack">
              <StatTile label="Entry" value={selectedGrade ? formatPrice(selectedGrade.entry) : "—"} />
              <StatTile label="Stop" value={selectedGrade ? formatPrice(selectedGrade.stop) : "—"} />
              <StatTile label="Target" value={selectedGrade ? formatPrice(selectedGrade.target) : "—"} />
              <StatTile label="R/R" value={selectedGrade ? `${selectedGrade.rr}:1` : "—"} />
            </div>
            {selectedCandidate ? <p className="setup-summary">{selectedCandidate.actionable ? "This setup passes current paper rules." : "This setup does not currently pass paper rules."} {selectedCandidate.warnings[0] || selectedCandidate.reasons[0] || "Review chart and rules before taking action."}</p> : null}
            {selectedPosition ? <div className="position-note"><strong>{selectedPosition.status} paper position</strong><br />Entry {formatPrice(selectedPosition.entry)} · Last {formatPrice(selectedPosition.lastPrice)} · P/L {money((selectedPosition.realizedPnl || 0) + selectedPosition.unrealizedPnl)}</div> : null}
          </section>

          <section className="dash-panel">
            <div className="panel-heading-row"><div><h2>Paper portfolio</h2><p>Local paper tracker. This is not a broker account.</p></div></div>
            <div className="position-list">
              {positions.length ? positions.slice(0, 12).map((p) => (
                <div key={p.id} className={`position-row ${p.status.toLowerCase()}`} onClick={() => void fetchSymbolChart(p.symbol, "position click")}>
                  <div><strong>{p.symbol}</strong><span>{p.bias} · {p.status}</span></div>
                  <div><strong>{money((p.realizedPnl || 0) + p.unrealizedPnl)}</strong><span>{p.resultR !== undefined ? `${p.resultR}R` : `${formatPrice(p.lastPrice)} last`}</span></div>
                  {p.status === "Open" ? <button className="secondary tiny-button" onClick={(e) => { e.stopPropagation(); manualClosePosition(p.id); }}>Close</button> : null}
                </div>
              )) : <p className="muted">No paper trades yet. Run a bot cycle or open top paper trades after a scan.</p>}
            </div>
          </section>

          <section className="dash-panel">
            <h2>Activity log</h2>
            <div className="activity-list">
              {activity.length ? activity.slice(0, 18).map((item) => <div key={item}>{item}</div>) : <p className="muted">No activity yet.</p>}
            </div>
          </section>

          <section className="dash-panel">
            <h2>Cloud scans</h2>
            <div className={`pill-card ${cloudHealth?.configured ? "good" : "warn"}`}><span>Status</span><strong>{cloudHealth?.configured ? "Connected" : "Not connected"}</strong><small>{cloudHealth?.urlHost || cloudHealth?.message || "Add Supabase variables in Vercel."}</small></div>
            {cloudRuns.length ? <div className="cloud-mini-list">{cloudRuns.map((r) => <div key={r.id}><strong>{r.actionable_count || 0} actionable</strong><span>{formatDateTime(r.created_at)} · {r.candidates_count || 0} signals</span></div>)}</div> : <p className="muted small">No saved cloud scans loaded yet.</p>}
          </section>
        </aside>
      </section>
    </main>
  );
}
