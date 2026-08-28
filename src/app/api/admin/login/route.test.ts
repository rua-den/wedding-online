import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/admin-auth";
import { POST, resetLoginRateLimitForTests } from "./route";

function loginRequest(password: string, ip = "203.0.113.1") {
  return new Request("http://localhost/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": ip }, body: JSON.stringify({ password }) });
}
beforeEach(async () => {
  resetLoginRateLimitForTests();
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
  vi.stubEnv("ADMIN_PASSWORD_HASH", await hashPassword("correct-password"));
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/admin/login", () => {
  it("sets an httpOnly login cookie only after a valid password", async () => {
    const response = await POST(loginRequest("correct-password"));
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
  });
  it("rejects an invalid password without setting a cookie", async () => {
    const response = await POST(loginRequest("wrong-password"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Mật khẩu không đúng." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("rate limits repeated failures by trusted proxy IP", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) expect((await POST(loginRequest("wrong-password", "203.0.113.9"))).status).toBe(401);
    expect((await POST(loginRequest("correct-password", "203.0.113.9"))).status).toBe(429);
  });
});

