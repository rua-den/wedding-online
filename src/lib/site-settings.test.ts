import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { wedding } from "@/config/wedding";
import { closeDatabaseForTests } from "./sqlite";
import {
  getSiteSettings,
  mergeSiteSettings,
  updateSiteSettings,
} from "./site-settings";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "site-settings-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("site settings", () => {
  it("merges stored venue values with wedding config defaults", () => {
    expect(mergeSiteSettings({ venue: "Nhà hàng mới", address: "Địa chỉ mới" })).toMatchObject({
      venue: "Nhà hàng mới",
      address: "Địa chỉ mới",
      dateLabel: wedding.event.dateLabel,
      timeLabel: wedding.event.timeLabel,
      mapsUrl: wedding.event.mapsUrl,
    });
  });

  it("falls back to the config when no settings have been saved", () => {
    expect(getSiteSettings()).toMatchObject({
      venue: wedding.event.venue,
      address: wedding.event.address,
      dateLabel: wedding.event.dateLabel,
      timeLabel: wedding.event.timeLabel,
      mapsUrl: wedding.event.mapsUrl,
    });
  });

  it("persists settings idempotently and returns the merged values", () => {
    const first = updateSiteSettings({
      venue: "Sảnh Hoa",
      address: "12 Đường Mùa Xuân",
      dateLabel: "Thứ bảy, ngày 20 tháng 12 năm 2027",
      timeLabel: "18:00",
      mapsUrl: "https://www.google.com/maps?q=Sanh+Hoa",
    });
    const second = updateSiteSettings({
      venue: "Sảnh Hoa",
      address: "12 Đường Mùa Xuân",
      dateLabel: "Thứ bảy, ngày 20 tháng 12 năm 2027",
      timeLabel: "18:00",
      mapsUrl: "https://www.google.com/maps?q=Sanh+Hoa",
    });

    expect(first).toEqual(second);
    expect(getSiteSettings()).toMatchObject(first);
  });

  it("rejects malformed or non-HTTPS Google Maps URLs", () => {
    expect(() => updateSiteSettings({ mapsUrl: "https://example.com/venue" })).toThrow("Google Maps");
    expect(() => updateSiteSettings({ mapsUrl: "http://maps.google.com/?q=venue" })).toThrow("HTTPS");
  });
});
