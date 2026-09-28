import { describe, expect, it } from "vitest";
import { parseGuestCsv, toSafeCsv } from "./guest-csv";

describe("guest CSV", () => {
  it("parses quoted guest names, positive limits, and explicit event scopes", () => {
    expect(parseGuestCsv('name,maxGuests,eventScope\n"Anh Minh, Chị Lan",2,oct11\n')).toEqual([
      { name: "Anh Minh, Chị Lan", maxGuests: 2, eventScope: "oct11" },
    ]);
  });

  it("requires eventScope in the seed header so new guests cannot silently become legacy", () => {
    expect(() => parseGuestCsv("name,maxGuests\nMai,2\n")).toThrow(
      "CSV phải có header: name,maxGuests,eventScope.",
    );
  });

  it("reports the source row when a guest name is blank", () => {
    expect(() => parseGuestCsv("name,maxGuests,eventScope\n,2,oct31\n")).toThrow(
      "Dòng 2: Tên khách mời không được để trống.",
    );
  });

  it("rejects a non-positive or non-integer guest limit", () => {
    expect(() => parseGuestCsv("name,maxGuests,eventScope\nMai,1.5,oct11\n")).toThrow(
      "Dòng 2: Số khách phải là số nguyên dương.",
    );
  });

  it("rejects unknown or legacy event scopes in new seed rows", () => {
    expect(() => parseGuestCsv("name,maxGuests,eventScope\nMai,2,legacy\n")).toThrow(
      "Dòng 2: Ngày mời phải là oct11, oct31 hoặc both.",
    );
  });

  it("parses guests invited to both dates", () => {
    expect(parseGuestCsv("name,maxGuests,eventScope\nGia đình Minh,4,both\n")).toEqual([
      { name: "Gia đình Minh", maxGuests: 4, eventScope: "both" },
    ]);
  });

  it("prefixes formula-like export values with an apostrophe", () => {
    expect(toSafeCsv([{ name: "=HYPERLINK(\"bad\")" }])).toContain("'=HYPERLINK");
  });

  it("quotes commas, newlines, and double quotes in exported cells", () => {
    expect(toSafeCsv([{ name: 'Mai, "Lan"\nMinh' }])).toContain('"Mai, ""Lan""\nMinh"');
  });
});
