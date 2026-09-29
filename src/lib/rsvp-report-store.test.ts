import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sqliteInvitationRsvpStore } from "./event-rsvp-store";
import { getAdminRsvpSummary, listAdminRsvpTargets } from "./rsvp-report-store";
import { closeDatabaseForTests } from "./sqlite";
import { createAdminInvitation, sqliteInvitationStore } from "./sqlite-store";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "rsvp-report-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("RSVP reporting", () => {
  it("expands a both invitation into one target per date", () => {
    createAdminInvitation({ code: "both", name: "Gia đình Minh", maxGuests: 4, eventScope: "both" });
    expect(listAdminRsvpTargets().map((row) => ({ scope: row.eventScope, attendance: row.attendance }))).toEqual([
      { scope: "oct11", attendance: null },
      { scope: "oct31", attendance: null },
    ]);
    expect(getAdminRsvpSummary()).toEqual({
      invitationCount: 1,
      respondedCount: 0,
      attendingCount: 0,
      declinedCount: 0,
      pendingCount: 2,
      confirmedGuestCount: 0,
    });
  });

  it("combines legacy and dated responses without reinterpreting legacy rows", async () => {
    createAdminInvitation({ code: "legacy", name: "Khách cũ", maxGuests: 2 });
    createAdminInvitation({ code: "both", name: "Gia đình Minh", maxGuests: 4, eventScope: "both" });
    await sqliteInvitationStore.upsertRsvp({ code: "legacy", name: "Khách cũ", attendance: "attending", guestCount: 2, message: "Legacy" });
    await sqliteInvitationRsvpStore.upsertEventRsvp({ code: "both", name: "Gia đình Minh", eventScope: "oct11", attendance: "attending", guestCount: 4, message: "11" });
    await sqliteInvitationRsvpStore.upsertEventRsvp({ code: "both", name: "Gia đình Minh", eventScope: "oct31", attendance: "declined", guestCount: 0, message: "31" });

    expect(listAdminRsvpTargets({ status: "attending" }).map((row) => `${row.code}:${row.eventScope}`)).toEqual(["both:oct11", "legacy:legacy"]);
    expect(listAdminRsvpTargets({ status: "declined" }).map((row) => `${row.code}:${row.eventScope}`)).toEqual(["both:oct31"]);
    expect(getAdminRsvpSummary()).toEqual({
      invitationCount: 2,
      respondedCount: 3,
      attendingCount: 2,
      declinedCount: 1,
      pendingCount: 0,
      confirmedGuestCount: 6,
    });
  });
});
