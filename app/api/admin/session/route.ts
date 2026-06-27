import { NextResponse } from "next/server";
import { isAdminPasswordConfigured, isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ authenticated: isAdminRequest(), passwordConfigured: isAdminPasswordConfigured() });
}
