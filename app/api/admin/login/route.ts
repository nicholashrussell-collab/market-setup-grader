import { NextResponse } from "next/server";
import { adminCookieName, isAdminPasswordConfigured, makeAdminToken, verifyAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json({ ok: false, message: "ADMIN_PASSWORD is not configured in Vercel." }, { status: 500 });
  }
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ ok: false, message: "Wrong admin password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, message: "Admin unlocked." });
  res.cookies.set(adminCookieName(), makeAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
