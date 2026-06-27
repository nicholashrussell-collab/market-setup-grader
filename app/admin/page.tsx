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
};
type BotEvent = { id: string; created_at: string; event_type: string; message: string };
type PaperTrade = { id: string; created_at: string; symbol: string; bias: string; status: string; entry?: number; stop?: number; target?: number; last_price?: number; unrealized_pnl?: number; result_dollars?: number; result_r?: number; notes?: string };
type BotStatus = {
  ok: boolean;
  configured: boolean;
  message: string;
  market?: { isOpen: boolean; label: string; reason: string };
  settings?: { universeLabel: string; symbols: number; timeframe: string; maxOpenPositions: number; paperTradingEnabled: boolean };
  lastEvent?: BotEvent | null;
  events?: BotEvent[];
  openTrades?: PaperTrade[];
  closedTrades?: PaperTrade[];
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
  notes: "Managed from v7.8 admin.",
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
  const canPaperTrade = control.bot_enabled && control.paper_trading_enabled;

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
    <main className="dash-shell admin-shell">
      <header className="dash-header hero-readonly">
        <div>
          <span className="eyebrow">Private admin mode</span>
          <h1>Market Setup Grader v7.8 Admin</h1>
          <p>Private command center for the autonomous cloud paper bot. Tune it here, then share the homepage as a safe read-only viewer.</p>
        </div>
        <div className="dash-header-actions">
          <Link className="ghost-link" href="/">Viewer dashboard</Link>
          <Link className="ghost-link" href="/research">Research lab</Link>
          <button className="secondary" onClick={() => void logout()}>Logout</button>
        </div>
      </header>

      <section className="console-topline">
        <div className={`console-state ${control.bot_enabled ? "armed" : "warn"}`}><span>Bot engine</span><strong>{control.bot_enabled ? "Running" : "Paused"}</strong><small>{control.bot_enabled ? "Cron can run scheduled cycles." : "Cron calls will skip until resumed."}</small></div>
        <div className={`console-state ${canPaperTrade ? "armed" : "warn"}`}><span>Paper execution</span><strong>{canPaperTrade ? "Armed" : "Disarmed"}</strong><small>{canPaperTrade ? "Cloud bot may open paper trades when rules pass." : "Scans/checks can run, but new paper entries are blocked."}</small></div>
        <div className={`console-state ${bot?.market?.isOpen ? "armed" : "warn"}`}><span>Market</span><strong>{bot?.market?.label || "Loading"}</strong><small>{bot?.market?.reason || "Checking market guard."}</small></div>
        <div className="console-state safe"><span>Rules</span><strong>{control.universe_label}</strong><small>{control.scan_limit} max symbols · {control.timeframe} · {riskSummary}</small></div>
      </section>

      <section className="dash-status-row">
        <StatTile label="Paper equity" value={money(paperEquity)} helper={`${money(realizedPnl)} realized · ${money(unrealizedPnl)} open`} tone={paperEquity >= 5000 ? "good" : "bad"} />
        <StatTile label="Open cloud trades" value={openTrades.length} helper={`${closedTrades.length} recent closed loaded`} />
        <StatTile label="Last event" value={bot?.lastEvent ? bot.lastEvent.event_type : "—"} helper={bot?.lastEvent ? formatDateTime(bot.lastEvent.created_at) : "No events yet"} />
        <StatTile label="Cloud DB" value={bot?.configured ? "Connected" : "Not ready"} helper={bot?.message || "Status loading"} tone={bot?.configured ? "good" : "warn"} />
      </section>

      <section className="dash-command-card admin-command-card">
        <div className="panel-heading-row"><div><h2>Autopilot control</h2><p>These settings are saved to Supabase. Cron uses them even when your browser is closed.</p></div><span className="small-pill">Every 15 min</span></div>
        <div className="row-actions admin-primary-actions">
          <button className="arm-button" onClick={() => void quickSetPaperTrading(true)} disabled={saving || canPaperTrade}>Arm paper bot</button>
          <button className="danger" onClick={() => void quickSetPaperTrading(false)} disabled={saving || !control.paper_trading_enabled}>Disarm paper bot</button>
          <button className="secondary" onClick={() => void update({ bot_enabled: !control.bot_enabled })}>{control.bot_enabled ? "Pause engine" : "Resume engine"}</button>
          <button onClick={() => void runOnce()} disabled={running}>{running ? "Running..." : "Run cloud bot once"}</button>
          <button className="secondary" onClick={() => void saveControl()} disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
        </div>
        <div className="execution-note">{status}</div>
      </section>

      <section className="dash-main-grid admin-grid">
        <div className="dash-left-column">
          <section className="dash-panel">
            <div className="panel-heading-row"><div><h2>Cloud bot settings</h2><p>Start with Super Wide 100 or 500. Treat all entries as paper-only until the cloud logs prove the system is safe.</p></div></div>
            <div className="settings-grid admin-settings-grid">
              <label>Universe<select value={control.universe_label} onChange={(e) => update({ universe_label: e.target.value })}><option>Core 9</option><option>Super Wide 100</option><option>Super Wide 500</option></select></label>
              <label>Timeframe<select value={control.timeframe} onChange={(e) => update({ timeframe: e.target.value })}><option>1Min</option><option>5Min</option><option>15Min</option><option>30Min</option><option>1Hour</option></select></label>
              <label>Scan limit<input type="number" value={control.scan_limit} onChange={(e) => update({ scan_limit: Number(e.target.value) || 100 })} /></label>
              <label>Starting paper equity<input type="number" value={control.starting_equity} onChange={(e) => update({ starting_equity: Number(e.target.value) || 5000 })} /></label>
              <label>Risk per trade %<input type="number" step="0.1" value={control.risk_pct} onChange={(e) => update({ risk_pct: Number(e.target.value) || 1 })} /></label>
              <label>Max position %<input type="number" step="1" value={control.max_position_pct} onChange={(e) => update({ max_position_pct: Number(e.target.value) || 25 })} /></label>
              <label>Max open trades<input type="number" value={control.max_open_positions} onChange={(e) => update({ max_open_positions: Number(e.target.value) || 4 })} /></label>
              <label>Min score<input type="number" value={control.min_score} onChange={(e) => update({ min_score: Number(e.target.value) || 80 })} /></label>
              <label>Max score<input type="number" value={control.max_score} onChange={(e) => update({ max_score: Number(e.target.value) || 89 })} /></label>
              <label>Min R/R<input type="number" step="0.1" value={control.min_rr} onChange={(e) => update({ min_rr: Number(e.target.value) || 1 })} /></label>
              <label>Max stale minutes<input type="number" value={control.max_stale_minutes} onChange={(e) => update({ max_stale_minutes: Number(e.target.value) || 30 })} /></label>
              <label>Stale simulation<select value={control.allow_stale_simulation ? "on" : "off"} onChange={(e) => update({ allow_stale_simulation: e.target.value === "on" })}><option value="off">OFF: block stale candles</option><option value="on">ON: paper test only</option></select></label>
            </div>
            <label className="full-width-label">Admin notes<textarea rows={3} value={control.notes || ""} onChange={(e) => update({ notes: e.target.value })} /></label>
          </section>
        </div>

        <aside className="dash-right-column">
          <section className="dash-panel cloud-bot-panel">
            <div className="panel-heading-row"><div><h2>Open cloud paper trades</h2><p>Server-side paper positions saved in Supabase.</p></div><span className="small-pill">{openTrades.length}</span></div>
            <div className="position-list">
              {openTrades.length ? openTrades.map((p) => <div key={p.id} className="position-row open"><div><strong>{p.symbol}</strong><span>{p.bias} · cloud paper</span></div><div><strong>{money(Number(p.unrealized_pnl || 0))}</strong><span>{p.last_price ? `${Number(p.last_price).toFixed(2)} last` : "open"}</span></div></div>) : <p className="muted">No open cloud paper trades.</p>}
            </div>
          </section>

          <section className="dash-panel">
            <h2>Cloud bot activity</h2>
            <div className="activity-list">
              {events.length ? events.slice(0, 15).map((event) => <div key={event.id}>{formatDateTime(event.created_at)} · {event.message}</div>) : <p className="muted">No cloud events yet.</p>}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
