import { isIP } from "node:net";

function normalizeIp(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && isIP(trimmed) ? trimmed : null;
}

export function getTrustedProxyClientIp(request: Request): string {
  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    for (let index = hops.length - 1; index >= 0; index -= 1) {
      const hop = normalizeIp(hops[index] ?? null);
      if (hop) return hop;
    }
  }

  return "unknown";
}
