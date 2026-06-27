import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseConfigStatus } from "@/lib/supabase-rest";
import { runCloudPaperBot } from "@/lib/paper-bot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
  }
  const status = getSupabaseConfigStatus();
  if (!status.configured) return NextResponse.json({ ok: false, message: status.message }, { status: 400 });
  try {
    const result = await runCloudPaperBot("admin-manual");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : "Cloud bot run failed." }, { status: 500 });
  }
}
