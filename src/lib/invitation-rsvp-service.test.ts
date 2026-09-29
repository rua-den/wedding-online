import { describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import type { InvitationEventProfile, InvitationEventProfiles } from "./invitation-event-profile-store";
import { submitInvitationRsvp, type InvitationRsvpStore } from "./invitation-rsvp-service";

function profile(scope: "oct11" | "oct31"): InvitationEventProfile {
  const base = defaultInvitationContent().event;
  const day = scope === "oct11" ? "11" : "31";
  return {
    ...base,
    scope,
    dateTime: `2026-10-${day}T11:00:00+07:00`,
    dateLabel: `${day}/10/2026`,
    rsvpDeadline: scope === "oct11" ? "2026-10-10T23:59:59+07:00" : "2026-10-30T23:59:59+07:00",
  };
}

const profiles: InvitationEventProfiles = { oct11: profile("oct11"), oct31: profile("oct31") };

function store(eventScope: "legacy" | "oct11" | "oct31" | "both" = "both"): InvitationRsvpStore {
  return {
    findInvitation: vi.fn(async () => ({ code: "invite", name: "Khách", maxGuests: 2, active: true, eventScope })),
    upsertLegacyRsvp: vi.fn(async () => undefined),
    upsertEventRsvp: vi.fn(async () => undefined),
  };
}

describe("submitInvitationRsvp", () => {
  it("preserves the legacy RSVP path for pre-split invitations", async () => {
    const target = store("legacy");
    const result = await submitInvitationRsvp("invite", { attendance: "attending", guestCount: 2, message: "Có mặt" }, {
      store: target,
      eventProfiles: profiles,
      legacyDeadline: new Date("2026-12-20T23:59:59+07:00"),
      now: new Date("2026-10-01T12:00:00+07:00"),
    });
    expect(result).toEqual({ ok: true });
    expect(target.upsertLegacyRsvp).toHaveBeenCalledOnce();
    expect(target.upsertEventRsvp).not.toHaveBeenCalled();
  });

  it("requires the submitted event scope for a dated invitation", async () => {
    const target = store("oct11");
    const result = await submitInvitationRsvp("invite", { attendance: "attending", guestCount: 1, message: "" }, {
      store: target,
      eventProfiles: profiles,
      legacyDeadline: new Date("2026-12-20T23:59:59+07:00"),
      now: new Date("2026-10-01T12:00:00+07:00"),
    });
    expect(result).toEqual({ ok: false, status: 400, message: "Vui lòng chọn đúng ngày tham dự." });
  });

  it("rejects a scope that the invitation was not assigned", async () => {
    const target = store("oct11");
    const result = await submitInvitationRsvp("invite", { eventScope: "oct31", attendance: "attending", guestCount: 1, message: "" }, {
      store: target,
      eventProfiles: profiles,
      legacyDeadline: new Date("2026-12-20T23:59:59+07:00"),
      now: new Date("2026-10-01T12:00:00+07:00"),
    });
    expect(result).toEqual({ ok: false, status: 400, message: "Ngày xác nhận không thuộc thiệp mời này." });
  });

  it("stores two independent responses for a both invitation", async () => {
    const target = store("both");
    const deps = {
      store: target,
      eventProfiles: profiles,
      legacyDeadline: new Date("2026-12-20T23:59:59+07:00"),
      now: new Date("2026-10-01T12:00:00+07:00"),
    };
    await expect(submitInvitationRsvp("invite", { eventScope: "oct11", attendance: "attending", guestCount: 2, message: "Ngày 11" }, deps)).resolves.toEqual({ ok: true });
    await expect(submitInvitationRsvp("invite", { eventScope: "oct31", attendance: "declined", guestCount: 0, message: "Ngày 31 bận" }, deps)).resolves.toEqual({ ok: true });
    expect(target.upsertEventRsvp).toHaveBeenNthCalledWith(1, expect.objectContaining({ eventScope: "oct11", attendance: "attending", guestCount: 2 }));
    expect(target.upsertEventRsvp).toHaveBeenNthCalledWith(2, expect.objectContaining({ eventScope: "oct31", attendance: "declined", guestCount: 0 }));
  });

  it("uses the selected event deadline rather than the global deadline", async () => {
    const target = store("both");
    const deps = {
      store: target,
      eventProfiles: profiles,
      legacyDeadline: new Date("2026-12-20T23:59:59+07:00"),
      now: new Date("2026-10-20T12:00:00+07:00"),
    };
    const closed = await submitInvitationRsvp("invite", { eventScope: "oct11", attendance: "attending", guestCount: 1, message: "" }, deps);
    const open = await submitInvitationRsvp("invite", { eventScope: "oct31", attendance: "attending", guestCount: 1, message: "" }, deps);
    expect(closed).toEqual({ ok: false, status: 400, message: "Đã hết hạn xác nhận tham dự." });
    expect(open).toEqual({ ok: true });
  });
});
