import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfigStatus, supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

type ScanRunRow = {
  id: string;
  created_at: string;
  finished_at: string | null;
  status: string;
  reason: string | null;
  source: string | null;
  timeframe: string | null;
  universe_label: string | null;
  symbols_count: number | null;
  candidates_count: number | null;
  actionable_count: number | null;
};

export async function GET(req: NextRequest) {
  const status = getSupabaseConfigStatus();
  if (!status.configured) {
    return NextResponse.json({ configured: false, runs: [], message: status.message }, { status: 200 });
  }

  const limit = Math.max(1, Math.min(25, Number(req.nextUrl.searchParams.get("limit") || 5)));
  const select = "id,created_at,finished_at,status,reason,source,timeframe,universe_label,symbols_count,candidates_count,actionable_count";
  const runs = await supabaseRest<ScanRunRow[]>(`scan_runs?select=${select}&order=created_at.desc&limit=${limit}`);
  return NextResponse.json({ configured: true, runs });
}
