import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeDatabaseForTests } from "./sqlite";
import { createAdminInvitation } from "./sqlite-store";
import { listEventRsvpsForInvitation, sqliteInvitationRsvpStore } from "./event-rsvp-store";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "event-rsvps-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("event RSVP store", () => {
  it("keeps one independent response per invitation and event", async () => {
    createAdminInvitation({ code: "both-guest", name: "Gia đình Minh", maxGuests: 4, eventScope: "both" });

    await sqliteInvitationRsvpStore.upsertEventRsvp({
      code: "both-guest",
      name: "Gia đình Minh",
      eventScope: "oct11",
      attendance: "attending",
      guestCount: 4,
      message: "Có mặt ngày 11",
    });
    await sqliteInvitationRsvpStore.upsertEventRsvp({
      code: "both-guest",
      name: "Gia đình Minh",
      eventScope: "oct31",
      attendance: "declined",
      guestCount: 0,
      message: "Ngày 31 bận",
    });

    expect(listEventRsvpsForInvitation("both-guest")).toMatchObject([
      { eventScope: "oct11", attendance: "attending", guestCount: 4, message: "Có mặt ngày 11" },
      { eventScope: "oct31", attendance: "declined", guestCount: 0, message: "Ngày 31 bận" },
    ]);
  });

  it("updates one event without overwriting the other", async () => {
    createAdminInvitation({ code: "both-guest", name: "Gia đình Minh", maxGuests: 4, eventScope: "both" });
    await sqliteInvitationRsvpStore.upsertEventRsvp({ code: "both-guest", name: "Gia đình Minh", eventScope: "oct11", attendance: "attending", guestCount: 2, message: "11" });
    await sqliteInvitationRsvpStore.upsertEventRsvp({ code: "both-guest", name: "Gia đình Minh", eventScope: "oct31", attendance: "attending", guestCount: 3, message: "31" });
    await sqliteInvitationRsvpStore.upsertEventRsvp({ code: "both-guest", name: "Gia đình Minh", eventScope: "oct11", attendance: "declined", guestCount: 0, message: "Đổi ngày 11" });

    expect(listEventRsvpsForInvitation("both-guest")).toMatchObject([
      { eventScope: "oct11", attendance: "declined", guestCount: 0, message: "Đổi ngày 11" },
      { eventScope: "oct31", attendance: "attending", guestCount: 3, message: "31" },
    ]);
  });
});
