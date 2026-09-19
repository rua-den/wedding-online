import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sqlite-store", () => ({
  sqliteInvitationStore: { findInvitation: vi.fn(), upsertRsvp: vi.fn() },
}));

import { PUT } from "./route";

function rsvpRequest({ realIp, forwardedFor }: { realIp?: string; forwardedFor?: string }) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (realIp) headers.set("x-real-ip", realIp);
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  return new Request("http://localhost/api/rsvp/invite-code", {
    method: "PUT",
    headers,
    body: JSON.stringify({ attendance: "declined", guestCount: 0, message: "" }),
  });
}

describe("PUT /api/rsvp/[code] rate-limit identity", () => {
  it("keeps different trusted-proxy forwarded clients on separate quotas", async () => {
    for (let index = 0; index < 11; index += 1) {
      const response = await PUT(rsvpRequest({ forwardedFor: `198.51.100.${index + 1}` }), { params: Promise.resolve({ code: "invite-code" }) });
      expect(response.status).not.toBe(429);
    }
  });

  it("rate limits repeated submissions from the same forwarded client", async () => {
    for (let index = 0; index < 10; index += 1) {
      const response = await PUT(rsvpRequest({ forwardedFor: "203.0.113.200" }), { params: Promise.resolve({ code: "invite-code" }) });
      expect(response.status).not.toBe(429);
    }

    const blocked = await PUT(rsvpRequest({ forwardedFor: "203.0.113.200" }), { params: Promise.resolve({ code: "invite-code" }) });
    expect(blocked.status).toBe(429);
  });

  it("does not let spoofed forwarded-for values rotate around the RSVP rate limit", async () => {
    for (let index = 0; index < 10; index += 1) {
      const response = await PUT(rsvpRequest({
        realIp: "192.0.2.44",
        forwardedFor: `198.51.100.${100 + index}, 192.0.2.44`,
      }), { params: Promise.resolve({ code: "invite-code" }) });
      expect(response.status).not.toBe(429);
    }

    const blocked = await PUT(rsvpRequest({
      realIp: "192.0.2.44",
      forwardedFor: "203.0.113.250, 192.0.2.44",
    }), { params: Promise.resolve({ code: "invite-code" }) });
    expect(blocked.status).toBe(429);
  });
});
