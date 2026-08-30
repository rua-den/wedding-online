"use client";

import { useRef, useState } from "react";

import type { MusicSettings } from "@/lib/music-store";
import styles from "./admin-appearance-editor.module.css";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function AdminMusicEditor({ initialMusic, fetcher }: { initialMusic: MusicSettings; fetcher?: Fetcher }) {
  const request = fetcher ?? fetch;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [music, setMusic] = useState(initialMusic);
  const [draft, setDraft] = useState(initialMusic);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dirty = draft.enabled !== music.enabled || draft.loop !== music.loop || draft.title !== music.title;

  async function upload(file: File) {
    setBusy(true); setMessage("");
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("title", file.name.replace(/\.[^.]+$/, ""));
      const response = await request("/api/admin/music", { method: "POST", body: data });
      const body = await response.json().catch(() => null) as { music?: MusicSettings; message?: string } | null;
      if (!response.ok || !body?.music) { setMessage(body?.message ?? "Không thể tải nhạc lên."); return; }
      setMusic(body.music); setDraft(body.music); setMessage("Đã tải và bật nhạc nền.");
    } catch { setMessage("Không thể kết nối để tải nhạc."); } finally { setBusy(false); }
  }

  async function save() {
    if (!dirty || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await request("/api/admin/music", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: draft.enabled, title: draft.title, loop: draft.loop }) });
      const body = await response.json().catch(() => null) as { music?: MusicSettings; message?: string } | null;
      if (!response.ok || !body?.music) { setMessage(body?.message ?? "Không thể lưu cài đặt nhạc."); return; }
      setMusic(body.music); setDraft(body.music); setMessage("Đã lưu cài đặt nhạc.");
    } catch { setMessage("Không thể kết nối để lưu nhạc."); } finally { setBusy(false); }
  }

  async function remove() {
    if (!music.src || busy || !window.confirm("Xóa bài nhạc nền hiện tại? Hành động này sẽ xóa tệp đã tải lên.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await request("/api/admin/music", { method: "DELETE" });
      const body = await response.json().catch(() => null) as { music?: MusicSettings; message?: string } | null;
      if (!response.ok || !body?.music) { setMessage(body?.message ?? "Không thể xóa nhạc."); return; }
      setMusic(body.music); setDraft(body.music); setMessage("Đã xóa nhạc nền.");
    } catch { setMessage("Không thể kết nối để xóa nhạc."); } finally { setBusy(false); }
  }

  function togglePreview() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => undefined); else audio.pause();
  }

  return <section className={`${styles.shell} ${styles.musicShell}`} aria-labelledby="music-title">
    <div className={styles.sectionHeading}>
      <div><p>03</p><h2 id="music-title">Nhạc nền</h2></div>
      <span>Một bài MP3 dùng chung cho thiệp chung và link khách. Trình duyệt có thể yêu cầu khách bấm phát nhạc lần đầu.</span>
    </div>
    <div className={styles.musicPanel}>
      <div className={styles.musicState}>
        <strong>{music.src ? (music.title || "Nhạc cưới") : "Chưa có nhạc"}</strong>
        <span>{music.src ? "MP3 đã lưu trên server" : "Tải một file MP3 tối đa 30 MB."}</span>
      </div>
      {music.src ? <audio ref={audioRef} src={music.src} loop={draft.loop} preload="metadata" /> : null}
      <div className={styles.musicRow}>
        <label className={styles.musicField}><span>Tên bài nhạc</span><input value={draft.title} maxLength={160} disabled={!music.src || busy} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
        <label className={styles.musicToggle}><input type="checkbox" checked={draft.enabled} disabled={!music.src || busy} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /> Bật nhạc trên thiệp</label>
        <label className={styles.musicToggle}><input type="checkbox" checked={draft.loop} disabled={!music.src || busy} onChange={(event) => setDraft((current) => ({ ...current, loop: event.target.checked }))} /> Lặp lại bài nhạc</label>
      </div>
      <div className={styles.musicButtons}>
        <label className={styles.preview}>{busy ? "Đang xử lý…" : music.src ? "Thay MP3" : "Tải MP3"}<input hidden type="file" accept="audio/mpeg,.mp3" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label>
        {music.src ? <button className={styles.preview} type="button" disabled={busy} onClick={togglePreview}>Nghe thử</button> : null}
        {music.src ? <button className={styles.preview} type="button" disabled={busy} onClick={() => void remove()}>Xóa nhạc</button> : null}
        <button className={styles.save} type="button" disabled={!dirty || busy} onClick={() => void save()}>Lưu cài đặt nhạc</button>
      </div>
      <span className={styles.status} role="status" aria-live="polite">{message}</span>
    </div>
  </section>;
}
