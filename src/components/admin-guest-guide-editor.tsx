"use client";
import { useState } from "react";
import type { GuestGuide } from "@/lib/guest-guide-store";

export function AdminGuestGuideEditor({ initial }: { initial: GuestGuide }) {
  const [guide, setGuide] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/guest-guide", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(guide) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể lưu.");
      setGuide(data.guide); setMessage("Đã lưu Agenda & sơ đồ.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu."); }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    setUploading(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/admin/content/image", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải ảnh.");
      setGuide((current) => ({ ...current, layoutImageSrc: data.src }));
      setMessage("Ảnh đã tải lên. Bấm Lưu để áp dụng vào thiệp.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải ảnh."); }
    finally { setUploading(false); }
  }
  return <main className="admin-shell">
    <header className="admin-header"><div><p className="eyebrow">Wedding day</p><h1>Agenda & sơ đồ khu tiệc</h1><p>Chỉ những mốc được bật mới xuất hiện trên thiệp. Thay đổi không ảnh hưởng RSVP hay dữ liệu khách.</p></div></header>
    <section className="admin-panel"><h2>Lịch trình</h2>
      <label><input type="checkbox" checked={guide.agendaEnabled} onChange={(e) => setGuide({ ...guide, agendaEnabled: e.target.checked })} /> Hiện Agenda trên thiệp</label>
      <div className="admin-form-grid">
        <label>Tiêu đề<input value={guide.agendaTitle} onChange={(e) => setGuide({ ...guide, agendaTitle: e.target.value })} /></label>
        <label>Mô tả<input value={guide.agendaSubtitle} onChange={(e) => setGuide({ ...guide, agendaSubtitle: e.target.value })} /></label>
      </div>
      {guide.agenda.map((item, index) => (
        <div className="admin-form-grid" key={index} style={{ borderTop: "1px solid #ddd", paddingTop: 16, marginTop: 16 }}>
          <label><input type="checkbox" checked={item.active} onChange={(e) => setGuide((g) => ({ ...g, agenda: g.agenda.map((x, i) => i === index ? { ...x, active: e.target.checked } : x) }))} /> Hiển thị mốc</label>
          {(["time", "title", "description"] as const).map((field) =>
            <label key={field}>{field === "time" ? "Giờ" : field === "title" ? "Tên mốc" : "Mô tả"}
              <input value={item[field]} onChange={(e) => setGuide((g) => ({ ...g, agenda: g.agenda.map((x, i) => i === index ? { ...x, [field]: e.target.value } : x) }))} />
            </label>)}
          <div className="admin-actions">
            <button type="button" className="admin-text-button" disabled={index === 0} onClick={() => setGuide((g) => { const a = [...g.agenda]; [a[index-1],a[index]] = [a[index],a[index-1]]; return { ...g, agenda:a }; })}>↑</button>
            <button type="button" className="admin-text-button" disabled={index === guide.agenda.length-1} onClick={() => setGuide((g) => { const a = [...g.agenda]; [a[index],a[index+1]] = [a[index+1],a[index]]; return { ...g, agenda:a }; })}>↓</button>
            <button type="button" className="admin-text-button" onClick={() => setGuide((g) => ({ ...g, agenda:g.agenda.filter((_,i) => i !== index) }))}>Xóa</button>
          </div>
        </div>
      ))}
      <button type="button" className="admin-secondary-button" disabled={guide.agenda.length >= 20} onClick={() => setGuide((g) => ({ ...g, agenda:[...g.agenda,{ time:"",title:"",description:"",active:true }] }))}>+ Thêm mốc</button>
    </section>
    <section className="admin-panel"><h2>Sơ đồ khu tiệc</h2>
      <label><input type="checkbox" checked={guide.layoutEnabled} onChange={(e) => setGuide({ ...guide, layoutEnabled: e.target.checked })} /> Hiện sơ đồ trên thiệp</label>
      <div className="admin-form-grid">
        <label>Tiêu đề<input value={guide.layoutTitle} onChange={(e) => setGuide({ ...guide, layoutTitle: e.target.value })} /></label>
        <label>Mô tả<input value={guide.layoutSubtitle} onChange={(e) => setGuide({ ...guide, layoutSubtitle: e.target.value })} /></label>
        <label>Văn bản thay thế ảnh<input value={guide.layoutAlt} onChange={(e) => setGuide({ ...guide, layoutAlt: e.target.value })} /></label>
        <label>Upload ảnh sơ đồ<input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label>
      </div>
      {guide.layoutImageSrc ? <div><a href={guide.layoutImageSrc} target="_blank" rel="noreferrer">Xem ảnh hiện tại</a> <button type="button" className="admin-text-button" onClick={() => setGuide({ ...guide, layoutImageSrc:"" })}>Gỡ ảnh khỏi section</button></div> : <p>Chưa upload sơ đồ. Section sơ đồ sẽ ẩn cho đến khi có ảnh.</p>}
    </section>
    <button type="button" className="admin-primary-button" onClick={() => void save()} disabled={busy || uploading}>{busy ? "Đang lưu..." : "Lưu Agenda & sơ đồ"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </main>;
}
