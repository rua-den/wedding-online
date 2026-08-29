import { createAdminSession, serializeAdminCookie, verifyPassword } from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/admin-validation";

const failedAttempts = new Map<string, number[]>();
const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000;

function clientIp(request: Request) { return request.headers.get("x-real-ip")?.trim() || "unknown"; }
function recentFailures(ip: string, now = Date.now()) {
  const recent = (failedAttempts.get(ip) ?? []).filter((timestamp) => timestamp > now - WINDOW_MS);
  if (recent.length) failedAttempts.set(ip, recent); else failedAttempts.delete(ip);
  return recent;
}
export function resetLoginRateLimitForTests() { failedAttempts.clear(); }

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const ip = clientIp(request);
  if (recentFailures(ip).length >= MAX_FAILURES) {
    return Response.json({ message: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau." }, { status: 429, headers });
  }
  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return Response.json({ message: "Mật khẩu không hợp lệ." }, { status: 400, headers });

  try {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash || !(await verifyPassword(parsed.data.password, hash))) {
      const failures = recentFailures(ip);
      failures.push(Date.now());
      failedAttempts.set(ip, failures);
      return Response.json({ message: "Mật khẩu không đúng." }, { status: 401, headers });
    }
    failedAttempts.delete(ip);
    const responseHeaders = new Headers(headers);
    responseHeaders.set("Set-Cookie", serializeAdminCookie(createAdminSession()));
    return new Response(null, { status: 204, headers: responseHeaders });
  } catch {
    return Response.json({ message: "Không thể đăng nhập lúc này. Vui lòng thử lại sau." }, { status: 500, headers });
  }
}
