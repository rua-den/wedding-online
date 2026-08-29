"use client";

import { useMemo, useState } from "react";

import {
  invitationThemes,
  type InvitationThemeId,
} from "@/config/invitation-themes";
import type { AppearanceSettings } from "@/lib/appearance-store";
import { InvitationPreviewDialog } from "./invitation-preview-dialog";
import styles from "./admin-appearance-editor.module.css";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withPreviewTheme(previewUrl: string, themeId: InvitationThemeId): string {
  const separator = previewUrl.includes("?") ? "&" : "?";
  return `${previewUrl}${separator}previewTheme=${encodeURIComponent(themeId)}`;
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const dirty = pendingThemeId !== persistedThemeId;
  const pendingPreviewUrl = useMemo(() => withPreviewTheme(previewUrl, pendingThemeId), [pendingThemeId, previewUrl]);

  function selectTheme(themeId: InvitationThemeId) {
    setPendingThemeId(themeId);
    setMessage("");
  }

  function previewTheme(themeId: InvitationThemeId) {
    setPendingThemeId(themeId);
    setPreviewRefreshKey((current) => current + 1);
    setPreviewOpen(true);
    setMessage("");
  }

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await request("/api/admin/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: pendingThemeId }),
      });
      const body = await response.json().catch(() => null) as { appearance?: AppearanceSettings; message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Không thể lưu giao diện thiệp.");
        return;
      }
      const saved = body?.appearance?.themeId ?? pendingThemeId;
      setPersistedThemeId(saved);
      setPendingThemeId(saved);
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
        <span>Theme áp dụng cho thiệp chung và toàn bộ link khách mời. Chọn thử trước, chỉ lưu khi mày bấm “Lưu giao diện”.</span>
      </div>
      <a href={withPreviewTheme(previewUrl, pendingThemeId)} target="_blank" rel="noreferrer">Mở preview ↗</a>
    </header>

    {initialAppearance.invalidStoredThemeId ? <p className={styles.warning} role="alert">
      Theme đã lưu trước đây ({initialAppearance.invalidStoredThemeId}) không còn tồn tại. Hệ thống đang dùng Ivory Gold an toàn; hãy chọn và lưu lại một theme.
    </p> : null}

    <section className={styles.grid} aria-label="Theme thiệp">
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
              <h2>{theme.name}</h2>
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
    </section>

    <div className={styles.actions}>
      <span className={styles.dirty}>{dirty ? "Chưa lưu thay đổi" : "Đã đồng bộ"}</span>
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
