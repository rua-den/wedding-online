import { describe, expect, it } from "vitest";

import { getCountdownParts } from "./countdown";

describe("getCountdownParts", () => {
  it("calculates remaining calendar parts from the configured event time", () => {
    const result = getCountdownParts(
      "2026-12-31T00:00:00+07:00",
      new Date("2026-12-29T22:58:57+07:00"),
    );

    expect(result).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 3, ended: false });
  });

  it("marks an event as ended without returning negative time", () => {
    const result = getCountdownParts(
      "2026-12-31T00:00:00+07:00",
      new Date("2027-01-01T00:00:00+07:00"),
    );

    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
  });
});
