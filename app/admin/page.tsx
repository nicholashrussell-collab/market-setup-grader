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
};
type BotEvent = { id: string; created_at: string; event_type: string; message: string };
type PaperTrade = { id: string; created_at: string; symbol: string; bias: string; status: string; entry?: number; stop?: number; target?: number; last_price?: number; unrealized_pnl?: number; result_dollars?: number; result_r?: number; notes?: string };
type BrokerStatus = { configured?: boolean; mode?: string; isPaper?: boolean; isLive?: boolean; liveUnlocked?: boolean; canSubmitOrders?: boolean; realTradingLocked?: boolean; baseUrl?: string; message?: string; error?: string; account?: { buying_power?: string; portfolio_value?: string; cash?: string; status?: string }; orders?: any[]; positions?: any[] };

type BotStatus = {
  ok: boolean;
  configured: boolean;
  message: string;
  market?: { isOpen: boolean; label: string; reason: string };
  settings?: { universeLabel: string; symbols: number; timeframe: string; maxOpenPositions: number; paperTradingEnabled: boolean; brokerMode?: string; brokerPaperEnabled?: boolean; brokerLiveEnabled?: boolean };
  lastEvent?: BotEvent | null;
  events?: BotEvent[];
  openTrades?: PaperTrade[];
  closedTrades?: PaperTrade[];
  broker?: BrokerStatus;
};

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
  scan_limit: 120,
  notes: "Managed from v8.4 admin. Saved settings are the source of truth for the scheduled cloud bot.",
  broker_mode: "Supabase Simulation",
  broker_paper_enabled: false,
  broker_live_enabled: false,
};

function money(value: number) {
  const prefix = value < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function StatTile({ label, value, helper, tone }: { label: string; value: string | number; helper?: string; tone?: "good" | "warn" | "bad" }) {
  return <div className={`dash-tile ${tone || ""}`}><span>{label}</span><strong>{value}</strong>{helper ? <small>{helper}</small> : null}</div>;
}

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
  const paperEquity = 5000 + realizedPnl + unrealizedPnl;
  const canTrade = control.bot_enabled && control.paper_trading_enabled;

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = await res.json();
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
    const botData = await botRes.json();
    setBot(botData);
    if (controlRes.ok) {
      const controlData = await controlRes.json();
      if (controlData.control) setControl({ ...defaultControl, ...controlData.control });
    }
    setStatus(`Admin synced ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`);
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!authenticated) return;
    void loadAdminData();
    const id = window.setInterval(() => void loadAdminData(), 30_000);
    return () => window.clearInterval(id);
  }, [authenticated, loadAdminData]);

  const login = async () => {
    setLoginError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await res.json();
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

  const saveControl = async (nextControl = control) => {
    setSaving(true);
    setStatus("Saving cloud bot settings...");
    try {
      const res = await fetch("/api/admin/bot-control", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextControl) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Could not save settings.");
      setControl({ ...defaultControl, ...data.control });
      setStatus("Cloud bot settings saved. The next cron run will use these rules.");
      await loadAdminData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const quickSetPaperTrading = async (paperEnabled: boolean) => {
    const next = { ...control, bot_enabled: true, paper_trading_enabled: paperEnabled };
    setControl(next);
    await saveControl(next);
  };

  const runOnce = async () => {
    setRunning(true);
    setStatus("Running one cloud bot cycle from admin...");
    try {
      const res = await fetch("/api/admin/bot-run", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Cloud bot failed.");
      setStatus(data.skipped ? data.message : `Cloud bot finished: ${data.actionable || 0} actionable, ${data.openResult?.opened || 0} opened.`);
      await loadAdminData();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Cloud bot failed.");
    } finally {
      setRunning(false);
    }
  };

  const update = (patch: Partial<BotControl>) => setControl((prev) => ({ ...prev, ...patch }));

  const riskSummary = useMemo(() => `${control.risk_pct}% risk · ${control.max_position_pct}% max position · ${control.max_open_positions} max open`, [control]);
  const brokerMode = control.broker_mode || "Supabase Simulation";
  const brokerPaperArmed = brokerMode === "Alpaca Paper" && Boolean(control.broker_paper_enabled);
  const brokerLiveArmed = brokerMode === "Alpaca Live" && Boolean(control.broker_live_enabled);
  const brokerArmed = brokerPaperArmed || brokerLiveArmed;
  const activeProfile = `${control.universe_label} · ${control.scan_limit} max symbols · ${control.timeframe}`;
  const tradeGate = `Scores ${control.min_score}-${control.max_score} · min R/R ${control.min_rr} · stale guard ${control.max_stale_minutes}m`;

  if (checkingSession) {
    return <main className="dash-shell admin-login-shell"><section className="dash-panel login-panel"><h1>Checking admin session...</h1><p className="muted">Loading private control center.</p></section></main>;
  }

  if (!authenticated) {
    return (
      <main className="dash-shell admin-login-shell">
        <section className="dash-panel login-panel">
          <span className="eyebrow">Private control center</span>
          <h1>Admin Login</h1>
          <p>This page controls the cloud paper bot. The public homepage is view-only.</p>
          {!passwordConfigured ? <div className="error-box">ADMIN_PASSWORD is not set in Vercel. Add it in Project Settings → Environment Variables, then redeploy.</div> : null}
          <label>Admin password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void login(); }} /></label>
          <div className="row-actions"><button onClick={() => void login()} disabled={!passwordConfigured || !password}>Unlock admin</button><Link className="ghost-link" href="/">Back to dashboard</Link></div>
          {loginError ? <div className="error-box">{loginError}</div> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="dash-shell public-shell viewer-v79 viewer-v80 viewer-v81 admin-v80 admin-v81 admin-v84">
      <div className="terminal-workspace admin-workspace">
        <aside className="viewer-sidebar" aria-label="Admin navigation">
          <div className="sidebar-brand">
            <span className="brand-mark">MSG</span>
            <div><strong>Admin Console</strong><small>Private bot control</small></div>
          </div>
          <nav className="sidebar-nav">
            <a href="#command">Command</a>
            <a href="#settings">Settings</a>
            <a href="#profile">System</a>
            <a href="#activity">Activity</a>
            <a href="#trades">Trades</a>
          </nav>
          <div className="sidebar-system-card">
            <span className={`state-dot ${control.bot_enabled ? "good" : "warn"}`} />
            <div><strong>{control.bot_enabled ? "Engine running" : "Engine paused"}</strong><small>{canTrade ? "Trade entries armed" : "Entries disarmed"}</small></div>
          </div>
          <div className="sidebar-links">
            <Link className="ghost-link compact-link" href="/">Viewer dashboard</Link>
            <Link className="ghost-link compact-link" href="/research">Research lab</Link>
            <button className="secondary compact-link" onClick={() => void logout()}>Logout</button>
          </div>
        </aside>

        <section className="viewer-main-area">
          <header className="viewer-topbar admin-topbar-v80">
            <div>
              <div className="viewer-version-row"><span className="eyebrow">Private admin mode</span><span className="status-badge info">v8.4</span><span className="status-badge good">Broker-ready settings</span></div>
              <h1>Admin Command Center</h1>
              <p>Private command center for the autonomous cloud bot. The settings below are the source of truth; cron uses them every cycle without resetting your profile.</p>
            </div>
            <div className="topbar-rule-card"><span>Saved bot profile</span><strong>{activeProfile}</strong><small>{riskSummary} · {tradeGate}</small></div>
          </header>

          <section className="viewer-metrics-grid">
            <StatTile label="Broker mode" value={brokerMode} helper={brokerLiveArmed ? "Alpaca LIVE order bridge is enabled." : brokerPaperArmed ? "Alpaca paper order bridge is enabled." : "No external broker orders in this mode."} tone={brokerLiveArmed ? "bad" : brokerPaperArmed ? "good" : brokerMode === "Real Locked" ? "bad" : "warn"} />
            <StatTile label="Bot engine" value={control.bot_enabled ? "Running" : "Paused"} helper={control.bot_enabled ? "Cron can run scheduled cycles." : "Cron calls will skip until resumed."} tone={control.bot_enabled ? "good" : "warn"} />
            <StatTile label="Trade execution" value={canTrade ? "Armed" : "Disarmed"} helper={canTrade ? "Cloud bot may open trades in the selected execution mode when rules pass." : "Scans/checks can run, but entries are blocked."} tone={canTrade ? (brokerLiveArmed ? "bad" : "good") : "warn"} />
            <StatTile label="Market" value={bot?.market?.label || "Loading"} helper={bot?.market?.reason || "Checking market guard."} tone={bot?.market?.isOpen ? "good" : "warn"} />
            <StatTile label="Cloud DB" value={bot?.configured ? "Connected" : "Not ready"} helper={bot?.message || "Status loading"} tone={bot?.configured ? "good" : "warn"} />
          </section>

          <section className="viewer-metrics-grid secondary-metrics">
            <StatTile label="Tracked equity" value={money(paperEquity)} helper={`${money(realizedPnl)} realized · ${money(unrealizedPnl)} open`} tone={paperEquity >= control.starting_equity ? "good" : "bad"} />
            <StatTile label="Open cloud trades" value={openTrades.length} helper={`${closedTrades.length} recent closed loaded`} />
            <StatTile label="Last event" value={bot?.lastEvent ? bot.lastEvent.event_type : "—"} helper={bot?.lastEvent ? formatDateTime(bot.lastEvent.created_at) : "No events yet"} />
            <StatTile label="Rules summary" value={control.universe_label} helper={`${control.scan_limit} symbols · ${control.timeframe} · score ${control.min_score}-${control.max_score}`} />
          </section>

          <section id="command" className="dash-command-card admin-command-card">
            <div className="panel-heading-row"><div><h2>Execution command</h2><p>Use this area to arm, pause, or run the cloud bot. It does not overwrite your saved strategy settings or force a preset.</p></div><span className="small-pill">Every 15 min</span></div>
            <div className="autonomous-start-card">
              <div>
                <span className="eyebrow">Current execution route</span>
                <h3>{brokerMode}</h3>
                <p>{brokerLiveArmed ? "Live broker mode is selected. The bot will only submit live orders if the Vercel live unlock environment variables are also set." : brokerPaperArmed ? "Alpaca Paper is selected. The bot can submit paper broker orders using these same saved rules." : "Broker order submission is off. The bot will only scan/log or use Supabase simulation depending on the selected mode."}</p>
              </div>
              <div className="mode-lock-card"><strong>{canTrade ? "Execution armed" : "Execution disarmed"}</strong><span>{control.bot_enabled ? "Engine running" : "Engine paused"}</span></div>
            </div>
            <div className="row-actions admin-primary-actions">
              <button className="secondary" onClick={() => void quickSetPaperTrading(true)} disabled={saving || canTrade}>Arm trade execution</button>
              <button className="danger" onClick={() => void quickSetPaperTrading(false)} disabled={saving || !control.paper_trading_enabled}>Disarm trade execution</button>
              <button className="secondary" onClick={() => void update({ bot_enabled: !control.bot_enabled })}>{control.bot_enabled ? "Pause engine" : "Resume engine"}</button>
              <button onClick={() => void runOnce()} disabled={running}>{running ? "Running..." : "Run cloud bot once"}</button>
              <button className="secondary" onClick={() => void saveControl()} disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
            </div>
            <div className="execution-note">{status}</div>
          </section>

          <section id="settings" className="dash-panel settings-panel-v80">
            <div className="panel-heading-row"><div><h2>Cloud bot settings</h2><p>These are the saved rules the scheduled worker reads. Paper and live broker modes use the same profile, risk %, score range, R/R, and max-open settings you save here.</p></div></div>
            <div className="settings-grid admin-settings-grid compact-settings-grid">
              <label>Universe<select value={control.universe_label} onChange={(e) => update({ universe_label: e.target.value })}><option>Core 9</option><option>Super Wide 100</option><option>Super Wide 500</option></select></label>
              <label>Timeframe<select value={control.timeframe} onChange={(e) => update({ timeframe: e.target.value })}><option>1Min</option><option>5Min</option><option>15Min</option><option>30Min</option><option>1Hour</option></select></label>
              <label>Scan limit<input type="number" value={control.scan_limit} onChange={(e) => update({ scan_limit: Number(e.target.value) || 100 })} /></label>
              <label>Starting / tracked equity<input type="number" value={control.starting_equity} onChange={(e) => update({ starting_equity: Number(e.target.value) || 5000 })} /></label>
              <label>Risk per trade %<input type="number" step="0.1" value={control.risk_pct} onChange={(e) => update({ risk_pct: Number(e.target.value) || 1 })} /></label>
              <label>Max position %<input type="number" step="1" value={control.max_position_pct} onChange={(e) => update({ max_position_pct: Number(e.target.value) || 25 })} /></label>
              <label>Max open trades<input type="number" value={control.max_open_positions} onChange={(e) => update({ max_open_positions: Number(e.target.value) || 4 })} /></label>
              <label>Min score<input type="number" value={control.min_score} onChange={(e) => update({ min_score: Number(e.target.value) || 80 })} /></label>
              <label>Max score<input type="number" value={control.max_score} onChange={(e) => update({ max_score: Number(e.target.value) || 89 })} /></label>
              <label>Min R/R<input type="number" step="0.1" value={control.min_rr} onChange={(e) => update({ min_rr: Number(e.target.value) || 1 })} /></label>
              <label>Max stale minutes<input type="number" value={control.max_stale_minutes} onChange={(e) => update({ max_stale_minutes: Number(e.target.value) || 30 })} /></label>
              <label>Stale simulation<select value={control.allow_stale_simulation ? "on" : "off"} onChange={(e) => update({ allow_stale_simulation: e.target.value === "on" })}><option value="off">OFF: block stale candles</option><option value="on">ON: paper test only</option></select></label>
              <label>Execution mode<select value={brokerMode} onChange={(e) => update({ broker_mode: e.target.value, broker_paper_enabled: e.target.value === "Alpaca Paper" ? control.broker_paper_enabled : false, broker_live_enabled: e.target.value === "Alpaca Live" ? control.broker_live_enabled : false })}><option>Supabase Simulation</option><option>Alpaca Paper</option><option>Alpaca Live</option><option>Real Locked</option></select></label>
              <label>Alpaca paper bridge<select value={control.broker_paper_enabled ? "on" : "off"} onChange={(e) => update({ broker_paper_enabled: e.target.value === "on", broker_live_enabled: false, broker_mode: e.target.value === "on" ? "Alpaca Paper" : brokerMode })}><option value="off">OFF: no paper broker orders</option><option value="on">ON: paper broker orders</option></select></label>
              <label>Alpaca live bridge<select value={control.broker_live_enabled ? "on" : "off"} onChange={(e) => update({ broker_live_enabled: e.target.value === "on", broker_paper_enabled: false, broker_mode: e.target.value === "on" ? "Alpaca Live" : brokerMode })}><option value="off">OFF: no live broker orders</option><option value="on">ON: live broker orders if env unlock passes</option></select></label>
            </div>
            <label className="full-width-label">Admin notes<textarea rows={3} value={control.notes || ""} onChange={(e) => update({ notes: e.target.value })} /></label>
          </section>

          <section id="profile" className="dash-panel system-profile-panel">
            <div className="panel-heading-row"><div><h2>What this bot is set to do</h2><p>A readable summary of the system so you can quickly understand the live paper engine without digging through every input.</p></div></div>
            <div className="system-map-grid">
              <div><span>Universe layer</span><strong>{control.universe_label}</strong><small>Current scan cap: {control.scan_limit}. This is the tradable liquid watchlist, not literally every ticker.</small></div>
              <div><span>Setup layer</span><strong>Pullback / reclaim + continuation</strong><small>Grades long and short setups, but only opens paper trades if score, R/R, freshness, and risk checks pass.</small></div>
              <div><span>Risk layer</span><strong>{control.risk_pct}% risk · {control.max_open_positions} max open</strong><small>Position size is capped by risk-per-trade and max position value.</small></div>
              <div><span>Execution layer</span><strong>{brokerMode}</strong><small>{brokerLiveArmed ? "Orders route to Alpaca Live only after environment unlock checks pass." : brokerPaperArmed ? "Orders route to Alpaca Paper using the same saved strategy settings." : "Bot records Supabase simulation trades only."}</small></div>
              <div><span>Safety layer</span><strong>Market-hours guarded</strong><small>Paper and live modes use the same saved rules. Live orders require separate live credentials plus environment unlock gates.</small></div>
            </div>
          </section>
        </section>

        <aside className="viewer-inspector admin-inspector" aria-label="Admin inspector">
          <section className="dash-panel inspector-card system-snapshot-card">
            <h2>Broker bridge</h2>
            <div className="rule-stack">
              <div><span>Mode</span><strong>{brokerMode}</strong><small>{brokerLiveArmed ? "Alpaca live submissions selected from admin." : brokerPaperArmed ? "Alpaca paper submissions enabled from admin." : "Broker submissions disabled."}</small></div>
              <div><span>Endpoint</span><strong>{bot?.broker?.isLive ? "Live API" : bot?.broker?.isPaper ? "Paper API" : "Locked / simulation"}</strong><small>{bot?.broker?.message || "Broker status loads through server environment variables."}</small></div>
              <div><span>Account</span><strong>{bot?.broker?.account?.portfolio_value ? money(Number(bot.broker.account.portfolio_value)) : "—"}</strong><small>{bot?.broker?.account?.buying_power ? `${money(Number(bot.broker.account.buying_power))} buying power` : (bot?.broker?.error || "No broker account sync loaded yet.")}</small></div>
              <div><span>Broker open</span><strong>{bot?.broker?.positions?.length ?? 0} positions · {bot?.broker?.orders?.length ?? 0} orders</strong><small>Dashboard still stores the audit record in Supabase.</small></div>
            </div>
          </section>

          <section id="trades" className="dash-panel inspector-card cloud-bot-panel">
            <div className="panel-heading-row"><div><h2>Open bot trade records</h2><p>Server-side trade records saved in Supabase, including simulation, paper broker, or live broker mode.</p></div><span className="small-pill">{openTrades.length}</span></div>
            <div className="position-list">
              {openTrades.length ? openTrades.map((p) => <div key={p.id} className="position-row open"><div><strong>{p.symbol}</strong><span>{p.bias} · bot record</span></div><div><strong>{money(Number(p.unrealized_pnl || 0))}</strong><span>{p.last_price ? `${Number(p.last_price).toFixed(2)} last` : "open"}</span></div></div>) : <p className="muted">No open bot trade records.</p>}
            </div>
          </section>

          <section id="activity" className="dash-panel inspector-card">
            <h2>Cloud bot activity</h2>
            <div className="activity-list timeline-list">
              {events.length ? events.slice(0, 15).map((event) => <div key={event.id}><b>{formatDateTime(event.created_at)}</b><span>{event.message}</span></div>) : <p className="muted">No cloud events yet.</p>}
            </div>
          </section>

          <section className="dash-panel inspector-card system-snapshot-card">
            <h2>Live rule snapshot</h2>
            <div className="rule-stack">
              <div><span>Engine</span><strong>{control.bot_enabled ? "Running" : "Paused"}</strong><small>{canTrade ? "Trade entries armed" : "Trade entries disarmed"}</small></div>
              <div><span>Broker</span><strong>{brokerMode}</strong><small>{brokerLiveArmed ? "Alpaca live bridge selected" : brokerPaperArmed ? "Alpaca paper bridge enabled" : "Broker bridge off / simulation"}</small></div>
              <div><span>Scan</span><strong>{activeProfile}</strong><small>{tradeGate}</small></div>
              <div><span>Risk</span><strong>{riskSummary}</strong><small>Starting equity {money(control.starting_equity)} · stale simulation {control.allow_stale_simulation ? "ON" : "OFF"}</small></div>
            </div>
          </section>

          <section className="dash-panel inspector-card research-memory-card">
            <h2>Research memory</h2>
            <div className="research-list">
              <div><strong>Direction</strong><span>Active-only paper trading. No buy-and-hold sleeve in the live bot.</span></div>
              <div><strong>Strong reference</strong><span>100-stock active scanner backtest showed the clearest promise; cloud paper validation is the next proof step.</span></div>
              <div><strong>Risk default</strong><span>1% per paper trade, 25% max position, 4 max open trades.</span></div>
              <div><strong>Current priority</strong><span>Run the same saved bot rules in Supabase simulation or Alpaca Paper. Live mode is wired separately and remains blocked unless the live unlock environment gates are explicitly configured.</span></div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );

}
