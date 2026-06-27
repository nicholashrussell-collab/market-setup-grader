import { NextResponse } from "next/server";
import { getSupabaseConfigStatus } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getSupabaseConfigStatus();
  return NextResponse.json({
    ...status,
    checkedAt: new Date().toISOString(),
  });
}
