"use client";

import { useMemo, useState } from "react";

import {
  invitationFonts,
  type InvitationFontId,
} from "@/config/invitation-fonts";
import {
  invitationThemes,
  type InvitationThemeId,
} from "@/config/invitation-themes";
import type { AppearanceSettings } from "@/lib/appearance-store";
import { InvitationPreviewDialog } from "./invitation-preview-dialog";
import styles from "./admin-appearance-editor.module.css";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withPreviewAppearance(
  previewUrl: string,
  themeId: InvitationThemeId,
  fontId: InvitationFontId,
): string {
  const separator = previewUrl.includes("?") ? "&" : "?";
  return `${previewUrl}${separator}previewTheme=${encodeURIComponent(themeId)}&previewFont=${encodeURIComponent(fontId)}`;
}

export function AdminAppearanceEditor({
  initialAppearance,
  previewUrl = "/",
  fetcher,
}: {
  initialAppearance: AppearanceSettings;
  previewUrl?: string;
  fetcher?: Fetcher;
}) {
  const request = fetcher ?? fetch;
  const [persistedThemeId, setPersistedThemeId] = useState(initialAppearance.themeId);
  const [pendingThemeId, setPendingThemeId] = useState(initialAppearance.themeId);
  const [persistedFontId, setPersistedFontId] = useState(initialAppearance.fontId);
  const [pendingFontId, setPendingFontId] = useState(initialAppearance.fontId);
  const [invalidStoredThemeId, setInvalidStoredThemeId] = useState(initialAppearance.invalidStoredThemeId);
  const [invalidStoredFontId, setInvalidStoredFontId] = useState(initialAppearance.invalidStoredFontId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const dirty = Boolean(invalidStoredThemeId || invalidStoredFontId)
    || pendingThemeId !== persistedThemeId
    || pendingFontId !== persistedFontId;
  const pendingPreviewUrl = useMemo(
    () => withPreviewAppearance(previewUrl, pendingThemeId, pendingFontId),
    [pendingFontId, pendingThemeId, previewUrl],
  );

  function selectTheme(themeId: InvitationThemeId) {
    setPendingThemeId(themeId);
    setMessage("");
  }

  function selectFont(fontId: InvitationFontId) {
    setPendingFontId(fontId);
    setMessage("");
  }

  function openPreview() {
    setPreviewRefreshKey((current) => current + 1);
    setPreviewOpen(true);
    setMessage("");
  }

  function previewTheme(themeId: InvitationThemeId) {
    setPendingThemeId(themeId);
    openPreview();
  }

  function previewFont(fontId: InvitationFontId) {
    setPendingFontId(fontId);
    openPreview();
  }

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await request("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: pendingThemeId, fontId: pendingFontId }),
      });
      const body = await response.json().catch(() => null) as { appearance?: AppearanceSettings; message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Không thể lưu giao diện thiệp.");
        return;
      }
      const savedTheme = body?.appearance?.themeId ?? pendingThemeId;
      const savedFont = body?.appearance?.fontId ?? pendingFontId;
      setPersistedThemeId(savedTheme);
      setPendingThemeId(savedTheme);
      setPersistedFontId(savedFont);
      setPendingFontId(savedFont);
      setInvalidStoredThemeId(undefined);
      setInvalidStoredFontId(undefined);
      setMessage("Đã lưu giao diện thiệp.");
      setPreviewRefreshKey((current) => current + 1);
    } catch {
      setMessage("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return <main className={styles.shell}>
    <header className={styles.header}>
      <div>
        <p>Appearance</p>
        <h1>Giao diện thiệp</h1>
        <span>Theme và font áp dụng cho thiệp chung lẫn link khách mời. Chọn thử trước; thay đổi chỉ được áp dụng sau khi bấm “Lưu giao diện”.</span>
      </div>
      <a href={pendingPreviewUrl} target="_blank" rel="noreferrer">Mở preview ↗</a>
    </header>

    {invalidStoredThemeId || invalidStoredFontId ? <p className={styles.warning} role="alert">
      Setting cũ không còn hợp lệ
      {invalidStoredThemeId ? ` · theme: ${invalidStoredThemeId}` : ""}
      {invalidStoredFontId ? ` · font: ${invalidStoredFontId}` : ""}.
      Hệ thống đang dùng fallback an toàn; hãy lưu lại giao diện.
    </p> : null}

    <section className={styles.section} aria-labelledby="theme-picker-title">
      <div className={styles.sectionHeading}>
        <div><p>01</p><h2 id="theme-picker-title">Màu sắc</h2></div>
        <span>Chọn một palette hoàn chỉnh để giữ độ tương phản và tính đồng bộ.</span>
      </div>
      <div className={styles.grid} aria-label="Theme thiệp">
        {invitationThemes.map((theme) => {
          const selected = pendingThemeId === theme.id;
          return <article className={`${styles.card} ${selected ? styles.cardSelected : ""}`} key={theme.id}>
            <label>
              <input
                className={styles.radio}
                type="radio"
                name="invitation-theme"
                value={theme.id}
                checked={selected}
                onChange={() => selectTheme(theme.id)}
              />
              <span className={styles.cardTop}>
                <h3>{theme.name}</h3>
                <span className={styles.state}>{selected ? "Đang chọn" : "Chọn"}</span>
              </span>
              <span className={styles.description}>{theme.description}</span>
              <span className={styles.swatches} aria-hidden="true">
                {theme.swatches.map((swatch) => <i className={styles.swatch} key={swatch} style={{ background: swatch }} />)}
              </span>
            </label>
            <button className={styles.preview} type="button" onClick={() => previewTheme(theme.id)}>Xem trước {theme.name}</button>
          </article>;
        })}
      </div>
    </section>

    <section className={styles.section} aria-labelledby="font-picker-title">
      <div className={styles.sectionHeading}>
        <div><p>02</p><h2 id="font-picker-title">Font chữ</h2></div>
        <span>Các font web bên dưới đều có bộ ký tự tiếng Việt; chữ chức năng nhỏ vẫn dùng sans-serif để dễ đọc.</span>
      </div>
      <div className={styles.fontGrid} aria-label="Font thiệp">
        {invitationFonts.map((font) => {
          const selected = pendingFontId === font.id;
          return <article className={`${styles.fontCard} ${selected ? styles.cardSelected : ""}`} key={font.id}>
            <label>
              <input
                className={styles.radio}
                type="radio"
                name="invitation-font"
                value={font.id}
                checked={selected}
                onChange={() => selectFont(font.id)}
              />
              <span className={styles.cardTop}>
                <h3>{font.name}</h3>
                <span className={styles.state}>{selected ? "Đang chọn" : "Chọn"}</span>
              </span>
              <span className={styles.fontSample} style={{ fontFamily: font.cssFamily }}>{font.previewText}</span>
              <span className={styles.fontVietnamese} style={{ fontFamily: font.cssFamily }}>Huy &amp; Nhi · Mãi mãi bên nhau · Ước hẹn ngày cưới</span>
              <span className={styles.description}>{font.description}</span>
            </label>
            <button className={styles.preview} type="button" onClick={() => previewFont(font.id)}>Xem trước {font.name}</button>
          </article>;
        })}
      </div>
    </section>

    <div className={styles.actions}>
      <span className={styles.dirty}>{dirty ? "Chưa lưu thay đổi" : "Đã đồng bộ"}</span>
      <button className={styles.previewAll} type="button" onClick={openPreview}>Preview lựa chọn</button>
      <span className={styles.status} role="status" aria-live="polite">{message}</span>
      <button className={styles.save} type="button" disabled={!dirty || busy} onClick={() => void save()}>
        {busy ? "Đang lưu…" : "Lưu giao diện"}
      </button>
    </div>

    <InvitationPreviewDialog
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      refreshKey={previewRefreshKey}
      previewUrl={pendingPreviewUrl}
    />
  </main>;
}
