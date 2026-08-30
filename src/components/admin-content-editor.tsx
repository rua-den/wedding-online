"use client";

import Image from "next/image";
import { useState } from "react";
import type { InvitationContent, LoveStoryMilestoneContent } from "@/types/invitation-content";
import { MediaCropEditor, type MediaCropValues } from "./media-crop-editor";
import styles from "./admin-content-editor.module.css";

type Tab = "couple" | "cover" | "countdown" | "story" | "event" | "gallery" | "personal" | "footer";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "couple", label: "Cặp đôi" }, { id: "cover", label: "Cover" }, { id: "countdown", label: "Đếm ngược" }, { id: "story", label: "Chuyện tình" }, { id: "event", label: "Lễ cưới" }, { id: "gallery", label: "Gallery" }, { id: "personal", label: "Thiệp riêng & RSVP" }, { id: "footer", label: "Footer" },
];
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type CropState = { index: number; restoreTarget: HTMLButtonElement | null } | null;
const defaultCrop = { imageFocusX: 50, imageFocusY: 50, imageZoom: 1 } as const;

export function AdminContentEditor({ initialContent, fetcher }: { initialContent: InvitationContent; fetcher?: Fetcher }) {
  const request = fetcher ?? fetch;
  const [active, setActive] = useState<Tab>("couple");
  const [form, setForm] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [uploadingMilestone, setUploadingMilestone] = useState<number | null>(null);
  const [cropState, setCropState] = useState<CropState>(null);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await request("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json().catch(() => null) as { content?: InvitationContent; message?: string } | null;
      if (!response.ok) { setMessage(body?.message ?? "Không thể lưu nội dung thiệp."); return; }
      if (body?.content) setForm(body.content);
      setMessage("Đã lưu nội dung thiệp.");
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); } finally { setBusy(false); }
  }

  function updateMilestone(index: number, patch: Partial<LoveStoryMilestoneContent>) {
    setForm((current) => ({ ...current, story: { ...current.story, milestones: current.story.milestones.map((item, i) => i === index ? { ...item, ...patch } : item) } }));
  }

  async function uploadMilestoneImage(index: number, file: File) {
    setUploadingMilestone(index); setMessage("");
    try {
      const data = new FormData(); data.set("file", file);
      const response = await request("/api/admin/content/image", { method: "POST", body: data });
      const body = await response.json().catch(() => null) as { src?: string; message?: string } | null;
      if (!response.ok || !body?.src) { setMessage(body?.message ?? "Không thể tải ảnh mốc lên."); return; }
      updateMilestone(index, { imageSrc: body.src, ...defaultCrop });
      setMessage(`Đã tải ảnh cho mốc ${index + 1}. Bấm “Lưu nội dung” để áp dụng.`);
    } catch { setMessage("Không thể kết nối để tải ảnh mốc."); } finally { setUploadingMilestone(null); }
  }

  function saveMilestoneCrop(values: MediaCropValues) {
    if (!cropState) return;
    updateMilestone(cropState.index, { imageFocusX: values.focusX, imageFocusY: values.focusY, imageZoom: values.zoom });
    setCropState(null);
    setMessage(`Đã căn khung ảnh mốc ${cropState.index + 1}. Bấm “Lưu nội dung” để áp dụng.`);
  }

  function addMilestone() {
    setForm((current) => ({ ...current, story: { ...current.story, milestones: [...current.story.milestones, { date: "Mốc mới", title: "Tiêu đề mới", description: "Nội dung câu chuyện...", imageSrc: null, ...defaultCrop }] } }));
  }
  function removeMilestone(index: number) { setForm((current) => ({ ...current, story: { ...current.story, milestones: current.story.milestones.filter((_, i) => i !== index) } })); }

  const field = (label: string, value: string, onChange: (value: string) => void, options?: { multiline?: boolean; type?: string; maxLength?: number }) => <label className={styles.field}><span>{label}</span>{options?.multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={options.maxLength ?? 600} required /> : <input type={options?.type ?? "text"} value={value} onChange={(event) => onChange(event.target.value)} maxLength={options?.maxLength ?? 220} required />}</label>;

  const cropMilestone = cropState ? form.story.milestones[cropState.index] : undefined;

  return <main className={styles.shell}>
    <header className={styles.header}><div><p>Editor nội dung</p><h1>Chỉnh từng section của thiệp</h1><span>Thay đổi ở đây được lưu vào SQLite và áp dụng cho cả thiệp chung lẫn link khách mời.</span></div><a href="/" target="_blank" rel="noreferrer">Mở thiệp ↗</a></header>
    <div className={styles.tabs} role="tablist" aria-label="Các section thiệp">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} className={active === tab.id ? styles.active : ""} onClick={() => setActive(tab.id)}>{tab.label}</button>)}</div>

    <form className={styles.panel} onSubmit={save}>
      {active === "couple" ? <div className={styles.grid}>
        {field("Tên đầy đủ chú rể", form.couple.groom, (value) => setForm((c) => ({ ...c, couple: { ...c.couple, groom: value } })))}
        {field("Tên đầy đủ cô dâu", form.couple.bride, (value) => setForm((c) => ({ ...c, couple: { ...c.couple, bride: value } })))}
        {field("Tên ngắn chú rể", form.couple.shortGroomName, (value) => setForm((c) => ({ ...c, couple: { ...c.couple, shortGroomName: value } })), { maxLength: 60 })}
        {field("Tên ngắn cô dâu", form.couple.shortBrideName, (value) => setForm((c) => ({ ...c, couple: { ...c.couple, shortBrideName: value } })), { maxLength: 60 })}
        {field("Eyebrow section", form.coupleSection.eyebrow, (value) => setForm((c) => ({ ...c, coupleSection: { ...c.coupleSection, eyebrow: value } })))}
        {field("Tiêu đề section", form.coupleSection.title, (value) => setForm((c) => ({ ...c, coupleSection: { ...c.coupleSection, title: value } })))}
        {field("Nhãn chú rể", form.coupleSection.groomRole, (value) => setForm((c) => ({ ...c, coupleSection: { ...c.coupleSection, groomRole: value } })))}
        {field("Nhãn cô dâu", form.coupleSection.brideRole, (value) => setForm((c) => ({ ...c, coupleSection: { ...c.coupleSection, brideRole: value } })))}
        <div className={styles.wide}>{field("Mô tả chú rể", form.couple.groomBio, (value) => setForm((c) => ({ ...c, couple: { ...c.couple, groomBio: value } })), { multiline: true })}</div>
        <div className={styles.wide}>{field("Mô tả cô dâu", form.couple.brideBio, (value) => setForm((c) => ({ ...c, couple: { ...c.couple, brideBio: value } })), { multiline: true })}</div>
      </div> : null}
      {active === "cover" ? <div className={styles.grid}>{field("Eyebrow", form.cover.eyebrow, (value) => setForm((c) => ({ ...c, cover: { ...c.cover, eyebrow: value } })))}{field("Nút khám phá", form.cover.scrollCue, (value) => setForm((c) => ({ ...c, cover: { ...c.cover, scrollCue: value } })))}<div className={styles.wide}>{field("Lời mở đầu", form.cover.message, (value) => setForm((c) => ({ ...c, cover: { ...c.cover, message: value } })), { multiline: true })}</div></div> : null}
      {active === "countdown" ? <div className={styles.grid}>{field("Eyebrow", form.countdown.eyebrow, (value) => setForm((c) => ({ ...c, countdown: { ...c.countdown, eyebrow: value } })))}{field("Tiêu đề", form.countdown.title, (value) => setForm((c) => ({ ...c, countdown: { ...c.countdown, title: value } })))}</div> : null}

      {active === "story" ? <div>
        <div className={styles.grid}>{field("Eyebrow", form.story.eyebrow, (value) => setForm((c) => ({ ...c, story: { ...c.story, eyebrow: value } })))}{field("Tiêu đề", form.story.title, (value) => setForm((c) => ({ ...c, story: { ...c.story, title: value } })))}</div>
        <div className={styles.storyList}>{form.story.milestones.map((item, index) => <article className={styles.storyItem} key={index}>
          <div className={styles.storyHead}><strong>Mốc {index + 1}</strong><button type="button" onClick={() => removeMilestone(index)} disabled={form.story.milestones.length <= 1 || uploadingMilestone === index}>Xóa</button></div>
          <div className={styles.storyImageEditor}><div className={styles.storyImagePreview}>{item.imageSrc ? <Image src={item.imageSrc} alt={`Ảnh ${item.title}`} width={720} height={450} unoptimized style={{ objectFit: "cover", objectPosition: `${item.imageFocusX}% ${item.imageFocusY}%`, transform: `scale(${item.imageZoom})`, transformOrigin: `${item.imageFocusX}% ${item.imageFocusY}%` }} /> : <span>Chưa có ảnh cho mốc này</span>}</div>
            <div className={styles.storyImageActions}>
              <label className={styles.secondary}>{uploadingMilestone === index ? "Đang tải…" : item.imageSrc ? "Thay ảnh" : "Tải ảnh"}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={busy || uploadingMilestone !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMilestoneImage(index, file); event.currentTarget.value = ""; }} /></label>
              {item.imageSrc ? <button className={styles.secondary} type="button" disabled={busy || uploadingMilestone !== null} onClick={(event) => setCropState({ index, restoreTarget: event.currentTarget })}>Chỉnh khung ảnh</button> : null}
              {item.imageSrc ? <button className={styles.secondary} type="button" disabled={busy || uploadingMilestone !== null} onClick={() => updateMilestone(index, { imageSrc: null, ...defaultCrop })}>Gỡ ảnh</button> : null}
              <small>JPG, PNG, WebP, AVIF hoặc GIF · tối đa 12 MB.</small>
            </div></div>
          {field("Thời gian", item.date, (value) => updateMilestone(index, { date: value }))}{field("Tiêu đề", item.title, (value) => updateMilestone(index, { title: value }))}{field("Nội dung", item.description, (value) => updateMilestone(index, { description: value }), { multiline: true })}
        </article>)}</div>
        <button className={styles.secondary} type="button" onClick={addMilestone} disabled={form.story.milestones.length >= 12 || uploadingMilestone !== null}>+ Thêm mốc</button>
      </div> : null}

      {active === "event" ? <div className={styles.grid}>
        {field("Eyebrow", form.event.eyebrow, (value) => setForm((c) => ({ ...c, event: { ...c.event, eyebrow: value } })))}{field("Tiêu đề", form.event.title, (value) => setForm((c) => ({ ...c, event: { ...c.event, title: value } })))}
        {field("Ngày giờ ISO (dùng countdown)", form.event.dateTime, (value) => setForm((c) => ({ ...c, event: { ...c.event, dateTime: value } })))}{field("Hạn RSVP ISO", form.event.rsvpDeadline, (value) => setForm((c) => ({ ...c, event: { ...c.event, rsvpDeadline: value } })))}
        {field("Nhãn ngày hiển thị", form.event.dateLabel, (value) => setForm((c) => ({ ...c, event: { ...c.event, dateLabel: value } })))}{field("Giờ hiển thị", form.event.timeLabel, (value) => setForm((c) => ({ ...c, event: { ...c.event, timeLabel: value } })))}
        {field("Nhãn 'Thời gian'", form.event.timeHeading, (value) => setForm((c) => ({ ...c, event: { ...c.event, timeHeading: value } })))}{field("Nhãn 'Địa điểm'", form.event.venueHeading, (value) => setForm((c) => ({ ...c, event: { ...c.event, venueHeading: value } })))}{field("Nhãn chỉ đường", form.event.directionsLabel, (value) => setForm((c) => ({ ...c, event: { ...c.event, directionsLabel: value } })))}
        {field("Tên địa điểm", form.event.venue, (value) => setForm((c) => ({ ...c, event: { ...c.event, venue: value } })))}{field("Địa chỉ", form.event.address, (value) => setForm((c) => ({ ...c, event: { ...c.event, address: value } })))}<div className={styles.wide}>{field("Google Maps URL", form.event.mapsUrl, (value) => setForm((c) => ({ ...c, event: { ...c.event, mapsUrl: value } })), { type: "url", maxLength: 2048 })}</div>
      </div> : null}
      {active === "gallery" ? <div className={styles.grid}>{field("Eyebrow", form.gallery.eyebrow, (value) => setForm((c) => ({ ...c, gallery: { ...c.gallery, eyebrow: value } })))}{field("Tiêu đề", form.gallery.title, (value) => setForm((c) => ({ ...c, gallery: { ...c.gallery, title: value } })))}</div> : null}
      {active === "personal" ? <div className={styles.grid}>
        {field("Eyebrow thiệp riêng", form.personal.eyebrow, (value) => setForm((c) => ({ ...c, personal: { ...c.personal, eyebrow: value } })))}{field("Eyebrow RSVP", form.rsvp.eyebrow, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, eyebrow: value } })))}<div className={styles.wide}>{field("Lời mời riêng", form.personal.message, (value) => setForm((c) => ({ ...c, personal: { ...c.personal, message: value } })), { multiline: true })}</div>
        {field("Tiêu đề RSVP", form.rsvp.title, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, title: value } })))}{field("Lời nhắc trước hạn", form.rsvp.intro, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, intro: value } })))}{field("Lời chào trước tên khách", form.rsvp.greetingPrefix, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, greetingPrefix: value } })))}
        {field("Câu hỏi tham dự", form.rsvp.attendanceQuestion, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, attendanceQuestion: value } })))}{field("Lựa chọn tham dự", form.rsvp.attendingLabel, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, attendingLabel: value } })))}{field("Lựa chọn không tham dự", form.rsvp.declinedLabel, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, declinedLabel: value } })))}
        {field("Nhãn số người", form.rsvp.guestCountLabel, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, guestCountLabel: value } })))}{field("Hậu tố số người", form.rsvp.guestCountSuffix, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, guestCountSuffix: value } })), { maxLength: 40 })}{field("Nhãn lời nhắn", form.rsvp.messageLabel, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, messageLabel: value } })))}
        {field("Placeholder lời nhắn", form.rsvp.messagePlaceholder, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, messagePlaceholder: value } })))}{field("Nút gửi", form.rsvp.submitLabel, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, submitLabel: value } })))}{field("Nhãn đang gửi", form.rsvp.submittingLabel, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, submittingLabel: value } })))}
        {field("Thông báo hết hạn", form.rsvp.closedMessage, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, closedMessage: value } })))}{field("Thông báo thành công mặc định", form.rsvp.successMessage, (value) => setForm((c) => ({ ...c, rsvp: { ...c.rsvp, successMessage: value } })))}
      </div> : null}
      {active === "footer" ? <div className={styles.grid}>{field("Tên footer", form.footer.title, (value) => setForm((c) => ({ ...c, footer: { ...c.footer, title: value } })))}{field("Lời footer", form.footer.message, (value) => setForm((c) => ({ ...c, footer: { ...c.footer, message: value } })))}</div> : null}
      <div className={styles.actions}><button type="submit" disabled={busy || uploadingMilestone !== null}>{busy ? "Đang lưu…" : "Lưu nội dung"}</button><span aria-live="polite">{message}</span></div>
    </form>

    {cropState && cropMilestone?.imageSrc ? <MediaCropEditor
      asset={{ slot: "story", src: cropMilestone.imageSrc, alt: `Ảnh ${cropMilestone.title}`, sortOrder: cropState.index, active: true, focusX: cropMilestone.imageFocusX, focusY: cropMilestone.imageFocusY, zoom: cropMilestone.imageZoom }}
      restoreFocusTarget={cropState.restoreTarget}
      onClose={() => setCropState(null)}
      onSave={saveMilestoneCrop}
    /> : null}
  </main>;
}
