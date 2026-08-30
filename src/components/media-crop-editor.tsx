"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { MediaSlot, PublicMediaAsset } from "@/lib/media-store";
import { MediaFrame } from "./media-frame";

export type MediaCropValues = {
  focusX: number;
  focusY: number;
  zoom: number;
};

type MediaCropEditorProps = {
  asset: PublicMediaAsset;
  onSave: (values: MediaCropValues) => void | Promise<void>;
  onClose: () => void;
  restoreFocusTarget?: HTMLElement | null;
};

type CropDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  values: MediaCropValues;
};

type HeroViewport = "mobile" | "desktop";

function clamp(value: number, minimum: number, maximum: number, fallback = minimum) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function cropValues(asset: Pick<PublicMediaAsset, "focusX" | "focusY" | "zoom">): MediaCropValues {
  return {
    focusX: clamp(asset.focusX, 0, 100, 50),
    focusY: clamp(asset.focusY, 0, 100, 50),
    zoom: clamp(asset.zoom, 1, 3, 1),
  };
}

function publicSlotLabel(slot: MediaSlot) {
  switch (slot) {
    case "hero": return "Trang bìa";
    case "groom":
    case "bride": return "Cô dâu & chú rể";
    case "story": return "Hành trình yêu thương";
    case "venue": return "Lễ thành hôn";
    case "gallery": return "Những khoảnh khắc";
  }
}

function previewClass(slot: MediaSlot) {
  switch (slot) {
    case "hero": return "media-frame-slot-hero";
    case "groom":
    case "bride": return "media-frame-slot-portrait";
    case "story": return "media-frame-slot-story";
    case "venue": return "media-frame-slot-venue";
    case "gallery": return "media-frame-slot-gallery";
  }
}

function rangeValue(event: React.ChangeEvent<HTMLInputElement>) {
  return Number(event.currentTarget.value);
}

export function MediaCropEditor({ asset, onSave, onClose, restoreFocusTarget }: MediaCropEditorProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<CropDrag | null>(null);
  const onCloseRef = useRef(onClose);
  const requestedRestoreRef = useRef<HTMLElement | null>(restoreFocusTarget ?? null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const capturedFocusRef = useRef(false);
  const [values, setValues] = useState<MediaCropValues>(() => cropValues(asset));
  const [heroViewport, setHeroViewport] = useState<HeroViewport>("mobile");

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!capturedFocusRef.current) {
      restoreFocusRef.current = requestedRestoreRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      capturedFocusRef.current = true;
    }
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled])"));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, []);

  function updateValue(key: keyof MediaCropValues, value: number) {
    setValues((current) => ({ ...current, [key]: key === "zoom" ? clamp(value, 1, 3) : clamp(value, 0, 100) }));
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, width: rect.width || 390, height: rect.height || 300, values };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || (event.pointerId !== 0 && event.pointerId !== drag.pointerId)) return;
    updateValue("focusX", drag.values.focusX + ((event.clientX - drag.startX) / drag.width) * 100);
    updateValue("focusY", drag.values.focusY + ((event.clientY - drag.startY) / drag.height) * 100);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current && (event.pointerId === 0 || event.pointerId === dragRef.current.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      dragRef.current = null;
    }
  }

  const isHero = asset.slot === "hero";
  const frameClassName = isHero ? `media-crop-editor-frame media-crop-editor-frame-hero-${heroViewport}` : `media-crop-editor-frame media-crop-editor-frame-${asset.slot}`;
  const sharedFrameClassName = `${previewClass(asset.slot)} ${frameClassName}`;

  return (
    <div className="media-crop-editor-backdrop" role="presentation">
      <div ref={dialogRef} className="media-crop-editor" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="media-crop-editor-heading">
          <div><p className="eyebrow">Căn khung ảnh</p><h2 id={titleId}>{asset.alt || publicSlotLabel(asset.slot)}</h2><p className="media-crop-editor-section">Hiển thị tại: {publicSlotLabel(asset.slot)}</p></div>
          <button className="media-crop-editor-close" type="button" onClick={onClose} aria-label="Đóng">×</button>
        </div>

        {isHero ? <div className="media-crop-editor-modes" role="group" aria-label="Kích thước khung trang bìa">
          <button type="button" className="admin-secondary-button" aria-pressed={heroViewport === "mobile"} onClick={() => setHeroViewport("mobile")}>Mobile</button>
          <button type="button" className="admin-secondary-button" aria-pressed={heroViewport === "desktop"} onClick={() => setHeroViewport("desktop")}>Desktop</button>
        </div> : null}

        <div className="media-crop-editor-preview" data-testid="media-crop-preview" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { dragRef.current = null; }}>
          <div className={`media-crop-editor-preview-frame ${isHero ? `is-${heroViewport}` : "is-single"}`} data-testid="media-crop-preview-frame">
            <MediaFrame asset={{ ...asset, ...values }} className={sharedFrameClassName} alt={asset.alt || publicSlotLabel(asset.slot)} />
            {isHero ? <div className="media-crop-editor-hero-copy" aria-hidden="true"><p>Huy &amp; Nhi</p><strong>Ngày mình chung đôi</strong><span>20 · 10 · 2026</span></div> : null}
          </div>
          <p className="media-crop-editor-hint">Kéo ảnh để thay đổi vùng tập trung</p>
        </div>

        <div className="media-crop-editor-controls">
          <div className="media-crop-editor-control"><label htmlFor={`${titleId}-x`}>Ngang</label><output htmlFor={`${titleId}-x`}>{Math.round(values.focusX)}</output><input id={`${titleId}-x`} type="range" min="0" max="100" step="1" value={values.focusX} onChange={(event) => updateValue("focusX", rangeValue(event))} /></div>
          <div className="media-crop-editor-control"><label htmlFor={`${titleId}-y`}>Dọc</label><output htmlFor={`${titleId}-y`}>{Math.round(values.focusY)}</output><input id={`${titleId}-y`} type="range" min="0" max="100" step="1" value={values.focusY} onChange={(event) => updateValue("focusY", rangeValue(event))} /></div>
          <div className="media-crop-editor-control"><label htmlFor={`${titleId}-zoom`}>Thu phóng</label><output htmlFor={`${titleId}-zoom`}>{values.zoom.toFixed(1)}×</output><input id={`${titleId}-zoom`} type="range" min="1" max="3" step="0.1" value={values.zoom} onChange={(event) => updateValue("zoom", rangeValue(event))} /></div>
        </div>

        <div className="media-crop-editor-actions">
          <button className="admin-secondary-button" type="button" onClick={() => setValues({ focusX: 50, focusY: 50, zoom: 1 })}>Đặt lại</button>
          <button className="admin-secondary-button" type="button" onClick={onClose}>Hủy</button>
          <button className="admin-primary-button" type="button" onClick={() => void onSave(values)}>Lưu căn chỉnh</button>
        </div>
      </div>
    </div>
  );
}
