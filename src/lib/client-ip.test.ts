import { describe, expect, it } from "vitest";

import { getTrustedProxyClientIp } from "./client-ip";

function request(headers: Record<string, string>) {
  return new Request("http://localhost/", { headers });
}

describe("getTrustedProxyClientIp", () => {
  it("uses the reverse proxy's normalized real-ip header", () => {
    expect(getTrustedProxyClientIp(request({
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.77, 203.0.113.10",
    }))).toBe("203.0.113.10");
  });

  it("does not trust x-forwarded-for when the trusted proxy identity header is absent", () => {
    expect(getTrustedProxyClientIp(request({
      "x-forwarded-for": "198.51.100.77, 203.0.113.10",
    }))).toBe("unknown");
  });

  it("fails closed to one shared identity when the real-ip header is invalid", () => {
    expect(getTrustedProxyClientIp(request({
      "x-real-ip": "not-an-ip",
      "x-forwarded-for": "203.0.113.10",
    }))).toBe("unknown");
  });
});
