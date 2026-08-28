import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { createAdminInvitation, sqliteInvitationStore } from "@/lib/sqlite-store";
import { GET } from "./route";

let directory: string;
function authenticatedRequest(path: string) {
  return new Request(`http://localhost${path}`, { headers: { cookie: `wedding_admin_session=${createAdminSession()}` } });
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "admin-rsvps-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
  createAdminInvitation({ code: "mai", name: "Mai", maxGuests: 2 });
  createAdminInvitation({ code: "lan", name: "Lan", maxGuests: 1 });
  await sqliteInvitationStore.upsertRsvp({ code: "mai", name: "Mai", attendance: "attending", guestCount: 2, message: "Có mặt" });
});
afterEach(() => { closeDatabaseForTests(); vi.unstubAllEnvs(); delete process.env.SQLITE_PATH; rmSync(directory, { recursive: true, force: true }); });

describe("GET /api/admin/rsvps", () => {
  it("filters pending and attending invitations", async () => {
    const pending = await GET(authenticatedRequest("/api/admin/rsvps?status=pending"));
    await expect(pending.json()).resolves.toMatchObject({ rsvps: [{ code: "lan", attendance: null }] });
    const attending = await GET(authenticatedRequest("/api/admin/rsvps?status=attending"));
    await expect(attending.json()).resolves.toMatchObject({ rsvps: [{ code: "mai", guestCount: 2 }] });
  });

  it("rejects an invalid status", async () => {
    expect((await GET(authenticatedRequest("/api/admin/rsvps?status=unknown"))).status).toBe(400);
  });
});

