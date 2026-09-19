import { describe, expect, it } from "vitest";

import { getTrustedProxyClientIp } from "./client-ip";

function request(headers: Record<string, string>) {
  return new Request("http://localhost/", { headers });
}

describe("getTrustedProxyClientIp", () => {
  it("prefers the reverse proxy's normalized real-ip header over forwarded-for", () => {
    expect(getTrustedProxyClientIp(request({
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.77, 203.0.113.10",
    }))).toBe("203.0.113.10");
  });

  it("uses the nearest forwarded-for hop instead of an attacker-prepended first hop", () => {
    expect(getTrustedProxyClientIp(request({
      "x-forwarded-for": "198.51.100.77, 203.0.113.10",
    }))).toBe("203.0.113.10");
  });

  it("fails closed to one shared identity when proxy headers contain no valid IP", () => {
    expect(getTrustedProxyClientIp(request({
      "x-real-ip": "not-an-ip",
      "x-forwarded-for": "also-not-an-ip",
    }))).toBe("unknown");
  });
});
