import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sheets", () => ({
  googleSheetsStore: { findInvitation: vi.fn(), upsertRsvp: vi.fn() },
}));

import { PUT } from "./route";

describe("PUT /api/rsvp/[code] rate-limit identity", () => {
  it("does not trust spoofed forwarded-for entries when the proxy identity is absent", async () => {
    const body = JSON.stringify({ attendance: "declined", guestCount: 0, message: "" });

    for (let index = 0; index < 10; index += 1) {
      const response = await PUT(new Request("http://localhost/api/rsvp/invite-code", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${index}` },
        body,
      }), { params: Promise.resolve({ code: "invite-code" }) });
      expect(response.status).not.toBe(429);
    }

    const blocked = await PUT(new Request("http://localhost/api/rsvp/invite-code", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.250" },
      body,
    }), { params: Promise.resolve({ code: "invite-code" }) });

    expect(blocked.status).toBe(429);
  });
});
