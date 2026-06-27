import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "msg_admin_session";

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.BOT_CRON_SECRET || process.env.CRON_SECRET || "market-setup-grader-dev-session";
}

function expectedPassword() {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function isAdminPasswordConfigured() {
  return Boolean(expectedPassword());
}

export function verifyAdminPassword(password: string) {
  const expected = expectedPassword();
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function makeAdminToken() {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function verifyAdminToken(token?: string | null) {
  if (!token) return false;
  const [issuedAt, mac] = token.split(".");
  if (!issuedAt || !mac) return false;
  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 1000 * 60 * 60 * 24 * 7) return false;
  const expected = sign(issuedAt);
  try {
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isAdminRequest() {
  return verifyAdminToken(cookies().get(COOKIE_NAME)?.value);
}

export function adminCookieName() {
  return COOKIE_NAME;
}
