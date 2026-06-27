import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminRequest()) return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
  return NextResponse.json({ ok: false, deprecated: true, message: "v8.4 removed one-click preset autostart. Use /admin saved settings as the cloud bot source of truth." });
}

export async function POST() {
  if (!isAdminRequest()) return NextResponse.json({ ok: false, message: "Admin login required." }, { status: 401 });
  return NextResponse.json({ ok: false, deprecated: true, message: "v8.4 removed one-click preset autostart. Save settings, arm execution, and the scheduled cloud bot will use those settings." }, { status: 410 });
}
