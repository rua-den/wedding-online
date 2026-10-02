import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { createGiftWish } from "@/lib/gift-wish-store";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { createAdminInvitation } from "@/lib/sqlite-store";
import { GET } from "./route";

let directory: string;
function request(authenticated = false) {
  return new Request("http://localhost/api/admin/wishes", authenticated ? { headers: { cookie: `wedding_admin_session=${createAdminSession()}` } } : undefined);
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-wishes-route-"));
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("SQLITE_PATH", join(directory, "wedding.sqlite"));
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
  createAdminInvitation({ code: "demo", name: "Khách demo", maxGuests: 2 });
  createGiftWish({ invitationCode: "demo", name: "Minh", message: "Hẹn gặp nhé" });
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("GET /api/admin/wishes", () => {
  it("requires an admin session", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns persisted wishes without caching for an admin", async () => {
    const response = await GET(request(true));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ wishes: [{ invitationCode: "demo", name: "Minh", message: "Hẹn gặp nhé" }] });
  });
});
