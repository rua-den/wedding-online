"use client";

import { useEffect, useRef, useState } from "react";

type PreviewMode = "mobile" | "desktop";

type InvitationPreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  refreshKey: number;
  previewUrl?: string;
  suspended?: boolean;
};

const previewSizes: Record<PreviewMode, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};

function previewSource(previewUrl: string | undefined, refreshKey: number) {
  const base = previewUrl || "/";
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}preview=${encodeURIComponent(String(refreshKey))}`;
}

function InvitationPreviewDialogContent({ onClose, refreshKey, previewUrl, suspended = false }: Omit<InvitationPreviewDialogProps, "open">) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const suspendedRef = useRef(suspended);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const capturedFocusRef = useRef(false);
  const [mode, setMode] = useState<PreviewMode>("mobile");
  const source = previewSource(previewUrl, refreshKey);
  const size = previewSizes[mode];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    suspendedRef.current = suspended;
  }, [suspended]);

  useEffect(() => {
    if (!capturedFocusRef.current) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      capturedFocusRef.current = true;
    }
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (suspendedRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, []);

  if (suspended) return null;

  return (
    <div className="invitation-preview-backdrop" role="presentation">
      <div className="invitation-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="invitation-preview-title" ref={dialogRef} tabIndex={-1}>
        <div className="invitation-preview-heading">
          <div>
            <p className="eyebrow">Xem trước trực tiếp</p>
            <h2 id="invitation-preview-title">Xem trước toàn bộ thiệp</h2>
          </div>
          <button className="media-crop-editor-close" type="button" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className="invitation-preview-toolbar">
          <div className="invitation-preview-modes" role="group" aria-label="Kích thước xem trước">
            <button type="button" className="admin-secondary-button" aria-pressed={mode === "mobile"} onClick={() => setMode("mobile")}>Mobile</button>
            <button type="button" className="admin-secondary-button" aria-pressed={mode === "desktop"} onClick={() => setMode("desktop")}>Desktop</button>
          </div>
          <a className="admin-secondary-button" href={source} target="_blank" rel="noreferrer">Mở tab mới</a>
        </div>

        <div
          className={`invitation-preview-device is-${mode}`}
          data-testid="invitation-preview-device"
          style={{ width: `${size.width}px`, height: `${size.height}px` }}
        >
          <iframe
            key={`${source}-${mode}`}
            title="Xem trước toàn bộ thiệp"
            src={source}
            sandbox="allow-same-origin allow-scripts allow-forms"
            allow="autoplay"
            width={size.width}
            height={size.height}
            style={{ width: `${size.width}px`, height: `${size.height}px` }}
          />
        </div>
      </div>
    </div>
  );
}

export function InvitationPreviewDialog({ open, onClose, refreshKey, previewUrl, suspended }: InvitationPreviewDialogProps) {
  if (!open) return null;
  return <InvitationPreviewDialogContent onClose={onClose} refreshKey={refreshKey} previewUrl={previewUrl} suspended={suspended} />;
}
