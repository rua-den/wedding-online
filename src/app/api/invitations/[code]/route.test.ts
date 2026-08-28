import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sqlite-store", () => ({
  sqliteInvitationStore: {
    findInvitation: vi.fn().mockRejectedValue(new Error("SQLite unavailable")),
    upsertRsvp: vi.fn(),
  },
}));

import { GET } from "./route";

describe("GET /api/invitations/[code]", () => {
  it("returns a generic Vietnamese JSON error when the invitation store fails", async () => {
    const response = await GET(new Request("http://localhost/api/invitations/invite-code"), {
      params: Promise.resolve({ code: "invite-code" }),
    });

    await expect(response.json()).resolves.toEqual({ message: "Không thể tải thiệp mời. Vui lòng thử lại sau." });
    expect(response.status).toBe(500);
  });
});
