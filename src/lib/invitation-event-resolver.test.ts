import { describe, expect, it } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import type { InvitationEventProfile, InvitationEventProfiles } from "./invitation-event-profile-store";
import { resolveInvitationEvents } from "./invitation-event-resolver";

function profile(scope: "oct11" | "oct31"): InvitationEventProfile {
  const base = defaultInvitationContent().event;
  const day = scope === "oct11" ? "11" : "31";
  return {
    ...base,
    scope,
    title: `Tiệc ${day}`,
    dateTime: `2026-10-${day}T11:00:00+07:00`,
    dateLabel: `${day}/10/2026`,
    rsvpDeadline: `2026-10-${day}T10:00:00+07:00`,
    venue: `Sảnh ${day}`,
  };
}

const profiles: InvitationEventProfiles = { oct11: profile("oct11"), oct31: profile("oct31") };
const legacy = defaultInvitationContent().event;

describe("resolveInvitationEvents", () => {
  it("returns only the assigned 11/10 event", () => {
    const result = resolveInvitationEvents("oct11", profiles, legacy, new Date("2026-10-01T00:00:00+07:00"));
    expect(result).toMatchObject({ ok: true, primary: { scope: "oct11", venue: "Sảnh 11" } });
    if (result.ok) expect(result.events.map((event) => event.scope)).toEqual(["oct11"]);
  });

  it("returns both events but counts down to the earliest upcoming event", () => {
    const result = resolveInvitationEvents("both", profiles, legacy, new Date("2026-10-01T00:00:00+07:00"));
    expect(result).toMatchObject({ ok: true, primary: { scope: "oct11" } });
    if (result.ok) expect(result.events.map((event) => event.scope)).toEqual(["oct11", "oct31"]);
  });

  it("switches the primary event to 31/10 after 11/10 has passed", () => {
    const result = resolveInvitationEvents("both", profiles, legacy, new Date("2026-10-20T00:00:00+07:00"));
    expect(result).toMatchObject({ ok: true, primary: { scope: "oct31" } });
  });

  it("does not fall back to legacy content when an assigned profile is missing", () => {
    const result = resolveInvitationEvents("oct31", { ...profiles, oct31: null }, legacy, new Date("2026-10-01T00:00:00+07:00"));
    expect(result).toEqual({ ok: false, message: "Thông tin sự kiện 31/10 chưa được cấu hình." });
  });

  it("requires both configured profiles for guests invited to both dates", () => {
    const result = resolveInvitationEvents("both", { oct11: profiles.oct11, oct31: null }, legacy, new Date("2026-10-01T00:00:00+07:00"));
    expect(result).toEqual({ ok: false, message: "Thiệp hai ngày chưa được cấu hình đầy đủ 11/10 và 31/10." });
  });

  it("preserves the old global event for legacy invitations", () => {
    const result = resolveInvitationEvents("legacy", { oct11: null, oct31: null }, legacy, new Date("2026-10-01T00:00:00+07:00"));
    expect(result).toMatchObject({ ok: true, primary: { scope: "legacy", venue: legacy.venue } });
  });
});
