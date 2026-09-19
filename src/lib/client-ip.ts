import { isIP } from "node:net";

function normalizeIp(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && isIP(trimmed) ? trimmed : null;
}

export function getTrustedProxyClientIp(request: Request): string {
  return normalizeIp(request.headers.get("x-real-ip")) ?? "unknown";
}
