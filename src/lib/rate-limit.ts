type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

export function createRateLimiter({ maxRequests, windowMs }: RateLimitOptions) {
  const requests = new Map<string, number[]>();

  return {
    allow(key: string, now = Date.now()) {
      const validAfter = now - windowMs;
      for (const [storedKey, timestamps] of requests) {
        const recentTimestamps = timestamps.filter((timestamp) => timestamp > validAfter);

        if (recentTimestamps.length === 0) {
          requests.delete(storedKey);
        } else if (recentTimestamps.length !== timestamps.length) {
          requests.set(storedKey, recentTimestamps);
        }
      }
      const recent = (requests.get(key) ?? []).filter((timestamp) => timestamp > validAfter);

      if (recent.length >= maxRequests) {
        requests.set(key, recent);
        return false;
      }

      recent.push(now);
      requests.set(key, recent);
      return true;
    },
    trackedKeyCount() {
      return requests.size;
    },
  };
}
