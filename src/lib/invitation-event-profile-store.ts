import { z } from "zod";

import { isGoogleMapsHttpsUrl } from "./site-settings";
import { getDatabase, initializeDatabase } from "./sqlite";
import type { InvitationContent } from "@/types/invitation-content";

export type DatedInvitationEventScope = "oct11" | "oct31";
export type InvitationEventProfile = InvitationContent["event"] & { scope: DatedInvitationEventScope };
export type InvitationEventProfiles = Record<DatedInvitationEventScope, InvitationEventProfile | null>;

const requiredText = (label: string, max: number) => z.string().trim().min(1, `Vui lòng nhập ${label}.`).max(max, `${label} quá dài.`);
const isoDate = (label: string) => requiredText(label, 80).refine((value) => !Number.isNaN(new Date(value).getTime()), `${label} không hợp lệ.`);

const profileSchema = z.object({
  scope: z.enum(["oct11", "oct31"]),
  eyebrow: requiredText("nhãn buổi lễ", 100),
  title: requiredText("tiêu đề buổi lễ", 220),
  dateTime: isoDate("ngày giờ tổ chức"),
  dateLabel: requiredText("nhãn ngày tổ chức", 160),
  timeLabel: requiredText("thời gian buổi lễ", 80),
  rsvpDeadline: isoDate("hạn RSVP"),
  venue: requiredText("tên địa điểm", 160),
  address: requiredText("địa chỉ", 240),
  mapsUrl: z.string().trim().url("Link Google Maps không hợp lệ.").refine(isGoogleMapsHttpsUrl, "Link phải là HTTPS Google Maps."),
  timeHeading: requiredText("nhãn thời gian", 80),
  venueHeading: requiredText("nhãn địa điểm", 80),
  directionsLabel: requiredText("nhãn chỉ đường", 100),
});

function database() {
  initializeDatabase();
  const connection = getDatabase();
  connection.exec(`
    CREATE TABLE IF NOT EXISTS invitation_event_profiles (
      scope TEXT PRIMARY KEY CHECK (scope IN ('oct11', 'oct31')),
      profile_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return connection;
}

function localWeddingDate(value: string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function expectedDate(scope: DatedInvitationEventScope): string {
  return scope === "oct11" ? "2026-10-11" : "2026-10-31";
}

function expectedDateLabel(scope: DatedInvitationEventScope): string {
  return scope === "oct11" ? "11/10/2026" : "31/10/2026";
}

function validateProfile(scope: DatedInvitationEventScope, input: unknown): InvitationEventProfile {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Thông tin sự kiện chưa hợp lệ.");
  if (parsed.data.scope !== scope) throw new Error("Phạm vi sự kiện không khớp ngày đang chỉnh.");
  if (localWeddingDate(parsed.data.dateTime) !== expectedDate(scope)) {
    throw new Error(`Ngày giờ tổ chức phải thuộc ${expectedDateLabel(scope)} theo múi giờ Việt Nam.`);
  }
  if (new Date(parsed.data.rsvpDeadline).getTime() > new Date(parsed.data.dateTime).getTime()) {
    throw new Error("Hạn RSVP phải trước hoặc đúng thời điểm sự kiện bắt đầu.");
  }
  return parsed.data;
}

function readProfile(scope: DatedInvitationEventScope): InvitationEventProfile | null {
  const row = database().prepare("SELECT profile_json FROM invitation_event_profiles WHERE scope = ?").get(scope) as { profile_json: string } | undefined;
  if (!row) return null;
  try {
    return validateProfile(scope, JSON.parse(row.profile_json));
  } catch {
    return null;
  }
}

export function getInvitationEventProfiles(): InvitationEventProfiles {
  return { oct11: readProfile("oct11"), oct31: readProfile("oct31") };
}

export function updateInvitationEventProfile(scope: DatedInvitationEventScope, input: unknown): InvitationEventProfile {
  const profile = validateProfile(scope, input);
  database().prepare(`
    INSERT INTO invitation_event_profiles (scope, profile_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(scope) DO UPDATE SET
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
  `).run(scope, JSON.stringify(profile), new Date().toISOString());
  return readProfile(scope)!;
}
