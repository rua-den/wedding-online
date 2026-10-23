import { z } from "zod";
import { getDatabase, initializeDatabase } from "./sqlite";

const item = z.object({ time: z.string().trim().min(1).max(40), title: z.string().trim().min(1).max(140), description: z.string().trim().max(400), active: z.boolean() });
export const guestGuideSchema = z.object({
  agendaEnabled: z.boolean(),
  agendaTitle: z.string().trim().min(1).max(140),
  agendaSubtitle: z.string().trim().max(400),
  agenda: z.array(item).max(20),
  layoutEnabled: z.boolean(),
  layoutTitle: z.string().trim().min(1).max(140),
  layoutSubtitle: z.string().trim().max(400),
  layoutImageSrc: z.string().trim().max(500).refine((v) => !v || /^\/uploads\/[a-zA-Z0-9._-]+$/.test(v), "Ảnh sơ đồ phải là tệp đã upload."),
  layoutAlt: z.string().trim().max(200),
});
export type GuestGuide = z.infer<typeof guestGuideSchema>;

// Five visitor-facing milestones, deliberately omitting detailed vendor operations.
export const defaultGuestGuide: GuestGuide = {
  agendaEnabled: true,
  agendaTitle: "Agenda",
  agendaSubtitle: "Những khoảnh khắc chính trong ngày vui của chúng mình.",
  agenda: [
    { time: "13:00", title: "Chuẩn bị không gian", description: "Các khu vực ngoài trời bắt đầu được hoàn thiện.", active: false },
    { time: "16:00", title: "Lễ Vows", description: "Khoảnh khắc trao lời thề của Huy & Nhi.", active: true },
    { time: "16:30", title: "Gathering & Tea Break", description: "Gặp gỡ, thưởng trà và lưu giữ kỷ niệm.", active: true },
    { time: "17:00", title: "Welcome", description: "Đón khách, gallery, scent bar và photobooth.", active: true },
    { time: "18:00", title: "Celebrate", description: "Mở màn tiệc cưới và cùng nhau nâng ly.", active: true },
  ],
  layoutEnabled: true,
  layoutTitle: "Sơ đồ khu tiệc",
  layoutSubtitle: "Các khu vực để bạn dễ dàng tìm đường và tận hưởng buổi tiệc.",
  layoutImageSrc: "",
  layoutAlt: "Sơ đồ khu vực lễ vows, quầy gallery, scent bar, tea break và photobooth",
};

function db() {
  initializeDatabase();
  const connection = getDatabase();
  connection.exec("CREATE TABLE IF NOT EXISTS guest_guide (id INTEGER PRIMARY KEY CHECK(id=1), guide_json TEXT NOT NULL, updated_at TEXT NOT NULL)");
  return connection;
}
export function getGuestGuide(): GuestGuide {
  const row = db().prepare("SELECT guide_json FROM guest_guide WHERE id=1").get() as { guide_json: string } | undefined;
  if (!row) return defaultGuestGuide;
  try {
    return guestGuideSchema.parse(JSON.parse(row.guide_json));
  } catch {
    // Never overwrite malformed existing state.
    return { ...defaultGuestGuide, agendaEnabled: false, layoutEnabled: false };
  }
}
export function updateGuestGuide(input: unknown): GuestGuide {
  const parsed = guestGuideSchema.parse(input);
  db().prepare("INSERT INTO guest_guide (id, guide_json, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET guide_json=excluded.guide_json, updated_at=excluded.updated_at")
    .run(JSON.stringify(parsed), new Date().toISOString());
  return parsed;
}
