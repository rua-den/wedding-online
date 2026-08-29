import { z } from "zod";

import { wedding, type EditableWeddingEvent } from "@/config/wedding";

import type { PublicMediaAsset } from "./media-store";
import { getDatabase, initializeDatabase } from "./sqlite";

export type SiteSettings = EditableWeddingEvent & {
  venueImage?: PublicMediaAsset | null;
};

export type SiteSettingsInput = Partial<EditableWeddingEvent>;

type StoredSiteSettings = Partial<Record<keyof EditableWeddingEvent, string | null>>;

const requiredText = (label: string, max: number) => z
  .string({ error: `${label} không hợp lệ.` })
  .trim()
  .min(1, `Vui lòng nhập ${label.toLocaleLowerCase()}.`)
  .max(max, `${label} không được dài quá ${max} ký tự.`);

export function isGoogleMapsHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLocaleLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host === "goo.gl") return /^\/maps(?:\/|$)/.test(url.pathname);
    if (/^maps\.google\.(?:com|com\.[a-z]{2}|[a-z]{2})$/.test(host)) return true;
    return /^(?:www\.)?google\.(?:com|com\.[a-z]{2}|[a-z]{2})$/.test(host)
      && /^\/maps(?:\/|$)/.test(url.pathname);
  } catch {
    return false;
  }
}

const mapsUrl = z
  .string({ error: "Link Google Maps không hợp lệ." })
  .trim()
  .min(1, "Vui lòng nhập link Google Maps.")
  .max(2048, "Link Google Maps không hợp lệ.")
  .url("Link Google Maps không hợp lệ.")
  .refine(isGoogleMapsHttpsUrl, "Link Google Maps phải là địa chỉ HTTPS của Google Maps.");

export const siteSettingsSchema = z.object({
  venue: requiredText("Tên địa điểm", 160),
  address: requiredText("Địa chỉ", 240),
  dateLabel: requiredText("Nhãn ngày", 160),
  timeLabel: requiredText("Thời gian", 80),
  mapsUrl,
});

export const siteSettingsUpdateSchema = siteSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Vui lòng nhập ít nhất một thông tin cần cập nhật.",
);

export class SiteSettingsValidationError extends Error {}

type SiteSettingsRow = {
  venue: string | null;
  address: string | null;
  date_label: string | null;
  time_label: string | null;
  maps_url: string | null;
};

function database() {
  initializeDatabase();
  return getDatabase();
}

function storedSettings(): StoredSiteSettings | null {
  const row = database()
    .prepare("SELECT venue, address, date_label, time_label, maps_url FROM site_settings WHERE id = 1")
    .get() as SiteSettingsRow | undefined;
  if (!row) return null;
  return {
    venue: row.venue,
    address: row.address,
    dateLabel: row.date_label,
    timeLabel: row.time_label,
    mapsUrl: row.maps_url,
  };
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function fallbackSettings(): EditableWeddingEvent {
  return {
    venue: wedding.event.venue,
    address: wedding.event.address,
    dateLabel: wedding.event.dateLabel,
    timeLabel: wedding.event.timeLabel,
    mapsUrl: wedding.event.mapsUrl,
  };
}

export function mergeSiteSettings(stored: StoredSiteSettings | null = null, venueImage: PublicMediaAsset | null = null): SiteSettings {
  const fallback = fallbackSettings();
  const storedMapsUrl = nonEmpty(stored?.mapsUrl);
  return {
    venue: nonEmpty(stored?.venue) ?? fallback.venue,
    address: nonEmpty(stored?.address) ?? fallback.address,
    dateLabel: nonEmpty(stored?.dateLabel) ?? fallback.dateLabel,
    timeLabel: nonEmpty(stored?.timeLabel) ?? fallback.timeLabel,
    mapsUrl: storedMapsUrl && isGoogleMapsHttpsUrl(storedMapsUrl) ? storedMapsUrl : fallback.mapsUrl,
    venueImage,
  };
}

function validationMessage(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Thông tin địa điểm chưa hợp lệ.";
  return first.message;
}

function assertSettings(input: unknown): asserts input is SiteSettingsInput {
  const parsed = siteSettingsUpdateSchema.safeParse(input);
  if (!parsed.success) throw new SiteSettingsValidationError(validationMessage(parsed.error));
}

export function getSiteSettings(): SiteSettings {
  return mergeSiteSettings(storedSettings());
}

export function updateSiteSettings(input: SiteSettingsInput): SiteSettings {
  assertSettings(input);
  const previous = storedSettings() ?? {};
  const merged = mergeSiteSettings({ ...previous, ...input });
  const parsed = siteSettingsSchema.safeParse({
    venue: merged.venue,
    address: merged.address,
    dateLabel: merged.dateLabel,
    timeLabel: merged.timeLabel,
    mapsUrl: merged.mapsUrl,
  });
  if (!parsed.success) throw new SiteSettingsValidationError(validationMessage(parsed.error));

  const now = new Date().toISOString();
  database()
    .prepare(`
      INSERT INTO site_settings (id, venue, address, date_label, time_label, maps_url, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        venue = excluded.venue,
        address = excluded.address,
        date_label = excluded.date_label,
        time_label = excluded.time_label,
        maps_url = excluded.maps_url,
        updated_at = excluded.updated_at
    `)
    .run(parsed.data.venue, parsed.data.address, parsed.data.dateLabel, parsed.data.timeLabel, parsed.data.mapsUrl, now);

  return getSiteSettings();
}
