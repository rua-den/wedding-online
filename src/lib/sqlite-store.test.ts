import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDatabaseForTests } from "./sqlite";
import {
  createAdminInvitation,
  getAdminSummary,
  getRsvpExportRows,
  listAdminInvitations,
  listAdminRsvps,
  sqliteInvitationStore,
  updateAdminInvitation,
} from "./sqlite-store";

let temporaryDirectory: string;

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "wedding-store-"));
  process.env.SQLITE_PATH = join(temporaryDirectory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("SQLite invitation repository", () => {
  it("upserts an RSVP while preserving its created timestamp", async () => {
    createAdminInvitation({ code: "guest-1", name: "Mai", maxGuests: 2 });
    await sqliteInvitationStore.upsertRsvp({
      code: "guest-1",
      name: "Mai",
      attendance: "attending",
      guestCount: 2,
      message: "Hẹn gặp nhé",
    });
    await sqliteInvitationStore.upsertRsvp({
      code: "guest-1",
      name: "Mai",
      attendance: "attending",
      guestCount: 1,
      message: "Đổi lại nhé",
    });

    const rows = getRsvpExportRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ code: "guest-1", guestCount: 1, message: "Đổi lại nhé" });
    expect(rows[0].createdAt).not.toBe(rows[0].updatedAt);
  });

  it("hides inactive invitations from public lookup but retains their RSVP", async () => {
    createAdminInvitation({ code: "guest-1", name: "Mai", maxGuests: 2 });
    await sqliteInvitationStore.upsertRsvp({
      code: "guest-1",
      name: "Mai",
      attendance: "declined",
      guestCount: 0,
      message: "",
    });

    updateAdminInvitation({ code: "guest-1", active: false });

    await expect(sqliteInvitationStore.findInvitation("guest-1")).resolves.toBeNull();
    expect(getRsvpExportRows()).toHaveLength(1);
    expect(listAdminInvitations()[0].active).toBe(false);
  });

  it("filters invitations and RSVP states and reports summary totals", async () => {
    createAdminInvitation({ code: "mai", name: "Mai", maxGuests: 2 });
    createAdminInvitation({ code: "lan", name: "Lan", maxGuests: 1 });
    createAdminInvitation({ code: "minh", name: "Minh", maxGuests: 3 });
    await sqliteInvitationStore.upsertRsvp({
      code: "mai",
      name: "Mai",
      attendance: "attending",
      guestCount: 2,
      message: "Có mặt",
    });
    await sqliteInvitationStore.upsertRsvp({
      code: "lan",
      name: "Lan",
      attendance: "declined",
      guestCount: 0,
      message: "Bận rồi",
    });

    expect(listAdminInvitations("mi").map((row) => row.code)).toEqual(["minh"]);
    expect(listAdminRsvps({ status: "pending" }).map((row) => row.code)).toEqual(["minh"]);
    expect(listAdminRsvps({ status: "attending" }).map((row) => row.code)).toEqual(["mai"]);
    expect(getAdminSummary()).toEqual({
      invitationCount: 3,
      respondedCount: 2,
      attendingCount: 1,
      declinedCount: 1,
      pendingCount: 1,
      confirmedGuestCount: 2,
    });
  });

  it("generates a URL-safe code when an admin does not supply one", () => {
    const invitation = createAdminInvitation({ name: "Cô Lan", maxGuests: 2 });
    expect(invitation.code).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

});
