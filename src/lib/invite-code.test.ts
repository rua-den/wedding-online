import { describe, expect, it } from "vitest";

import { createInvitationCode } from "./invite-code";

describe("createInvitationCode", () => {
  it("creates a URL-safe random code with 32 bytes of entropy", () => {
    const code = createInvitationCode();

    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("does not reuse a code across two invitations", () => {
    expect(createInvitationCode()).not.toBe(createInvitationCode());
  });
});
