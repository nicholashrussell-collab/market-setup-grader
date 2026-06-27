import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getBrokerConfigStatus, getAlpacaPaperAccount, getAlpacaPaperOrders, getAlpacaPaperPositions } from "@/lib/alpaca-trading";
import { getSupabaseConfigStatus, supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

function stableAutonomousPreset() {
  return {
    id: "main",
    updated_at: new Date().toISOString(),
    bot_enabled: true,
    paper_trading_enabled: true,
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
    broker_mode: "Alpaca Paper",
    broker_paper_enabled: true,
    notes: "v8.3 Stable Autonomous Paper Preset. Alpaca Paper enabled, real broker locked, market-hours/stale-data guards on.",
  };
}

async function logBotEvent(event_type: string, message: string, payload: Record<string, unknown> = {}) {
  await supabaseRest("bot_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ event_type, message, payload }),
  }).catch(() => null);
}

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
  }

  const supabase = getSupabaseConfigStatus();
  const broker = getBrokerConfigStatus();
  const checks: Array<{ name: string; ok: boolean; message: string }> = [
    { name: "Supabase", ok: supabase.configured, message: supabase.message },
    { name: "Alpaca credentials", ok: broker.configured, message: broker.configured ? "Alpaca API credentials are present." : broker.message },
    { name: "Paper endpoint", ok: broker.isPaper, message: broker.isPaper ? "APCA_API_BASE_URL is the Alpaca paper endpoint." : "APCA_API_BASE_URL must be https://paper-api.alpaca.markets." },
    { name: "Real trading lock", ok: broker.realTradingLocked === false, message: broker.isPaper ? "Real broker endpoint is not in use." : "Real broker endpoint detected; order submission will stay locked." },
  ];

  let account: unknown = null;
  let orders: unknown[] = [];
  let positions: unknown[] = [];
  if (supabase.configured && broker.configured && broker.isPaper) {
    try {
      const result = await Promise.all([
        getAlpacaPaperAccount(),
        getAlpacaPaperOrders("open", 25),
        getAlpacaPaperPositions(),
      ]);
      account = result[0];
      orders = result[1] as unknown[];
      positions = result[2] as unknown[];
      checks.push({ name: "Broker sync", ok: true, message: `Alpaca Paper synced: ${positions.length} position(s), ${orders.length} open order(s).` });
    } catch (err) {
      checks.push({ name: "Broker sync", ok: false, message: err instanceof Error ? err.message : "Could not sync Alpaca Paper account." });
    }
  }

  return NextResponse.json({ ok: checks.every((c) => c.ok), supabase, broker, checks, account, orders, positions, preset: stableAutonomousPreset() });
}

export async function POST() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
  }

  const supabase = getSupabaseConfigStatus();
  if (!supabase.configured) {
    return NextResponse.json({ ok: false, message: supabase.message, checks: [{ name: "Supabase", ok: false, message: supabase.message }] }, { status: 400 });
  }

  const broker = getBrokerConfigStatus();
  const checks: Array<{ name: string; ok: boolean; message: string }> = [
    { name: "Supabase", ok: true, message: supabase.message },
    { name: "Alpaca credentials", ok: broker.configured, message: broker.configured ? "Alpaca API credentials are present." : broker.message },
    { name: "Paper endpoint", ok: broker.isPaper, message: broker.isPaper ? "APCA_API_BASE_URL is the Alpaca paper endpoint." : "APCA_API_BASE_URL must be https://paper-api.alpaca.markets." },
    { name: "Real trading lock", ok: broker.isPaper, message: broker.isPaper ? "Real broker orders remain locked because the app is using Alpaca Paper." : "Real broker endpoint detected; refusing to arm." },
  ];

  if (!broker.configured || !broker.isPaper) {
    await logBotEvent("autostart_blocked", "Autonomous paper bot start blocked by failed pre-flight checks.", { checks, broker });
    return NextResponse.json({ ok: false, message: "Pre-flight failed. Fix the blocked checks before starting the autonomous paper bot.", checks, broker }, { status: 400 });
  }

  try {
    const [account, orders, positions] = await Promise.all([
      getAlpacaPaperAccount(),
      getAlpacaPaperOrders("open", 25),
      getAlpacaPaperPositions(),
    ]);
    checks.push({ name: "Broker sync", ok: true, message: `Alpaca Paper synced: ${positions.length} position(s), ${orders.length} open order(s).` });
    const preset = stableAutonomousPreset();
    const rows = await supabaseRest<any[]>("bot_control", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(preset),
    });
    await logBotEvent("autonomous_paper_started", "Stable Autonomous Paper Preset started: Alpaca Paper armed, real broker locked, cron controls enabled.", { preset, broker, accountStatus: account.status, buyingPower: account.buying_power, positions: positions.length, orders: orders.length });
    return NextResponse.json({ ok: true, message: "Autonomous paper bot is live. Alpaca Paper is connected, paper execution is armed, and real broker orders remain locked.", checks, control: rows[0] || preset, broker: { ...broker, account, orders, positions } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sync Alpaca Paper account.";
    checks.push({ name: "Broker sync", ok: false, message });
    await logBotEvent("autostart_blocked", `Autonomous paper bot start blocked: ${message}`, { checks, broker });
    return NextResponse.json({ ok: false, message: "Pre-flight failed during Alpaca Paper sync.", checks, broker }, { status: 400 });
  }
}
