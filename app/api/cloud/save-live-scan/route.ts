import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfigStatus, supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type CandidatePayload = {
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
  reasons?: string[];
  warnings?: string[];
};

type SavePayload = {
  reason?: string;
  source?: string;
  timeframe?: string;
  mode?: string;
  universeLabel?: string;
  symbolsCount?: number;
  startedAt?: string;
  finishedAt?: string;
  settings?: Record<string, unknown>;
  candidates?: CandidatePayload[];
};

type InsertedRun = { id: string };

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: NextRequest) {
  const status = getSupabaseConfigStatus();
  if (!status.configured) {
    return NextResponse.json({ ok: false, message: status.message }, { status: 400 });
  }

  const body = (await req.json()) as SavePayload;
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const actionableCount = candidates.filter((c) => c.actionable).length;
  const now = new Date().toISOString();

  const runRows = await supabaseRest<InsertedRun[]>("scan_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      started_at: body.startedAt || body.finishedAt || now,
      finished_at: body.finishedAt || now,
      status: "saved",
      reason: body.reason || "manual-live-scan-save",
      source: body.source || "unknown",
      timeframe: body.timeframe || "unknown",
      universe_label: body.universeLabel || "live-watchlist",
      symbols_count: Math.max(0, Math.trunc(safeNumber(body.symbolsCount, candidates.length))),
      candidates_count: candidates.length,
      actionable_count: actionableCount,
      settings: body.settings || {},
      notes: "Saved from v7.3 cloud dashboard. Paper/signals only; no broker orders placed.",
    }),
  });

  const scanRunId = runRows[0]?.id;
  if (!scanRunId) {
    throw new Error("Supabase did not return a scan run id.");
  }

  if (candidates.length) {
    const signalRows = candidates.map((c) => ({
      scan_run_id: scanRunId,
      symbol: String(c.symbol || "").toUpperCase(),
      score: safeNumber(c.score),
      bias: c.bias || "Unknown",
      setup: c.setup || "Unknown",
      regime: c.regime || "Unknown",
      market_state: c.state || "Unknown",
      rr: safeNumber(c.rr),
      entry: safeNumber(c.entry),
      stop: safeNumber(c.stop),
      target: safeNumber(c.target),
      latest_time: c.latestTime || null,
      stale_minutes: Math.trunc(safeNumber(c.staleMinutes, 999999)),
      actionable: Boolean(c.actionable),
      priority: safeNumber(c.priority),
      reasons: c.reasons || [],
      warnings: c.warnings || [],
      raw: c,
    }));

    await supabaseRest("scan_signals", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(signalRows),
    });
  }

  return NextResponse.json({
    ok: true,
    scanRunId,
    savedSignals: candidates.length,
    actionableCount,
    savedAt: now,
  });
}
