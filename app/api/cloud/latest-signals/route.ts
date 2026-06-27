import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfigStatus, supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type ScanRun = { id: string; created_at: string; universe_label?: string; timeframe?: string; symbols_count?: number; candidates_count?: number; actionable_count?: number; source?: string; reason?: string };
type ScanSignal = { id: string; created_at: string; symbol: string; score?: number; bias?: string; setup?: string; rr?: number; entry?: number; stop?: number; target?: number; latest_time?: string; stale_minutes?: number; actionable?: boolean; priority?: number; warnings?: string[]; reasons?: string[]; raw?: any };

export async function GET(req: NextRequest) {
  const status = getSupabaseConfigStatus();
  const requestedLimit = Math.max(25, Math.min(500, Number(req.nextUrl.searchParams.get("limit") || 100)));
  if (!status.configured) return NextResponse.json({ ok: false, configured: false, message: status.message, scan: null, signals: [], requestedLimit, displayed: 0, totalCandidates: 0 }, { status: 200 });
  try {
    const runs = await supabaseRest<ScanRun[]>("scan_runs?select=*&order=created_at.desc&limit=1", { method: "GET" });
    const scan = runs[0] || null;
    if (!scan) return NextResponse.json({ ok: true, configured: true, scan: null, signals: [], requestedLimit, displayed: 0, totalCandidates: 0 });
    const signals = await supabaseRest<ScanSignal[]>(`scan_signals?scan_run_id=eq.${scan.id}&select=*&order=priority.desc.nullslast,score.desc&limit=${requestedLimit}`, { method: "GET" }).catch(() => []);
    return NextResponse.json({
      ok: true,
      configured: true,
      scan,
      signals,
      requestedLimit,
      displayed: signals.length,
      totalCandidates: Number(scan.candidates_count || signals.length || 0),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, configured: true, message: err instanceof Error ? err.message : "Could not load latest signals.", scan: null, signals: [], requestedLimit, displayed: 0, totalCandidates: 0 }, { status: 500 });
  }
}
