import { describe, expect, it } from "vitest";

import { validateRsvp } from "./rsvp";

const context = {
  maxGuests: 2,
  deadline: new Date("2026-12-20T23:59:59+07:00"),
  now: new Date("2026-12-01T12:00:00+07:00"),
};

describe("validateRsvp", () => {
  it("accepts an attending reply within the invitation limit", () => {
    expect(
      validateRsvp({ attendance: "attending", guestCount: 2, message: "Hẹn gặp hai bạn!" }, context),
    ).toEqual({ ok: true, value: { attendance: "attending", guestCount: 2, message: "Hẹn gặp hai bạn!" } });
  });

  it("rejects an attending reply above the invitation limit", () => {
    expect(validateRsvp({ attendance: "attending", guestCount: 3, message: "" }, context)).toEqual({
      ok: false,
      message: "Số người tham dự vượt quá số lượng trong thiệp mời.",
    });
  });

  it("requires a declined reply to have zero guests", () => {
    expect(validateRsvp({ attendance: "declined", guestCount: 1, message: "" }, context)).toEqual({
      ok: false,
      message: "Nếu không thể tham dự, số người tham dự phải là 0.",
    });
  });

  it("rejects replies after the RSVP deadline", () => {
    expect(
      validateRsvp(
        { attendance: "attending", guestCount: 1, message: "" },
        { ...context, now: new Date("2026-12-21T00:00:00+07:00") },
      ),
    ).toEqual({ ok: false, message: "Đã hết hạn xác nhận tham dự." });
  });
});
