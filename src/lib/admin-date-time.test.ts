import { describe, expect, it } from "vitest";

import { datetimeLocalToVietnamIso, vietnamIsoToDatetimeLocal } from "./admin-date-time";

describe("admin date time values", () => {
  it("shows a persisted Vietnam ISO instant as a local picker value", () => {
    expect(vietnamIsoToDatetimeLocal("2026-10-11T11:00:00+07:00")).toBe("2026-10-11T11:00");
    expect(vietnamIsoToDatetimeLocal("2026-10-11T04:00:00Z")).toBe("2026-10-11T11:00");
    expect(vietnamIsoToDatetimeLocal("2026-10-10T17:00:00Z")).toBe("2026-10-11T00:00");
    expect(vietnamIsoToDatetimeLocal("2026-10-11T04:00:00+09:00")).toBe("2026-10-11T02:00");
    expect(vietnamIsoToDatetimeLocal("not-a-date")).toBe("");
  });

  it("persists a picker wall clock with the explicit Vietnam offset", () => {
    expect(datetimeLocalToVietnamIso("2026-10-11T11:00")).toBe("2026-10-11T11:00:00+07:00");
    expect(datetimeLocalToVietnamIso("2026-10-11T11:00:42")).toBe("2026-10-11T11:00:00+07:00");
  });

  it("keeps an empty unconfigured profile empty", () => {
    expect(vietnamIsoToDatetimeLocal("")).toBe("");
    expect(datetimeLocalToVietnamIso("")).toBe("");
  });
});
