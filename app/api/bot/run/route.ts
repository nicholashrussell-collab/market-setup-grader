import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfigStatus } from "@/lib/supabase-rest";
import { runCloudPaperBot } from "@/lib/paper-bot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.BOT_CRON_SECRET || process.env.CRON_SECRET || "";
  if (!secret) return true;
  const auth = req.headers.get("authorization") || "";
  const querySecret = req.nextUrl.searchParams.get("secret") || "";
  return auth === `Bearer ${secret}` || querySecret === secret;
}

async function handleRun(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized bot run request." }, { status: 401 });
  }
  const status = getSupabaseConfigStatus();
  if (!status.configured) {
    return NextResponse.json({ ok: false, message: status.message }, { status: 400 });
  }
  try {
    const source = req.nextUrl.searchParams.get("source") || "api";
    const result = await runCloudPaperBot(source);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : "Cloud bot run failed." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleRun(req);
}

export async function POST(req: NextRequest) {
  return handleRun(req);
}
