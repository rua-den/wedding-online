import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminSession, hashPassword, requireAdmin, verifyAdminSession, verifyPassword } from "./admin-auth";

afterEach(() => vi.unstubAllEnvs());

describe("admin authentication", () => {
  it("hashes and verifies a password without accepting another password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
    await expect(verifyPassword("anything", "invalid")).resolves.toBe(false);
  });

  it("rejects a changed session payload or expired signature", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
    const token = createAdminSession(new Date("2027-01-01T00:00:00Z"));
    expect(verifyAdminSession(`${token}x`, new Date("2027-01-02T00:00:00Z"))).toBe(false);
    expect(verifyAdminSession(token, new Date("2027-01-09T00:00:01Z"))).toBe(false);
    expect(verifyAdminSession(token, new Date("2027-01-07T23:59:59Z"))).toBe(true);
  });

  it("reads and verifies the signed token from a request cookie", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
    const token = createAdminSession();
    const request = new Request("http://localhost/api/admin", { headers: { cookie: `theme=light; wedding_admin_session=${token}` } });
    expect(requireAdmin(request)).toBe(true);
  });
});

