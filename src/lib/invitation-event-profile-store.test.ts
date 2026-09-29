import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { closeDatabaseForTests } from "./sqlite";
import {
  getInvitationEventProfiles,
  updateInvitationEventProfile,
  type InvitationEventProfile,
} from "./invitation-event-profile-store";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "invitation-events-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

function profile(scope: "oct11" | "oct31"): InvitationEventProfile {
  const base = defaultInvitationContent().event;
  const day = scope === "oct11" ? "11" : "31";
  return {
    ...base,
    scope,
    title: scope === "oct11" ? "Tiệc ngày 11" : "Tiệc ngày 31",
    dateTime: `2026-10-${day}T11:00:00+07:00`,
    dateLabel: `${day}/10/2026`,
    timeLabel: "11:00",
    rsvpDeadline: `2026-10-${day}T10:00:00+07:00`,
    venue: scope === "oct11" ? "Sảnh 11" : "Sảnh 31",
    address: scope === "oct11" ? "Địa chỉ 11" : "Địa chỉ 31",
  };
}

describe("invitation event profile store", () => {
  it("starts with both dated profiles unconfigured", () => {
    expect(getInvitationEventProfiles()).toEqual({ oct11: null, oct31: null });
  });

  it("persists each dated event independently", () => {
    updateInvitationEventProfile("oct11", profile("oct11"));
    expect(getInvitationEventProfiles()).toMatchObject({
      oct11: { scope: "oct11", venue: "Sảnh 11", dateLabel: "11/10/2026", timeLabel: "11:00" },
      oct31: null,
    });

    updateInvitationEventProfile("oct31", profile("oct31"));
    expect(getInvitationEventProfiles()).toMatchObject({
      oct11: { venue: "Sảnh 11" },
      oct31: { scope: "oct31", venue: "Sảnh 31", dateLabel: "31/10/2026", timeLabel: "11:00" },
    });
  });

  it("derives the visible date and time from scope plus dateTime", () => {
    const lyingDisplay = {
      ...profile("oct11"),
      dateLabel: "31/10/2026",
      timeLabel: "23:59",
      dateTime: "2026-10-11T14:30:00+07:00",
    };

    expect(updateInvitationEventProfile("oct11", lyingDisplay)).toMatchObject({
      dateLabel: "11/10/2026",
      timeLabel: "14:30",
    });
  });

  it("rejects a profile whose event date does not match its scope", () => {
    const wrongDate = { ...profile("oct11"), dateTime: "2026-10-31T11:00:00+07:00" };
    expect(() => updateInvitationEventProfile("oct11", wrongDate)).toThrow("11/10/2026");
  });

  it("rejects an RSVP deadline after the event starts", () => {
    const invalid = { ...profile("oct31"), rsvpDeadline: "2026-11-01T10:00:00+07:00" };
    expect(() => updateInvitationEventProfile("oct31", invalid)).toThrow("Hạn RSVP");
  });

  it("rejects non-Google Maps URLs", () => {
    const invalid = { ...profile("oct11"), mapsUrl: "https://example.com/venue" };
    expect(() => updateInvitationEventProfile("oct11", invalid)).toThrow("Google Maps");
  });
});
