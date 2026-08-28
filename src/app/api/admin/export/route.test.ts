import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { createAdminInvitation } from "@/lib/sqlite-store";
import { GET } from "./route";

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-export-")); process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
  createAdminInvitation({ code: "formula", name: "=HYPERLINK(bad)", maxGuests: 2 });
});
afterEach(() => { closeDatabaseForTests(); vi.unstubAllEnvs(); delete process.env.SQLITE_PATH; rmSync(directory, { recursive: true, force: true }); });

describe("GET /api/admin/export", () => {
  it("exports safe CSV only to an authenticated admin", async () => {
    expect((await GET(new Request("http://localhost/api/admin/export"))).status).toBe(401);
    const response = await GET(new Request("http://localhost/api/admin/export", { headers: { cookie: `wedding_admin_session=${createAdminSession()}` } }));
    expect(response.headers.get("content-disposition")).toContain("rsvp.csv");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toContain("'=HYPERLINK");
  });
});

