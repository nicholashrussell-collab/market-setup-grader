"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/trading";

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
};
type BotEvent = { id: string; created_at: string; event_type: string; message: string };
type PaperTrade = { id: string; created_at: string; symbol: string; bias: string; status: string; entry?: number; stop?: number; target?: number; last_price?: number; unrealized_pnl?: number; result_dollars?: number; result_r?: number; notes?: string };
type BrokerStatus = { configured?: boolean; mode?: string; isPaper?: boolean; isLive?: boolean; liveUnlocked?: boolean; canSubmitOrders?: boolean; realTradingLocked?: boolean; baseUrl?: string; message?: string; error?: string; account?: { buying_power?: string; portfolio_value?: string; cash?: string; status?: string }; orders?: any[]; positions?: any[] };

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

type RouteKey = "internal" | "paper" | "live";

const defaultControl: BotControl = {
  bot_enabled: true,
  paper_trading_enabled: false,
  universe_label: "Super Wide 100",
  timeframe: "15Min",
  min_score: 80,
  max_score: 89,
  min_rr: 1,
  max_open_positions: 4,
  starting_equity: 5000,
  risk_pct: 1,
  max_position_pct: 25,
  max_stale_minutes: 30,
  allow_stale_simulation: false,
  scan_limit: 100,
  notes: "Managed from v8.5 admin. Saved settings are the source of truth for the scheduled cloud bot.",
  broker_mode: "Supabase Simulation",
  broker_paper_enabled: false,
  broker_live_enabled: false,
  custom_symbols: "",
};

function money(value: number) { const prefix = value < 0 ? "-$" : "$"; return `${prefix}${Math.abs(value).toFixed(2)}`; }
async function readApiJson(res: Response) { const text = await res.text(); if (!text) return {}; try { return JSON.parse(text); } catch { throw new Error(text.slice(0, 500) || "Server returned a non-JSON response."); } }
function StatTile({ label, value, helper, tone }: { label: string; value: string | number; helper?: string; tone?: "good" | "warn" | "bad" }) { return <div className={`dash-tile ${tone || ""}`}><span>{label}</span><strong>{value}</strong>{helper ? <small>{helper}</small> : null}</div>; }
function routeFromControl(control: BotControl): RouteKey { if (control.broker_mode === "Alpaca Live" || control.broker_live_enabled) return "live"; if (control.broker_mode === "Alpaca Paper" || control.broker_paper_enabled) return "paper"; return "internal"; }
function routePatch(key: RouteKey): Partial<BotControl> { if (key === "paper") return { broker_mode: "Alpaca Paper", broker_paper_enabled: true, broker_live_enabled: false }; if (key === "live") return { broker_mode: "Alpaca Live", broker_paper_enabled: false, broker_live_enabled: true }; return { broker_mode: "Supabase Simulation", broker_paper_enabled: false, broker_live_enabled: false }; }

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [control, setControl] = useState<BotControl>(defaultControl);
  const [bot, setBot] = useState<BotStatus | null>(null);
  const [status, setStatus] = useState("Admin control center loading...");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const openTrades = bot?.openTrades || [];
  const closedTrades = bot?.closedTrades || [];
  const events = bot?.events || [];
  const realizedPnl = closedTrades.reduce((sum, trade) => sum + Number(trade.result_dollars || 0), 0);
  const unrealizedPnl = openTrades.reduce((sum, trade) => sum + Number(trade.unrealized_pnl || 0), 0);
  const trackedEquity = Number(control.starting_equity || 5000) + realizedPnl + unrealizedPnl;
  const canTrade = control.bot_enabled && control.paper_trading_enabled;
  const selectedRoute = routeFromControl(control);
  const brokerMode = control.broker_mode || "Supabase Simulation";
  const symbolList = bot?.settings?.symbolsList || [];
  const customSymbolsActive = Boolean((control.custom_symbols || "").trim());

  const loadSession = useCallback(async () => { try { const res = await fetch("/api/admin/session", { cache: "no-store" }); const data = await readApiJson(res); setAuthenticated(Boolean(data.authenticated)); setPasswordConfigured(Boolean(data.passwordConfigured)); } finally { setCheckingSession(false); } }, []);
  const loadAdminData = useCallback(async () => {
    const [controlRes, botRes] = await Promise.all([fetch("/api/admin/bot-control", { cache: "no-store" }), fetch("/api/bot/status", { cache: "no-store" })]);
    const botData = await readApiJson(botRes); setBot(botData);
    const controlData = await readApiJson(controlRes);
    if (controlRes.ok && controlData.control) setControl({ ...defaultControl, ...controlData.control });
    if (!controlRes.ok) setStatus(controlData.schemaHint || controlData.message || "Could not load admin settings.");
    else setStatus(`Admin synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`);
  }, []);
  useEffect(() => { void loadSession(); }, [loadSession]);
  useEffect(() => { if (!authenticated) return; void loadAdminData(); const id = window.setInterval(() => void loadAdminData(), 30_000); return () => window.clearInterval(id); }, [authenticated, loadAdminData]);

  const login = async () => { setLoginError(""); const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const data = await readApiJson(res); if (!res.ok || !data.ok) { setLoginError(data.message || "Could not unlock admin."); return; } setAuthenticated(true); setPassword(""); await loadAdminData(); };
  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuthenticated(false); };
  const saveControl = async (nextControl = control) => { setSaving(true); setStatus("Saving cloud bot settings..."); try { const res = await fetch("/api/admin/bot-control", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextControl) }); const data = await readApiJson(res); if (!res.ok || !data.ok) throw new Error(data.schemaHint || data.message || "Could not save settings."); setControl({ ...defaultControl, ...data.control }); setStatus("Cloud bot settings saved. The next cron run will use these rules."); await loadAdminData(); } catch (err) { setStatus(err instanceof Error ? err.message : "Could not save settings."); } finally { setSaving(false); } };
  const update = (patch: Partial<BotControl>) => setControl((prev) => ({ ...prev, ...patch }));
  const setExecutionRoute = async (key: RouteKey) => { const next = { ...control, ...routePatch(key) }; setControl(next); await saveControl(next); };
  const quickSetTrading = async (enabled: boolean) => { const next = { ...control, bot_enabled: true, paper_trading_enabled: enabled }; setControl(next); await saveControl(next); };
  const toggleEngine = async () => { const next = { ...control, bot_enabled: !control.bot_enabled }; setControl(next); await saveControl(next); };
  const runOnce = async () => { setRunning(true); setStatus("Running one cloud bot cycle from admin..."); try { const res = await fetch("/api/admin/bot-run", { method: "POST" }); const data = await readApiJson(res); if (!res.ok || !data.ok) throw new Error(data.message || "Cloud bot failed."); setStatus(data.skipped ? data.message : `Cloud bot finished: ${data.actionable || 0} actionable, ${data.openResult?.opened || 0} opened.`); await loadAdminData(); } catch (err) { setStatus(err instanceof Error ? err.message : "Cloud bot failed."); } finally { setRunning(false); } };

  const riskSummary = useMemo(() => `${control.risk_pct}% risk · ${control.max_position_pct}% max position · ${control.max_open_positions} max open`, [control]);
  const activeProfile = `${control.universe_label} · ${control.scan_limit} max symbols · ${control.timeframe}`;
  const tradeGate = `Scores ${control.min_score}-${control.max_score} · min R/R ${control.min_rr} · stale guard ${control.max_stale_minutes}m`;
  const brokerConfigOk = selectedRoute === "internal" || Boolean(bot?.broker?.canSubmitOrders);
  const liveReady = selectedRoute !== "live" || Boolean(bot?.broker?.canSubmitOrders);
  const preflight = [
    { label: "1. Cloud database", ok: Boolean(bot?.configured), detail: bot?.configured ? "Supabase is connected and can store settings/logs." : bot?.message || "Supabase not ready." },
    { label: "2. Bot engine", ok: Boolean(control.bot_enabled), detail: control.bot_enabled ? "Cron cycles are allowed to run." : "Engine is paused; cron calls will skip." },
    { label: "3. Trade execution", ok: Boolean(control.paper_trading_enabled), detail: control.paper_trading_enabled ? "The selected route may open trades when rules pass." : "Entries are disarmed; scans/logs may still run." },
    { label: "4. Market guard", ok: Boolean(bot?.market?.isOpen), warnOnly: true, detail: bot?.market?.isOpen ? "Market appears open." : bot?.market?.reason || "Market appears closed; expected outside hours." },
    { label: "5. Broker route", ok: brokerConfigOk, detail: selectedRoute === "internal" ? "Internal paper mode does not require broker keys." : bot?.broker?.message || bot?.broker?.error || "Broker status loading." },
    { label: "6. Watchlist", ok: symbolList.length > 0 || Number(control.scan_limit) > 0, detail: customSymbolsActive ? `Custom list enabled. ${symbolList.length || control.scan_limit} symbols loaded.` : `${control.universe_label} universe, capped at ${control.scan_limit}.` },
  ];

  if (checkingSession) return <main className="dash-shell admin-login-shell"><section className="dash-panel login-panel"><h1>Checking admin session...</h1><p className="muted">Loading private control center.</p></section></main>;
  if (!authenticated) return <main className="dash-shell admin-login-shell"><section className="dash-panel login-panel"><span className="eyebrow">Private control center</span><h1>Admin Login</h1><p>This page controls the cloud bot. The public homepage is view-only.</p>{!passwordConfigured ? <div className="error-box">ADMIN_PASSWORD is not set in Vercel. Add it in Project Settings → Environment Variables, then redeploy.</div> : null}<label>Admin password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void login(); }} /></label><div className="row-actions"><button onClick={() => void login()} disabled={!passwordConfigured || !password}>Unlock admin</button><Link className="ghost-link" href="/">Back to dashboard</Link></div>{loginError ? <div className="error-box">{loginError}</div> : null}</section></main>;

  return (
    <main className="dash-shell public-shell viewer-v79 viewer-v80 viewer-v81 admin-v80 admin-v81 admin-v85">
      <div className="terminal-workspace admin-workspace">
        <aside className="viewer-sidebar" aria-label="Admin navigation"><div className="sidebar-brand"><span className="brand-mark">MSG</span><div><strong>Admin Console</strong><small>Cloud bot control</small></div></div><nav className="route-nav"><a href="#preflight" className="active"><span>Preflight</span><small>Connections and gates</small></a><a href="#command"><span>Execution</span><small>Where trades go</small></a><a href="#settings"><span>Settings</span><small>Risk and scan rules</small></a><a href="#watchlist"><span>Watchlist</span><small>Symbols tracked</small></a><a href="#activity"><span>Activity</span><small>Cloud bot logs</small></a></nav><div className="sidebar-system-card"><span className={`state-dot ${control.bot_enabled ? "good" : "warn"}`} /><div><strong>{control.bot_enabled ? "Engine running" : "Engine paused"}</strong><small>{canTrade ? `${brokerMode} armed` : "Entries disarmed"}</small></div></div><div className="sidebar-links"><Link className="ghost-link compact-link" href="/">Viewer dashboard</Link><Link className="ghost-link compact-link" href="/research">Research lab</Link><button className="secondary compact-link" onClick={() => void logout()}>Logout</button></div></aside>
        <section className="viewer-main-area">
          <header className="viewer-topbar admin-topbar-v80 admin-header-v85"><div><div className="viewer-version-row"><span className="eyebrow">Private admin mode</span><span className="status-badge info">v8.5</span><span className="status-badge good">Source of truth</span></div><h1>Bot Control Panel</h1><p>Set how and where the cloud bot runs. The settings saved here are what cron reads every cycle.</p></div><div className="topbar-rule-card"><span>Current route</span><strong>{brokerMode}</strong><small>{activeProfile} · {riskSummary}</small></div></header>
          <section className="viewer-metrics-grid secondary-metrics"><StatTile label="Tracked equity" value={money(trackedEquity)} helper={`${money(realizedPnl)} realized · ${money(unrealizedPnl)} open`} tone={trackedEquity >= Number(control.starting_equity || 5000) ? "good" : "bad"} /><StatTile label="Open records" value={openTrades.length} helper={`${closedTrades.length} recent closed loaded`} /><StatTile label="Last event" value={bot?.lastEvent ? bot.lastEvent.event_type : "—"} helper={bot?.lastEvent ? formatDateTime(bot.lastEvent.created_at) : "No events yet"} /><StatTile label="Rules summary" value={control.universe_label} helper={`${control.scan_limit} symbols · ${control.timeframe} · score ${control.min_score}-${control.max_score}`} /></section>
          <section id="preflight" className="dash-panel preflight-panel-v85"><div className="panel-heading-row"><div><h2>Trading preflight</h2><p>These boxes show whether the system is ready to scan, log, and place trades through the selected route.</p></div><span className="small-pill">Every 15 min</span></div><div className="preflight-grid-v85">{preflight.map((item) => <div key={item.label} className={`preflight-card-v85 ${item.ok ? "ok" : item.warnOnly ? "warn" : "bad"}`}><span>{item.label}</span><strong>{item.ok ? "Ready" : item.warnOnly ? "Info" : "Needs attention"}</strong><small>{item.detail}</small></div>)}</div></section>
          <section id="command" className="dash-panel execution-panel-v85"><div className="panel-heading-row"><div><h2>Execution command</h2><p>Pick where trades go. The bot uses the same strategy settings below in all three modes.</p></div></div><div className="route-mode-grid-v85"><button className={`route-mode-card-v85 ${selectedRoute === "internal" ? "selected" : ""}`} onClick={() => void setExecutionRoute("internal")} disabled={saving}><span>Mode 1</span><strong>Internal paper trading</strong><small>Trades are tracked inside Supabase and shown on the website. No Alpaca broker orders.</small></button><button className={`route-mode-card-v85 ${selectedRoute === "paper" ? "selected" : ""}`} onClick={() => void setExecutionRoute("paper")} disabled={saving}><span>Mode 2</span><strong>Alpaca paper trading</strong><small>Orders go to Alpaca Paper. The app still logs and displays the full audit trail.</small></button><button className={`route-mode-card-v85 live ${selectedRoute === "live" ? "selected" : ""}`} onClick={() => void setExecutionRoute("live")} disabled={saving}><span>Mode 3</span><strong>Alpaca real money</strong><small>Uses the same bot settings, but live orders only work if Vercel live unlock variables and live keys pass.</small></button></div><div className="execution-command-bar-v85"><div><span>Selected route</span><strong>{brokerMode}</strong><small>{selectedRoute === "live" && !liveReady ? "Live route selected, but live broker submission is still blocked by env/preflight gates." : canTrade ? "Execution is armed. Cron may open trades when rules pass." : "Execution is disarmed. Cron can scan/log but cannot open new trades."}</small></div><div className="row-actions admin-primary-actions"><button className="secondary" onClick={() => void quickSetTrading(true)} disabled={saving || canTrade}>Arm execution</button><button className="danger" onClick={() => void quickSetTrading(false)} disabled={saving || !control.paper_trading_enabled}>Disarm</button><button className="secondary" onClick={() => void toggleEngine()} disabled={saving}>{control.bot_enabled ? "Pause engine" : "Resume engine"}</button><button onClick={() => void runOnce()} disabled={running}>{running ? "Running..." : "Run once"}</button><button className="secondary" onClick={() => void saveControl()} disabled={saving}>{saving ? "Saving..." : "Save all"}</button></div></div><div className="execution-note">{status}</div></section>
          <section id="settings" className="dash-panel settings-panel-v80"><div className="panel-heading-row"><div><h2>Additional bot settings</h2><p>These settings control what the cloud bot scans, how much it risks, and which setups are allowed. Percentages and test defaults are not forced by a preset.</p></div></div><div className="settings-grid admin-settings-grid compact-settings-grid"><label>Universe<select value={control.universe_label} onChange={(e) => update({ universe_label: e.target.value })}><option>Core 9</option><option>Super Wide 100</option><option>Super Wide 500</option></select></label><label>Timeframe<select value={control.timeframe} onChange={(e) => update({ timeframe: e.target.value })}><option>1Min</option><option>5Min</option><option>15Min</option><option>30Min</option><option>1Hour</option></select></label><label>Scan limit<input type="number" value={control.scan_limit} onChange={(e) => update({ scan_limit: Number(e.target.value) || 100 })} /></label><label>Starting / tracked equity<input type="number" value={control.starting_equity} onChange={(e) => update({ starting_equity: Number(e.target.value) || 5000 })} /></label><label>Risk per trade %<input type="number" step="0.1" value={control.risk_pct} onChange={(e) => update({ risk_pct: Number(e.target.value) || 1 })} /></label><label>Max position %<input type="number" step="1" value={control.max_position_pct} onChange={(e) => update({ max_position_pct: Number(e.target.value) || 25 })} /></label><label>Max open trades<input type="number" value={control.max_open_positions} onChange={(e) => update({ max_open_positions: Number(e.target.value) || 4 })} /></label><label>Min score<input type="number" value={control.min_score} onChange={(e) => update({ min_score: Number(e.target.value) || 80 })} /></label><label>Max score<input type="number" value={control.max_score} onChange={(e) => update({ max_score: Number(e.target.value) || 89 })} /></label><label>Min R/R<input type="number" step="0.1" value={control.min_rr} onChange={(e) => update({ min_rr: Number(e.target.value) || 1 })} /></label><label>Max stale minutes<input type="number" value={control.max_stale_minutes} onChange={(e) => update({ max_stale_minutes: Number(e.target.value) || 30 })} /></label><label>Stale simulation<select value={control.allow_stale_simulation ? "on" : "off"} onChange={(e) => update({ allow_stale_simulation: e.target.value === "on" })}><option value="off">OFF: block stale candles</option><option value="on">ON: paper test only</option></select></label></div></section>
          <section id="watchlist" className="dash-panel watchlist-panel-v85"><div className="panel-heading-row"><div><h2>Tracked symbols</h2><p>Leave the custom list blank to use the selected universe. Add symbols here if you want the admin page to directly control the tracked watchlist.</p></div><span className="small-pill">{symbolList.length || control.scan_limit} active</span></div><div className="symbol-chip-list-v85">{symbolList.slice(0, 120).map((symbol) => <span key={symbol}>{symbol}</span>)}{symbolList.length > 120 ? <span>+{symbolList.length - 120} more</span> : null}</div><label className="full-width-label">Custom symbols, optional<textarea rows={5} value={control.custom_symbols || ""} placeholder="Example: AAPL, MSFT, NVDA, SPY, QQQ. Leave blank to use Super Wide 100/500." onChange={(e) => update({ custom_symbols: e.target.value })} /></label><label className="full-width-label">Admin notes<textarea rows={3} value={control.notes || ""} onChange={(e) => update({ notes: e.target.value })} /></label></section>
        </section>
        <aside className="viewer-inspector admin-inspector" aria-label="Admin inspector"><section className="dash-panel inspector-card system-snapshot-card"><h2>Live control summary</h2><div className="rule-stack"><div><span>Route</span><strong>{brokerMode}</strong><small>{selectedRoute === "internal" ? "Internal Supabase paper records only." : selectedRoute === "paper" ? "Alpaca Paper selected; website keeps the audit trail." : "Alpaca Live selected; env unlock must pass before real orders."}</small></div><div><span>Engine</span><strong>{control.bot_enabled ? "Running" : "Paused"}</strong><small>{control.paper_trading_enabled ? "Execution armed" : "Execution disarmed"}</small></div><div><span>Risk</span><strong>{riskSummary}</strong><small>{tradeGate}</small></div><div><span>Watchlist</span><strong>{customSymbolsActive ? "Custom list" : control.universe_label}</strong><small>{symbolList.length || control.scan_limit} active symbols · {control.timeframe}</small></div></div></section><section className="dash-panel inspector-card system-snapshot-card"><h2>Broker status</h2><div className="rule-stack"><div><span>Connection</span><strong>{bot?.broker?.canSubmitOrders ? "Order route ready" : selectedRoute === "internal" ? "Not required" : "Blocked"}</strong><small>{bot?.broker?.message || bot?.broker?.error || "Broker status loading."}</small></div><div><span>Account value</span><strong>{bot?.broker?.account?.portfolio_value ? money(Number(bot.broker.account.portfolio_value)) : "—"}</strong><small>{bot?.broker?.account?.buying_power ? `${money(Number(bot.broker.account.buying_power))} buying power` : "No broker account loaded."}</small></div><div><span>Broker open</span><strong>{bot?.broker?.positions?.length ?? 0} positions · {bot?.broker?.orders?.length ?? 0} orders</strong><small>App still stores logs and trade records in Supabase.</small></div></div></section><section id="trades" className="dash-panel inspector-card cloud-bot-panel"><div className="panel-heading-row"><div><h2>Open bot records</h2><p>Server-side trades saved in Supabase.</p></div><span className="small-pill">{openTrades.length}</span></div><div className="position-list">{openTrades.length ? openTrades.map((p) => <div key={p.id} className="position-row open"><div><strong>{p.symbol}</strong><span>{p.bias} · bot record</span></div><div><strong>{money(Number(p.unrealized_pnl || 0))}</strong><span>{p.last_price ? `${Number(p.last_price).toFixed(2)} last` : "open"}</span></div></div>) : <p className="muted">No open bot trade records.</p>}</div></section><section id="activity" className="dash-panel inspector-card"><h2>Cloud bot activity</h2><div className="activity-list timeline-list">{events.length ? events.slice(0, 15).map((event) => <div key={event.id}><b>{formatDateTime(event.created_at)}</b><span>{event.message}</span></div>) : <p className="muted">No cloud events yet.</p>}</div></section><section className="dash-panel inspector-card research-memory-card"><h2>System memory</h2><div className="research-list"><div><strong>Purpose</strong><span>The admin controls how and where the cloud bot runs. The viewer only shows what happened.</span></div><div><strong>Current default</strong><span>Use 1% risk, 25% max position, 4 max open trades, scores 80-89, min R/R 1.0 unless you intentionally change it.</span></div><div><strong>Safe path</strong><span>Internal paper → Alpaca Paper → real Alpaca only after paper logs prove the workflow.</span></div></div></section></aside>
      </div>
    </main>
  );
}
