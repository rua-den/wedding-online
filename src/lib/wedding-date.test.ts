import { describe, expect, it } from "vitest";

import { formatWeddingHeroDate } from "./wedding-date";

describe("formatWeddingHeroDate", () => {
  it("derives the cover date from the configured event time in Vietnam", () => {
    expect(formatWeddingHeroDate("2027-12-19T10:30:00+07:00")).toEqual({
      day: "19",
      month: "THÁNG 12",
      year: "2027",
    });
  });
});
