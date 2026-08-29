import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SESSION_SECONDS = 7 * 24 * 60 * 60;

export const adminSessionCookie = {
  name: "wedding_admin_session",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Admin session is not configured.");
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const digest = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${digest.toString("hex")}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, salt, digest] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !/^[a-f\d]{128}$/i.test(digest ?? "")) return false;
  const candidate = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(digest, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function createAdminSession(now = new Date()): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now.getTime() / 1000) + SESSION_SECONDS })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSession(token: string | undefined, now = new Date()): boolean {
  if (!token) return false;
  try {
    const [payload, suppliedSignature, extra] = token.split(".");
    if (!payload || !suppliedSignature || extra) return false;
    const expectedSignature = createHmac("sha256", sessionSecret()).update(payload).digest();
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (supplied.length !== expectedSignature.length || !timingSafeEqual(supplied, expectedSignature)) return false;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof parsed.exp === "number" && parsed.exp >= Math.floor(now.getTime() / 1000);
  } catch {
    return false;
  }
}

export function getAdminTokenFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === adminSessionCookie.name) return value.join("=");
  }
  return undefined;
}

export function requireAdmin(request: Request): boolean {
  return verifyAdminSession(getAdminTokenFromCookieHeader(request.headers.get("cookie")));
}

export function serializeAdminCookie(token: string, maxAge = adminSessionCookie.maxAge): string {
  const attributes = [
    `${adminSessionCookie.name}=${token}`,
    `Max-Age=${maxAge}`,
    `Path=${adminSessionCookie.path}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (adminSessionCookie.secure) attributes.push("Secure");
  return attributes.join("; ");
}
