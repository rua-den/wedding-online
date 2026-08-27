import { afterEach, describe, expect, it, vi } from "vitest";

import { getInvitationStore } from "./runtime-store";

describe("getInvitationStore", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the local demo invitation outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await expect(getInvitationStore("demo").findInvitation("demo")).resolves.toEqual({
      code: "demo",
      name: "Khách mời thân yêu",
      maxGuests: 2,
      active: true,
    });
  });
});
