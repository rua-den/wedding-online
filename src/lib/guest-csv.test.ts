import { describe, expect, it } from "vitest";
import { parseGuestCsv, toSafeCsv } from "./guest-csv";

describe("guest CSV", () => {
  it("parses quoted guest names and positive limits", () => {
    expect(parseGuestCsv('name,maxGuests\n"Anh Minh, Chị Lan",2\n')).toEqual([
      { name: "Anh Minh, Chị Lan", maxGuests: 2 },
    ]);
  });

  it("reports the source row when a guest name is blank", () => {
    expect(() => parseGuestCsv("name,maxGuests\n,2\n")).toThrow(
      "Dòng 2: Tên khách mời không được để trống.",
    );
  });

  it("rejects a non-positive or non-integer guest limit", () => {
    expect(() => parseGuestCsv("name,maxGuests\nMai,1.5\n")).toThrow(
      "Dòng 2: Số khách phải là số nguyên dương.",
    );
  });

  it("prefixes formula-like export values with an apostrophe", () => {
    expect(toSafeCsv([{ name: "=HYPERLINK(\"bad\")" }])).toContain("'=HYPERLINK");
  });

  it("quotes commas, newlines, and double quotes in exported cells", () => {
    expect(toSafeCsv([{ name: 'Mai, "Lan"\nMinh' }])).toContain('"Mai, ""Lan""\nMinh"');
  });
});

