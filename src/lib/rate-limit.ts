type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

export function createRateLimiter({ maxRequests, windowMs }: RateLimitOptions) {
  const requests = new Map<string, number[]>();

  return {
    allow(key: string, now = Date.now()) {
      const validAfter = now - windowMs;
      const recent = (requests.get(key) ?? []).filter((timestamp) => timestamp > validAfter);

      if (recent.length >= maxRequests) {
        requests.set(key, recent);
        return false;
      }

      recent.push(now);
      requests.set(key, recent);
      return true;
    },
  };
}
