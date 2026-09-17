export function getTrustedProxyClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);
  if (forwarded) return forwarded;

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
