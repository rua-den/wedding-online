import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sqlite-store", () => ({
  sqliteInvitationStore: { findInvitation: vi.fn(), upsertRsvp: vi.fn() },
}));

import { PUT } from "./route";

function rsvpRequest(ip: string) {
  return new Request("http://localhost/api/rsvp/invite-code", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ attendance: "declined", guestCount: 0, message: "" }),
  });
}

describe("PUT /api/rsvp/[code] rate-limit identity", () => {
  it("keeps different Caddy-forwarded clients on separate quotas", async () => {
    for (let index = 0; index < 11; index += 1) {
      const response = await PUT(rsvpRequest(`198.51.100.${index + 1}`), { params: Promise.resolve({ code: "invite-code" }) });
      expect(response.status).not.toBe(429);
    }
  });

  it("rate limits repeated submissions from the same forwarded client", async () => {
    for (let index = 0; index < 10; index += 1) {
      const response = await PUT(rsvpRequest("203.0.113.200"), { params: Promise.resolve({ code: "invite-code" }) });
      expect(response.status).not.toBe(429);
    }

    const blocked = await PUT(rsvpRequest("203.0.113.200"), { params: Promise.resolve({ code: "invite-code" }) });
    expect(blocked.status).toBe(429);
  });
});
