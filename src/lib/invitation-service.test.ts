import { describe, expect, it } from "vitest";

import { getInvitation, submitRsvp, type InvitationStore } from "./invitation-service";

const invitation = {
  code: "secure-code",
  name: "Anh Minh & Chị Lan",
  maxGuests: 2,
  active: true,
};

function createStore(overrides: Partial<InvitationStore> = {}): InvitationStore {
  return {
    findInvitation: async () => invitation,
    upsertRsvp: async () => undefined,
    ...overrides,
  };
}

describe("getInvitation", () => {
  it("returns only the personalised fields for an active invitation", async () => {
    await expect(getInvitation("secure-code", createStore())).resolves.toEqual({
      ok: true,
      invitation: { guestName: "Anh Minh & Chị Lan", maxGuests: 2 },
    });
  });

  it("hides inactive invitations", async () => {
    await expect(getInvitation("secure-code", createStore({ findInvitation: async () => ({ ...invitation, active: false }) }))).resolves.toEqual({
      ok: false,
      status: 404,
      message: "Không tìm thấy thiệp mời này.",
    });
  });
});

describe("submitRsvp", () => {
  it("writes a validated response with the invitation name", async () => {
    const saved: unknown[] = [];
    const store = createStore({ upsertRsvp: async (response) => void saved.push(response) });

    await expect(
      submitRsvp(
        "secure-code",
        { attendance: "attending", guestCount: 2, message: "Hẹn gặp hai bạn!" },
        { store, deadline: new Date("2026-12-20T23:59:59+07:00"), now: new Date("2026-12-01T12:00:00+07:00") },
      ),
    ).resolves.toEqual({ ok: true });

    expect(saved).toEqual([
      {
        code: "secure-code",
        name: "Anh Minh & Chị Lan",
        attendance: "attending",
        guestCount: 2,
        message: "Hẹn gặp hai bạn!",
      },
    ]);
  });

  it("does not write a reply for an invalid guest count", async () => {
    const saved: unknown[] = [];
    const store = createStore({ upsertRsvp: async (response) => void saved.push(response) });

    await expect(
      submitRsvp(
        "secure-code",
        { attendance: "attending", guestCount: 3, message: "" },
        { store, deadline: new Date("2026-12-20T23:59:59+07:00"), now: new Date("2026-12-01T12:00:00+07:00") },
      ),
    ).resolves.toEqual({ ok: false, status: 400, message: "Số người tham dự vượt quá số lượng trong thiệp mời." });

    expect(saved).toEqual([]);
  });
});
