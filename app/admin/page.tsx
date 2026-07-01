"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/trading";
import { DEFAULT_TRACKED_SYMBOLS, parseTrackedSymbols } from "@/lib/watchlist";

type BotControl = {
  id?: string;
  bot_enabled: boolean;
  paper_trading_enabled: boolean;
  universe_label: string;
  timeframe: string;
  min_score: number;
  max_score: number;
  min_rr: number;
  max_open_positions: number;
  starting_equity: number;
  risk_pct: number;
  max_position_pct: number;
  max_stale_minutes: number;
  allow_stale_simulation: boolean;
  scan_limit: number;
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
  no_overnight?: boolean;
};

type BotEvent = { id: string; created_at: string; event_type: string; message: string };
type PaperTrade = { id: string; created_at: string; symbol: string; bias: string; status: string; entry?: number; stop?: number; target?: number; rr?: number; score?: number; shares?: number; risk_dollars?: number; position_value?: number; last_price?: number; unrealized_pnl?: number; result_dollars?: number; result_r?: number; notes?: string; execution_mode?: string; broker_order_id?: string; broker_status?: string };
type BrokerStatus = { configured?: boolean; mode?: string; isPaper?: boolean; isLive?: boolean; liveUnlocked?: boolean; canSubmitOrders?: boolean; realTradingLocked?: boolean; baseUrl?: string; message?: string; error?: string; account?: { buying_power?: string; portfolio_value?: string; equity?: string; cash?: string; status?: string }; orders?: any[]; positions?: any[] };

type BotStatus = {
  ok: boolean;
  configured: boolean;
  message: string;
  market?: { isOpen: boolean; label: string; reason: string };
  settings?: { universeLabel: string; symbols: number; symbolsList?: string[]; customSymbols?: string; timeframe: string; maxOpenPositions: number; paperTradingEnabled: boolean; brokerMode?: string; brokerPaperEnabled?: boolean; brokerLiveEnabled?: boolean; scanLimit?: number; riskPct?: number; minScore?: number; maxScore?: number; minRR?: number; maxStaleMinutes?: number; allowStaleSimulation?: boolean };
  lastEvent?: BotEvent | null;
  events?: BotEvent[];
  openTrades?: PaperTrade[];
  closedTrades?: PaperTrade[];
  broker?: BrokerStatus;
};

type RouteKey = "paper" | "live";
type Tone = "good" | "warn" | "bad" | "info";

const defaultControl: BotControl = {
  bot_enabled: true,
  paper_trading_enabled: false,
  universe_label: "Tracked Symbols",
  timeframe: "15Min",
  min_score: 60,
  max_score: 100,
  min_rr: 1,
  max_open_positions: 4,
  starting_equity: 5000,
  risk_pct: 1,
  max_position_pct: 25,
  max_stale_minutes: 30,
  allow_stale_simulation: false,
  scan_limit: 100,
  notes: "Managed from v9.3 admin. Broker-synced Paper Trading is the default route. Research Lab handles historical simulation/backtesting only.",
  broker_mode: "Alpaca Paper",
  broker_paper_enabled: true,
  broker_live_enabled: false,
  custom_symbols: DEFAULT_TRACKED_SYMBOLS,
  target_mode: "FixedR",
  fixed_target_r: 2.5,
  atr_target_multiple: 2,
  grade_profile: "Pullback",
  direction_filter: "Long",
  regime_filter: "Off",
  session_filter: "MiddayAfternoon",
  setup_type_filter: "AdaptiveBest",
  strategy_engine: "UniversalAdaptiveProV3",
  leader_exit_mode: "Fixed",
  risk_model: "Percent",
  fixed_risk_dollars: 50,
  cooldown_minutes: 60,
  max_bars_to_hold: 120,
  warmup_bars: 200,
  max_new_trades_per_run: 1,
  max_total_open_risk_pct: 8,
  account_type: "Cash",
  margin_multiplier: 1,
  allow_fractional_shares: true,
  allow_shorts: false,
  open_start_minutes_et: 690,
  open_end_minutes_et: 960,
  no_new_trades_first_minutes: 0,
  no_new_trades_last_minutes: 0,
};

function money(value: number) {
  const prefix = value < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

async function readApiJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 500) || "Server returned a non-JSON response.");
  }
}

function routeFromControl(control: BotControl): RouteKey {
  if (control.broker_mode === "Alpaca Live" || control.broker_live_enabled) return "live";
  return "paper";
}

function routePatch(key: RouteKey): Partial<BotControl> {
  if (key === "live") return { broker_mode: "Alpaca Live", broker_paper_enabled: false, broker_live_enabled: true };
  return { broker_mode: "Alpaca Paper", broker_paper_enabled: true, broker_live_enabled: false };
}

function routeLabel(key: RouteKey) {
  if (key === "live") return "Real Money";
  return "Paper Trading";
}

function StatusDot({ tone = "info" }: { tone?: Tone }) {
  return <span className={`state-dot ${tone}`} />;
}

function StatusPill({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

function StatTile({ label, value, helper, tone = "info" }: { label: string; value: string | number; helper?: string; tone?: Tone }) {
  return (
    <div className={`dash-tile ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

function ReadinessCard({ title, status, detail, tone }: { title: string; status: string; detail: string; tone: Tone }) {
  return (
    <div className={`preflight-card-v85 admin-status-card-v87 ${tone}`}>
      <span>{title}</span>
      <strong>{status}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SnapshotRow({ label, value, helper, tone = "info" }: { label: string; value: string; helper?: string; tone?: Tone }) {
  return (
    <div className={`snapshot-row-v87 ${tone}`}>
      <StatusDot tone={tone} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
    </div>
  );
}

function prettyEvent(event?: BotEvent | null) {
  if (!event) return { title: "No bot events yet", detail: "The cloud bot will log here after cron or Run bot now fires." };
  const type = event.event_type;
  if (type === "bot_skipped_market_closed") return { title: "Skipped — market is closed", detail: event.message };
  if (type === "bot_started") return { title: "Bot started a scan", detail: event.message };
  if (type === "bot_completed") return { title: "Bot completed a run", detail: event.message };
  if (type.includes("order_submitted")) return { title: "Paper order submitted", detail: event.message };
  if (type.includes("order_error")) return { title: "Broker order error", detail: event.message };
  if (type.includes("trade_opened")) return { title: "Trade record opened", detail: event.message };
  return { title: event.message || type, detail: type.replaceAll("_", " ") };
}

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [control, setControl] = useState<BotControl>(defaultControl);
  const [bot, setBot] = useState<BotStatus | null>(null);
  const [status, setStatus] = useState("Admin control room loading...");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const selectedRoute = routeFromControl(control);
  const trackedText = (control.custom_symbols || "").trim() || DEFAULT_TRACKED_SYMBOLS;
  const trackedSymbols = parseTrackedSymbols(trackedText);
  const scanLimit = Math.max(1, Number(control.scan_limit || trackedSymbols.length || 100));
  const activeSymbols = trackedSymbols.slice(0, scanLimit);
  const openTrades = bot?.openTrades || [];
  const closedTrades = bot?.closedTrades || [];
  const events = bot?.events || [];
  const realizedPnl = closedTrades.reduce((sum, trade) => sum + Number(trade.result_dollars || 0), 0);
  const unrealizedPnl = openTrades.reduce((sum, trade) => sum + Number(trade.unrealized_pnl || 0), 0);
  const brokerAccountEquity = Number(bot?.broker?.account?.equity || bot?.broker?.account?.portfolio_value || 0);
  const appLedgerEquity = Number(control.starting_equity || 5000) + realizedPnl + unrealizedPnl;
  const useBrokerEquity = brokerAccountEquity > 0;
  const trackedEquity = useBrokerEquity ? brokerAccountEquity : appLedgerEquity;
  const equitySourceLabel = useBrokerEquity ? (selectedRoute === "live" ? "Alpaca Live account" : "Alpaca Paper account") : "Broker account not loaded";
  const brokerPositionCount = bot?.broker?.positions?.length ?? 0;
  const brokerMismatchCount = Math.max(0, openTrades.length - brokerPositionCount);
  const canTrade = control.bot_enabled && control.paper_trading_enabled;
  const brokerMode = selectedRoute === "live" ? "Alpaca Live" : "Alpaca Paper";
  const brokerOk = Boolean(bot?.broker?.canSubmitOrders);
  const marketOpen = Boolean(bot?.market?.isOpen);
  const lastAction = prettyEvent(bot?.lastEvent);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = await readApiJson(res);
      setAuthenticated(Boolean(data.authenticated));
      setPasswordConfigured(Boolean(data.passwordConfigured));
    } finally {
      setCheckingSession(false);
    }
  }, []);

  const loadAdminData = useCallback(async () => {
    const [controlRes, botRes] = await Promise.all([
      fetch("/api/admin/bot-control", { cache: "no-store" }),
      fetch("/api/bot/status", { cache: "no-store" }),
    ]);
    const botData = await readApiJson(botRes);
    setBot(botData);
    const controlData = await readApiJson(controlRes);
    if (controlRes.ok && controlData.control) {
      const merged = { ...defaultControl, ...controlData.control, universe_label: "Tracked Symbols" };
      if (merged.broker_mode !== "Alpaca Live" && !merged.broker_live_enabled) {
        merged.broker_mode = "Alpaca Paper";
        merged.broker_paper_enabled = true;
        merged.broker_live_enabled = false;
      }
      if (!(merged.custom_symbols || "").trim()) merged.custom_symbols = botData?.settings?.customSymbols || DEFAULT_TRACKED_SYMBOLS;
      setControl(merged);
    }
    if (!controlRes.ok) setStatus(controlData.schemaHint || controlData.message || "Could not load admin settings.");
    else setStatus(`Admin synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`);
  }, []);

  useEffect(() => { void loadSession(); }, [loadSession]);
  useEffect(() => {
    if (!authenticated) return;
    void loadAdminData();
    const id = window.setInterval(() => void loadAdminData(), 30_000);
    return () => window.clearInterval(id);
  }, [authenticated, loadAdminData]);

  const login = async () => {
    setLoginError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await readApiJson(res);
    if (!res.ok || !data.ok) {
      setLoginError(data.message || "Could not unlock admin.");
      return;
    }
    setAuthenticated(true);
    setPassword("");
    await loadAdminData();
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  };

  const update = (patch: Partial<BotControl>) => setControl((prev) => ({ ...prev, ...patch, universe_label: "Tracked Symbols" }));

  const saveControl = async (nextControl = control) => {
    setSaving(true);
    setStatus("Saving cloud bot settings...");
    try {
      const normalizedRoute = nextControl.broker_mode === "Alpaca Live" || nextControl.broker_live_enabled
        ? { broker_mode: "Alpaca Live", broker_paper_enabled: false, broker_live_enabled: true }
        : { broker_mode: "Alpaca Paper", broker_paper_enabled: true, broker_live_enabled: false };
      const payload = { ...nextControl, ...normalizedRoute, universe_label: "Tracked Symbols", custom_symbols: (nextControl.custom_symbols || trackedText).trim() };
      const res = await fetch("/api/admin/bot-control", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await readApiJson(res);
      if (!res.ok || !data.ok) throw new Error(data.schemaHint || data.message || "Could not save settings.");
      setControl({ ...defaultControl, ...data.control, universe_label: "Tracked Symbols" });
      setStatus("Saved. The next cron run will use this route, these rules, and this tracked-symbol list.");
      await loadAdminData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const setExecutionRoute = async (key: RouteKey) => {
    const next = { ...control, ...routePatch(key), universe_label: "Tracked Symbols" };
    setControl(next);
    await saveControl(next);
  };

  const quickSetTrading = async (enabled: boolean) => {
    const next = { ...control, bot_enabled: true, paper_trading_enabled: enabled, universe_label: "Tracked Symbols" };
    setControl(next);
    await saveControl(next);
  };

  const toggleEngine = async () => {
    const next = { ...control, bot_enabled: !control.bot_enabled, universe_label: "Tracked Symbols" };
    setControl(next);
    await saveControl(next);
  };

  const runOnce = async () => {
    setRunning(true);
    setStatus("Running one cloud bot cycle from admin...");
    try {
      const res = await fetch("/api/admin/bot-run", { method: "POST" });
      const data = await readApiJson(res);
      if (!res.ok || !data.ok) throw new Error(data.message || "Cloud bot failed.");
      setStatus(data.skipped ? data.message : `Cloud bot finished: ${data.actionable || 0} actionable, ${data.openResult?.opened || 0} opened.`);
      await loadAdminData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Cloud bot failed.");
    } finally {
      setRunning(false);
    }
  };


  const paperKill = async (action: "cancel_orders" | "close_positions") => {
    const label = action === "cancel_orders" ? "cancel open Alpaca Paper orders" : "close Alpaca Paper positions";
    if (!window.confirm(`Paper cleanup: ${label}? This affects the connected Alpaca Paper account.`)) return;
    setStatus(`Running paper kill switch: ${label}...`);
    try {
      const res = await fetch("/api/admin/broker-kill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await readApiJson(res);
      if (!res.ok || !data.ok) throw new Error(data.message || "Paper cleanup failed.");
      setStatus(data.message || "Paper cleanup completed.");
      await loadAdminData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Paper cleanup failed.");
    }
  };

  const paperReset = async (action: "reconcile" | "start_new_test_day") => {
    const label = action === "reconcile" ? "reconcile app-open records with Alpaca Paper" : "start a new paper test day and archive old app-open records";
    if (!window.confirm(`Paper reset: ${label}? This changes Supabase app records, not real-money trading.`)) return;
    setStatus(`Running paper reset: ${label}...`);
    try {
      const res = await fetch("/api/admin/paper-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await readApiJson(res);
      if (!res.ok || !data.ok) throw new Error(data.message || "Paper reset action failed.");
      setStatus(data.message || "Paper reset action completed.");
      await loadAdminData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Paper reset action failed.");
    }
  };

  const readiness = useMemo(() => [
    { title: "Cloud DB", status: bot?.configured ? "Ready" : "Needs setup", tone: bot?.configured ? "good" as Tone : "bad" as Tone, detail: bot?.configured ? "Supabase can store settings, scans, trades, and logs." : bot?.message || "Supabase is not ready." },
    { title: "Engine", status: control.bot_enabled ? "Running" : "Paused", tone: control.bot_enabled ? "good" as Tone : "warn" as Tone, detail: control.bot_enabled ? "Vercel cron may run every 15 minutes." : "Cron route is paused from admin." },
    { title: "Execution", status: canTrade ? "Armed" : "Disarmed", tone: canTrade ? "good" as Tone : "warn" as Tone, detail: canTrade ? "The bot may open paper trades when all gates pass." : "The bot can scan/log, but cannot open new trades." },
    { title: "Market", status: marketOpen ? "Open" : "Closed", tone: marketOpen ? "good" as Tone : "warn" as Tone, detail: bot?.market?.reason || "Market status loads from the bot guard." },
    { title: "Broker", status: brokerOk ? "Ready" : "Blocked", tone: brokerOk ? "good" as Tone : "bad" as Tone, detail: bot?.broker?.message || bot?.broker?.error || "Broker route checking." },
    { title: "Watchlist", status: `${trackedSymbols.length} saved`, tone: activeSymbols.length ? "good" as Tone : "bad" as Tone, detail: `${activeSymbols.length} scanned per run from the editable tracked list.` },
  ], [bot, control.bot_enabled, canTrade, marketOpen, brokerOk, trackedSymbols.length, activeSymbols.length]);

  if (checkingSession) {
    return <main className="dash-shell admin-login-shell"><section className="dash-panel login-card"><h1>Checking admin session...</h1></section></main>;
  }

  if (!passwordConfigured) {
    return <main className="dash-shell admin-login-shell"><section className="dash-panel login-card"><h1>Admin password missing</h1><p>Add ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Vercel Environment Variables, then redeploy.</p></section></main>;
  }

  if (!authenticated) {
    return (
      <main className="dash-shell admin-login-shell">
        <section className="dash-panel login-card">
          <span className="eyebrow">Private admin mode</span>
          <h1>Admin login</h1>
          <p>Unlock the control room. The public viewer is read-only.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void login(); }} placeholder="Admin password" />
          <button onClick={() => void login()}>Unlock admin</button>
          {loginError ? <div className="error-box">{loginError}</div> : null}
          <Link href="/" className="ghost-link">Back to viewer</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="dash-shell public-shell viewer-v79 viewer-v80 viewer-v81 admin-v81 admin-v85 admin-v86 admin-v87 admin-v88 admin-v89">
      <div className="terminal-workspace pro-app-shell admin-workspace admin-workspace-v86 admin-workspace-v87">
        <aside className="viewer-sidebar admin-left-rail admin-left-rail-v87" aria-label="Admin navigation">
          <div className="sidebar-brand">
            <span className="brand-mark">MSG</span>
            <div><strong>Admin Console</strong><small>Cloud bot control</small></div>
          </div>
          <nav className="sidebar-nav route-nav">
            <a href="#status" className="active"><span>Status</span><small>Is it ready?</small></a>
            <a href="#command"><span>Execution</span><small>Where trades go</small></a>
            <a href="#settings"><span>Bot Settings</span><small>Risk and filters</small></a>
            <a href="#positions"><span>Positions</span><small>Broker health</small></a>
            <a href="#watchlist"><span>Watchlist</span><small>{trackedSymbols.length} saved symbols</small></a>
            <a href="#activity"><span>Activity</span><small>Recent bot logs</small></a>
          </nav>
          <div className="sidebar-system-card sidebar-system-v87">
            <StatusDot tone={control.bot_enabled ? "good" : "warn"} />
            <div>
              <strong>{control.bot_enabled ? "Engine running" : "Engine paused"}</strong>
              <small>{routeLabel(selectedRoute)} · broker-synced · {canTrade ? "armed" : "disarmed"}</small>
            </div>
          </div>
          <div className="sidebar-links">
            <Link className="ghost-link compact-link" href="/">Viewer dashboard</Link>
            <Link className="ghost-link compact-link" href="/research">Research lab</Link>
            <button className="secondary compact-link" onClick={() => void logout()}>Logout</button>
          </div>
        </aside>

        <section className="viewer-main-area admin-main-v86 admin-main-v87">
          <header className="viewer-topbar page-header-v81 admin-header-v85 admin-header-v86 admin-header-v87">
            <div>
              <div className="viewer-version-row"><span className="eyebrow">Private control room</span><StatusPill tone="info">v9.3</StatusPill><StatusPill tone={selectedRoute === "live" ? "bad" : "good"}>{selectedRoute === "live" ? "Live locked" : "Broker-synced"}</StatusPill></div>
              <h1>Broker-Synced Trading Control</h1>
              <p>Admin controls broker-connected Paper Trading now and locked Real Money later. Research Lab handles historical backtesting only.</p>
            </div>
            <div className="topbar-rule-card admin-current-state-card-v87">
              <span>Current operating state</span>
              <strong>{canTrade ? `${routeLabel(selectedRoute)} armed` : `${routeLabel(selectedRoute)} disarmed`}</strong>
              <small>{activeSymbols.length} scanned/run · {trackedSymbols.length} saved · {control.timeframe} · {control.fixed_target_r || 2.5}R target · max {control.max_new_trades_per_run || 1} new/run</small>
            </div>
          </header>

          <section id="status" className="viewer-metrics-grid secondary-metrics admin-top-metrics admin-top-metrics-v87">
            <StatTile label="Bot" value={control.bot_enabled ? "Running" : "Paused"} helper={canTrade ? "Execution armed" : "Scan/log only"} tone={control.bot_enabled ? "good" : "warn"} />
            <StatTile label="Mode" value={routeLabel(selectedRoute)} helper={selectedRoute === "live" ? "Live route locked by env gates" : "Alpaca Paper broker-synced"} tone={selectedRoute === "live" ? "bad" : "good"} />
            <StatTile label="Last action" value={lastAction.title} helper={bot?.lastEvent ? formatDateTime(bot.lastEvent.created_at) : lastAction.detail} tone={bot?.lastEvent?.event_type?.includes("error") ? "bad" : "info"} />
            <StatTile label="Tracked equity" value={money(trackedEquity)} helper={useBrokerEquity ? `${equitySourceLabel} · broker is source of truth` : `Waiting for broker · app ledger ${money(appLedgerEquity)}`} tone={useBrokerEquity ? "good" : "warn"} />
            <StatTile label="Broker sync" value={`${openTrades.length} app / ${brokerPositionCount} broker`} helper={brokerMismatchCount ? `${brokerMismatchCount} stale app-open record(s) need sync` : "App records match broker positions"} tone={brokerMismatchCount ? "warn" : "good"} />
          </section>

          <section className="dash-panel preflight-panel-v85 preflight-panel-v86 admin-status-panel-v87">
            <div className="panel-heading-row">
              <div><h2>System status</h2><p>One-glance answer: connected, armed, paper-safe, and scanning the tracked list.</p></div>
              <span className="small-pill">Cron: every 15 min</span>
            </div>
            <div className="preflight-grid-v85 preflight-grid-v87">
              {readiness.map((item) => <ReadinessCard key={item.title} title={item.title} status={item.status} detail={item.detail} tone={item.tone} />)}
            </div>
          </section>

          <section id="command" className="dash-panel execution-panel-v85 execution-panel-v86 execution-panel-v87">
            <div className="panel-heading-row">
              <div><h2>Execution mode</h2><p>Admin is broker-only now: Paper Trading uses Alpaca Paper; Real Money stays locked until explicitly configured.</p></div>
            </div>
            <div className="route-mode-grid-v85 route-mode-grid-v87">
              <button className={`route-mode-card-v85 ${selectedRoute === "paper" ? "selected" : ""}`} onClick={() => void setExecutionRoute("paper")} disabled={saving}>
                <span>Current target</span><strong>Paper Trading</strong><small>Uses Alpaca Paper. Simulated money, real broker-style orders, and broker equity as the source of truth.</small>
              </button>
              <button className={`route-mode-card-v85 live ${selectedRoute === "live" ? "selected" : ""}`} onClick={() => void setExecutionRoute("live")} disabled={saving}>
                <span>Locked</span><strong>Real Money</strong><small>Uses Alpaca Live only after live keys and explicit unlock gates are intentionally configured.</small>
              </button>
            </div>
            <div className="execution-command-bar-v85 execution-command-bar-v87">
              <div>
                <span>Selected route</span>
                <strong>{brokerMode}</strong>
                <small>{canTrade ? "Execution is armed. Cron may open broker-synced paper trades when all gates pass." : "Execution is disarmed. Cron can scan and log, but cannot open new trades."}</small>
              </div>
              <div className="row-actions admin-primary-actions">
                <button onClick={() => void quickSetTrading(true)} disabled={saving || canTrade}>Arm</button>
                <button className="danger" onClick={() => void quickSetTrading(false)} disabled={saving || !control.paper_trading_enabled}>Disarm</button>
                <button className="secondary" onClick={() => void toggleEngine()} disabled={saving}>{control.bot_enabled ? "Pause engine" : "Resume engine"}</button>
                <button className="secondary" onClick={() => void runOnce()} disabled={running}>{running ? "Running..." : "Run once"}</button>
                <button className="secondary" onClick={() => void saveControl()} disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
              </div>
            </div>
            <div className="execution-note">{status}</div>
          </section>

          <section id="settings" className="dash-panel settings-panel-v80 settings-panel-v86 settings-panel-v87">
            <div className="panel-heading-row">
              <div><h2>Best-bot profile + guardrails</h2><p>These are the actual rules the cloud worker will use on the next run. Defaults match the 05/31 corrected best profile.</p></div>
              <span className="small-pill">v9.7 broker-only</span>
            </div>
            <div className="settings-grid admin-settings-grid compact-settings-grid settings-grid-v86 settings-grid-v87">
              <label>Timeframe<select value={control.timeframe} onChange={(e) => update({ timeframe: e.target.value })}><option>1Min</option><option>5Min</option><option>15Min</option><option>30Min</option><option>1Hour</option></select></label>
              <label>Grader profile<select value={control.grade_profile || "Pullback"} onChange={(e) => update({ grade_profile: e.target.value })}><option>Pullback</option><option>Balanced</option><option>Breakout</option></select></label>
              <label>Direction filter<select value={control.direction_filter || "Long"} onChange={(e) => update({ direction_filter: e.target.value, allow_shorts: e.target.value === "Short" || e.target.value === "All" })}><option value="Long">Long Only</option><option value="All">Long + Short</option><option value="Short">Short Only</option></select></label>
              <label>Strategy engine<select value={control.strategy_engine || "UniversalAdaptiveProV3"} onChange={(e) => update({ strategy_engine: e.target.value })}><option>UniversalAdaptiveProV3</option><option>UniversalAdaptiveProV2</option><option>UniversalAdaptivePro</option><option>UniversalAdaptive</option><option>Manual</option></select></label>
              <label>Regime filter<select value={control.regime_filter || "Off"} onChange={(e) => update({ regime_filter: e.target.value })}><option>Off</option><option>BlockLongBear</option><option>LongBullOnly</option><option>ShortBearOnly</option><option>LongBullShortBear</option></select></label>
              <label>Session filter<select value={control.session_filter || "MiddayAfternoon"} onChange={(e) => update({ session_filter: e.target.value })}><option>MiddayAfternoon</option><option>RegularHours</option><option>Morning</option><option>Midday</option><option>Afternoon</option><option>All</option></select></label>
              <label>Setup type<select value={control.setup_type_filter || "AdaptiveBest"} onChange={(e) => update({ setup_type_filter: e.target.value })}><option>AdaptiveBest</option><option>Pullback</option><option>Continuation</option><option>ContinuationPullback</option><option>ExcludeBreakoutChase</option><option>All</option></select></label>
              <label>Scan limit<input type="number" value={control.scan_limit} onChange={(e) => update({ scan_limit: Number(e.target.value) || 100 })} /></label>
              <label>Min score<input type="number" value={control.min_score} onChange={(e) => update({ min_score: Number(e.target.value) || 60 })} /></label>
              <label>Max score<input type="number" value={control.max_score} onChange={(e) => update({ max_score: Number(e.target.value) || 100 })} /></label>
              <label>Min R/R<input type="number" step="0.1" value={control.min_rr} onChange={(e) => update({ min_rr: Number(e.target.value) || 1 })} /></label>
              <label>Target mode<select value={control.target_mode || "FixedR"} onChange={(e) => update({ target_mode: e.target.value })}><option>FixedR</option><option>Structure</option><option>ATR</option></select></label>
              <label>Fixed target R<input type="number" step="0.1" value={control.fixed_target_r ?? 2.5} onChange={(e) => update({ fixed_target_r: Number(e.target.value) || 2.5 })} /></label>
              <label>Leader exit mode<select value={control.leader_exit_mode || "Fixed"} onChange={(e) => update({ leader_exit_mode: e.target.value })}><option>Fixed</option><option>Expanded</option><option>PartialRunner</option></select></label>
              <label>Risk model<select value={control.risk_model || "Percent"} onChange={(e) => update({ risk_model: e.target.value })}><option>Percent</option><option>Fixed</option></select></label>
              <label>Risk per trade %<input type="number" step="0.1" value={control.risk_pct} onChange={(e) => update({ risk_pct: Number(e.target.value) || 1 })} /></label>
              <label>Fixed risk $<input type="number" value={control.fixed_risk_dollars ?? 50} onChange={(e) => update({ fixed_risk_dollars: Number(e.target.value) || 50 })} /></label>
              <label>Max position %<input type="number" step="1" value={control.max_position_pct} onChange={(e) => update({ max_position_pct: Number(e.target.value) || 25 })} /></label>
              <label>Max open trades<input type="number" value={control.max_open_positions} onChange={(e) => update({ max_open_positions: Number(e.target.value) || 4 })} /></label>
              <label>Max new trades/run<input type="number" value={control.max_new_trades_per_run ?? 1} onChange={(e) => update({ max_new_trades_per_run: Number(e.target.value) || 1 })} /></label>
              <label>Max total open risk %<input type="number" step="0.5" value={control.max_total_open_risk_pct ?? 8} onChange={(e) => update({ max_total_open_risk_pct: Number(e.target.value) || 8 })} /></label>
              <label>Cooldown minutes<input type="number" value={control.cooldown_minutes ?? 60} onChange={(e) => update({ cooldown_minutes: Number(e.target.value) || 60 })} /></label>
              <label>Max bars to hold<input type="number" value={control.max_bars_to_hold ?? 120} onChange={(e) => update({ max_bars_to_hold: Number(e.target.value) || 120 })} /></label>
              <label>Warmup bars<input type="number" value={control.warmup_bars ?? 200} onChange={(e) => update({ warmup_bars: Number(e.target.value) || 200 })} /></label>
              <label>Account type<select value={control.account_type || "Cash"} onChange={(e) => update({ account_type: e.target.value, margin_multiplier: e.target.value === "Cash" ? 1 : control.margin_multiplier })}><option>Cash</option><option>Margin</option></select></label>
              <label>Buying power multiple<input type="number" step="0.5" value={control.margin_multiplier ?? 1} onChange={(e) => update({ margin_multiplier: Number(e.target.value) || 1 })} /></label>
              <label>Fractional shares<select value={control.allow_fractional_shares ? "yes" : "no"} onChange={(e) => update({ allow_fractional_shares: e.target.value === "yes" })}><option value="yes">Yes</option><option value="no">No, whole shares only</option></select></label>
              <label>Shorts<select value={control.allow_shorts ? "yes" : "no"} onChange={(e) => update({ allow_shorts: e.target.value === "yes", direction_filter: e.target.value === "yes" ? control.direction_filter : "Long" })}><option value="no">Blocked</option><option value="yes">Allowed</option></select></label>
              <label>Entry start ET<input type="number" value={control.open_start_minutes_et ?? 690} onChange={(e) => update({ open_start_minutes_et: Number(e.target.value) || 690 })} /></label>
              <label>Entry end ET<input type="number" value={control.open_end_minutes_et ?? 960} onChange={(e) => update({ open_end_minutes_et: Number(e.target.value) || 960 })} /></label>
              <label>Overnight holds<select value={control.no_overnight === false ? "allowed" : "blocked"} onChange={(e) => update({ no_overnight: e.target.value === "blocked" })}><option value="blocked">Blocked: no overnight holds</option><option value="allowed">Allowed</option></select></label>
              <label>Max stale minutes<input type="number" value={control.max_stale_minutes} onChange={(e) => update({ max_stale_minutes: Number(e.target.value) || 30 })} /></label>
              <label>Stale simulation<select value={control.allow_stale_simulation ? "on" : "off"} onChange={(e) => update({ allow_stale_simulation: e.target.value === "on" })}><option value="off">OFF: block stale candles</option><option value="on">ON: paper test only</option></select></label>
            </div>
          </section>

          <section id="positions" className="dash-panel settings-panel-v80 settings-panel-v86 settings-panel-v87">
            <div className="panel-heading-row">
              <div><h2>Position manager</h2><p>Readable view of app trade records and Alpaca broker health. Broker positions are the source of truth.</p></div>
              <span className="small-pill">{openTrades.length} open records</span>
            </div>
            <div className="watchlist-summary-v87">
              <div><strong>{openTrades.length}</strong><span>app-open trades</span></div>
              <div><strong>{brokerPositionCount}</strong><span>broker positions</span></div>
              <div><strong>{brokerMismatchCount}</strong><span>stale app records</span></div>
            </div>
            <div className="activity-list timeline-list scroll-card-v86 scroll-card-v87">
              {openTrades.length ? openTrades.map((trade) => (
                <div key={trade.id}>
                  <b>{trade.symbol} · {trade.bias} · {trade.status}</b>
                  <span>Entry {trade.entry ?? "—"} · Stop {trade.stop ?? "—"} · Target {trade.target ?? "—"} · Qty {trade.shares ?? "—"}</span>
                  <small>Risk {trade.risk_dollars ? money(Number(trade.risk_dollars)) : "—"} · Open P/L {money(Number(trade.unrealized_pnl || 0))} · {trade.execution_mode || "app"}</small>
                </div>
              )) : <p className="muted">No open app trade records.</p>}
            </div>
            <div className="execution-command-bar-v85 execution-command-bar-v87">
              <div>
                <span>Broker cleanup</span>
                <strong>Paper Trading only</strong>
                <small>Cancel orders removes waiting broker orders. Close positions exits actual Alpaca Paper holdings. Live mode remains blocked here.</small>
              </div>
              <div className="row-actions admin-primary-actions">
                <button className="danger" onClick={() => void paperKill("cancel_orders")}>Cancel orders</button>
                <button className="danger" onClick={() => void paperKill("close_positions")}>Close all positions</button>
              </div>
            </div>
            <div className="execution-command-bar-v85 execution-command-bar-v87">
              <div>
                <span>App/broker sync</span>
                <strong>Clean app records</strong>
                <small>Sync with broker fixes stale app-open records. Reset app archives old app records and starts a fresh app log from current broker equity.</small>
              </div>
              <div className="row-actions admin-primary-actions">
                <button className="secondary" onClick={() => void paperReset("reconcile")}>Sync with broker</button>
                <button className="danger" onClick={() => void paperReset("start_new_test_day")}>Reset app</button>
              </div>
            </div>
          </section>

          <section id="watchlist" className="dash-panel watchlist-panel-v85 watchlist-panel-v86 watchlist-panel-v87">
            <div className="panel-heading-row">
              <div><h2>Tracked symbols</h2><p>This is the bot watchlist. Add, delete, or reorder symbols here. Scan limit controls how many from the top are scanned per cron run.</p></div>
              <span className="small-pill">{activeSymbols.length} active / {trackedSymbols.length} saved</span>
            </div>
            <div className="watchlist-summary-v87">
              <div><strong>{trackedSymbols.length}</strong><span>saved symbols</span></div>
              <div><strong>{activeSymbols.length}</strong><span>scanned each run</span></div>
              <div><strong>{Math.max(0, trackedSymbols.length - activeSymbols.length)}</strong><span>waiting below scan limit</span></div>
            </div>
            <div className="symbol-chip-list-v85 symbol-chip-list-v86 symbol-chip-list-v87">
              {activeSymbols.slice(0, 220).map((symbol) => <span key={symbol}>{symbol}</span>)}
              {activeSymbols.length > 220 ? <span>+{activeSymbols.length - 220} more</span> : null}
            </div>
            <label className="full-width-label">Editable tracked-symbol list<textarea rows={10} value={trackedText} placeholder="AAPL, MSFT, NVDA, SPY, QQQ" onChange={(e) => update({ custom_symbols: e.target.value })} /></label>
            <div className="watchlist-actions-v86 watchlist-actions-v87">
              <button className="secondary" onClick={() => update({ custom_symbols: DEFAULT_TRACKED_SYMBOLS, scan_limit: 100 })}>Load default 500 symbols</button>
              <button onClick={() => void saveControl()} disabled={saving}>{saving ? "Saving..." : "Save watchlist and settings"}</button>
            </div>
            <label className="full-width-label">Admin notes<textarea rows={3} value={control.notes || ""} onChange={(e) => update({ notes: e.target.value })} /></label>
          </section>
        </section>

        <aside className="viewer-inspector admin-inspector admin-inspector-v86 admin-inspector-v87 admin-inspector-v88" aria-label="Admin status rail">
          <div className="rail-title-v88 admin-rail-title-v88">
            <span className="eyebrow">Control rail</span>
            <h2>Live command status</h2>
            <p>Everything here is summary-only. Make changes in the center admin panels.</p>
          </div>

          <section className="dash-panel inspector-card system-snapshot-card inspector-hero-v87 rail-card-v88">
            <h2>Now</h2>
            <div className="snapshot-stack-v87 compact-admin-rail-v88">
              <SnapshotRow label="Bot" value={control.bot_enabled ? "Running" : "Paused"} helper={canTrade ? "Execution armed" : "Execution disarmed"} tone={control.bot_enabled ? "good" : "warn"} />
              <SnapshotRow label="Route" value={routeLabel(selectedRoute)} helper={selectedRoute === "live" ? "Live route selected but locked unless live gates pass." : "Alpaca Paper broker route selected."} tone={selectedRoute === "live" ? "bad" : "good"} />
              <SnapshotRow label="Watchlist" value={`${activeSymbols.length} / ${trackedSymbols.length}`} helper="Scanned per run / saved symbols." tone="info" />
              <SnapshotRow label="Last action" value={lastAction.title} helper={lastAction.detail} tone={bot?.lastEvent?.event_type?.includes("error") ? "bad" : "info"} />
            </div>
          </section>

          <section className="dash-panel inspector-card system-snapshot-card rail-card-v88">
            <h2>Broker + records</h2>
            <div className="rule-stack readable-stack-v87 compact-rule-stack-v88">
              <div><span>Connection</span><strong>{bot?.broker?.canSubmitOrders ? "Order route ready" : "Blocked"}</strong><small>{bot?.broker?.message || bot?.broker?.error || "Broker status loading."}</small></div>
              <div><span>Paper account</span><strong>{bot?.broker?.account?.portfolio_value ? money(Number(bot.broker.account.portfolio_value)) : "—"}</strong><small>{bot?.broker?.account?.buying_power ? `${money(Number(bot.broker.account.buying_power))} buying power · equity source ${useBrokerEquity ? "broker" : "app"}` : "No broker account loaded."}</small></div>
              <div><span>Records</span><strong>{openTrades.length} app-open · {brokerPositionCount} broker positions</strong><small>{brokerMismatchCount ? `${brokerMismatchCount} stale app record(s) need reconcile.` : `${bot?.broker?.orders?.length ?? 0} broker orders currently loaded.`}</small></div>
            </div>
          </section>

          <section id="activity" className="dash-panel inspector-card rail-card-v88">
            <div className="panel-heading-row"><div><h2>Latest activity</h2><p>Recent scheduled or manual bot events.</p></div><span className="small-pill">{events.length}</span></div>
            <div className="activity-list timeline-list scroll-card-v86 scroll-card-v87 rail-activity-list-v88">
              {events.length ? events.slice(0, 12).map((event) => <div key={event.id}><b>{formatDateTime(event.created_at)}</b><span>{prettyEvent(event).title}</span><small>{event.message}</small></div>) : <p className="muted">No cloud events yet.</p>}
            </div>
          </section>

          <section className="dash-panel inspector-card research-memory-card safety-card-v87 rail-card-v88">
            <h2>Safety</h2>
            <div className="research-list compact-safety-v88">
              <div><strong>Current goal</strong><span>Autonomous Alpaca Paper trading that runs cleanly in the cloud.</span></div>
              <div><strong>Real money</strong><span>Live trading remains locked behind live credentials and explicit unlock variables.</span></div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
