import { z } from "zod";

import { defaultInvitationContent } from "@/config/invitation-content";
import { canonicalUploadFilename } from "@/lib/media-upload";
import { getDatabase, initializeDatabase } from "@/lib/sqlite";
import { getSiteSettings, isGoogleMapsHttpsUrl, updateSiteSettings } from "@/lib/site-settings";
import type { InvitationContent } from "@/types/invitation-content";

const text = (label: string, max: number) => z.string().trim().min(1, `Vui lòng nhập ${label}.`).max(max, `${label} quá dài.`);
const isoDate = (label: string) => text(label, 80).refine((value) => !Number.isNaN(new Date(value).getTime()), `${label} không hợp lệ.`);
const milestoneImage = z.string().trim().refine((value) => canonicalUploadFilename(value) !== null, "Ảnh mốc chuyện tình không hợp lệ.").nullable().optional().default(null);
const milestoneSchema = z.object({
  date: text("mốc thời gian", 120),
  title: text("tiêu đề câu chuyện", 160),
  description: text("nội dung câu chuyện", 600),
  imageSrc: milestoneImage,
});

export const invitationContentSchema: z.ZodType<InvitationContent> = z.object({
  couple: z.object({
    groom: text("tên chú rể", 160),
    bride: text("tên cô dâu", 160),
    shortGroomName: text("tên ngắn chú rể", 60),
    shortBrideName: text("tên ngắn cô dâu", 60),
    groomBio: text("mô tả chú rể", 600),
    brideBio: text("mô tả cô dâu", 600),
  }),
  cover: z.object({ eyebrow: text("nhãn cover", 100), message: text("lời mở đầu", 500), scrollCue: text("nút khám phá", 100) }),
  coupleSection: z.object({
    eyebrow: text("nhãn phần cô dâu chú rể", 100),
    title: text("tiêu đề phần cô dâu chú rể", 180),
    groomRole: text("vai trò chú rể", 80),
    brideRole: text("vai trò cô dâu", 80),
  }),
  countdown: z.object({ eyebrow: text("nhãn đếm ngược", 100), title: text("tiêu đề đếm ngược", 180) }),
  story: z.object({
    eyebrow: text("nhãn chuyện tình", 100),
    title: text("tiêu đề chuyện tình", 180),
    milestones: z.array(milestoneSchema).min(1, "Cần ít nhất một mốc chuyện tình.").max(12, "Tối đa 12 mốc chuyện tình."),
  }),
  event: z.object({
    eyebrow: text("nhãn buổi lễ", 100),
    title: text("tiêu đề buổi lễ", 220),
    dateTime: isoDate("ngày giờ tổ chức"),
    dateLabel: text("nhãn ngày tổ chức", 160),
    timeLabel: text("thời gian buổi lễ", 80),
    rsvpDeadline: isoDate("hạn RSVP"),
    venue: text("tên địa điểm", 160),
    address: text("địa chỉ", 240),
    mapsUrl: z.string().trim().url("Link Google Maps không hợp lệ.").refine(isGoogleMapsHttpsUrl, "Link phải là HTTPS Google Maps."),
  }),
  gallery: z.object({ eyebrow: text("nhãn gallery", 100), title: text("tiêu đề gallery", 180) }),
  personal: z.object({ eyebrow: text("nhãn thiệp riêng", 100), message: text("lời mời riêng", 500) }),
  rsvp: z.object({ eyebrow: text("nhãn RSVP", 100), title: text("tiêu đề RSVP", 180), intro: text("lời nhắc RSVP", 220) }),
  footer: z.object({ title: text("tên footer", 120), message: text("lời footer", 300) }),
});

function database() {
  initializeDatabase();
  const connection = getDatabase();
  connection.exec(`
    CREATE TABLE IF NOT EXISTS invitation_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return connection;
}

function storedContent(): InvitationContent | null {
  const row = database().prepare("SELECT content_json FROM invitation_content WHERE id = 1").get() as { content_json?: string } | undefined;
  if (!row?.content_json) return null;
  try {
    const parsed = invitationContentSchema.safeParse(JSON.parse(row.content_json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function getInvitationContent(): InvitationContent {
  const content = storedContent() ?? defaultInvitationContent();
  const settings = getSiteSettings();
  return {
    ...content,
    event: {
      ...content.event,
      venue: settings.venue,
      address: settings.address,
      dateLabel: settings.dateLabel,
      timeLabel: settings.timeLabel,
      mapsUrl: settings.mapsUrl,
    },
  };
}

export function updateInvitationContent(input: unknown): InvitationContent {
  const parsed = invitationContentSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Nội dung thiệp chưa hợp lệ.");

  updateSiteSettings({
    venue: parsed.data.event.venue,
    address: parsed.data.event.address,
    dateLabel: parsed.data.event.dateLabel,
    timeLabel: parsed.data.event.timeLabel,
    mapsUrl: parsed.data.event.mapsUrl,
  });

  const now = new Date().toISOString();
  database().prepare(`
    INSERT INTO invitation_content (id, content_json, updated_at)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content_json = excluded.content_json, updated_at = excluded.updated_at
  `).run(JSON.stringify(parsed.data), now);

  return getInvitationContent();
}
