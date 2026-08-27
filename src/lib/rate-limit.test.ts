import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("blocks the eleventh request from one IP during a ten-minute window", () => {
    const limiter = createRateLimiter({ maxRequests: 10, windowMs: 600_000 });

    for (let index = 0; index < 10; index += 1) {
      expect(limiter.allow("203.0.113.10", 0)).toBe(true);
    }

    expect(limiter.allow("203.0.113.10", 0)).toBe(false);
    expect(limiter.allow("203.0.113.10", 600_001)).toBe(true);
  });

  it("drops expired keys when a later request is processed", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1_000 });

    expect(limiter.allow("203.0.113.10", 0)).toBe(true);
    expect(limiter.allow("203.0.113.11", 1_001)).toBe(true);
    expect(limiter.trackedKeyCount()).toBe(1);
  });
});
