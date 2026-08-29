"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicMediaAsset } from "@/lib/media-store";
import { MediaFrame } from "./media-frame";

export function Gallery({ assets }: { assets: PublicMediaAsset[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = selected !== null;

  const closeLightbox = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelected((current) => current === null || assets.length === 0 ? null : (current + 1) % assets.length);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelected((current) => current === null || assets.length === 0 ? null : (current - 1 + assets.length) % assets.length);
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      const activeIndex = focusable.indexOf(activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1
        : activeIndex < 0 || activeIndex >= focusable.length - 1 ? 0 : activeIndex + 1;
      event.preventDefault();
      (focusable[nextIndex] ?? (event.shiftKey ? last : first)).focus();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [assets.length, closeLightbox, isOpen]);

  if (assets.length === 0) return <p className="gallery-empty">Những khoảnh khắc của chúng mình sẽ được cập nhật tại đây.</p>;
  const active = selected === null ? null : assets[selected];
  return <>
    <div className="gallery-grid" aria-label="Album ảnh cưới">
      {assets.map((asset, index) => <button className="gallery-item" type="button" key={asset.src} aria-label={asset.alt || `Ảnh ${index + 1}`} onClick={(event) => { triggerRef.current = event.currentTarget; setSelected(index); }}>
        <MediaFrame asset={asset} className="media-frame-slot-gallery" alt={asset.alt || `Ảnh ${index + 1}`} loading="lazy" />
      </button>)}
    </div>
    {active ? <div ref={dialogRef} className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh lớn" tabIndex={-1} onClick={(event) => { if (event.target === event.currentTarget) closeLightbox(); }}>
      <button ref={closeButtonRef} className="gallery-close" type="button" aria-label="Đóng ảnh" onClick={closeLightbox}>×</button>
      <button className="gallery-arrow gallery-arrow-prev" type="button" aria-label="Ảnh trước" onClick={(event) => { event.stopPropagation(); setSelected((current) => current === null ? null : (current - 1 + assets.length) % assets.length); }}>‹</button>
      <div className="gallery-lightbox-frame-shell" onClick={(event) => event.stopPropagation()}>
        <MediaFrame asset={active} className="gallery-lightbox-frame media-frame-slot-gallery" imageClassName="gallery-lightbox-image" alt={active.alt} />
      </div>
      <button className="gallery-arrow gallery-arrow-next" type="button" aria-label="Ảnh tiếp theo" onClick={(event) => { event.stopPropagation(); setSelected((current) => current === null ? null : (current + 1) % assets.length); }}>›</button>
      <span className="gallery-count">{(selected ?? 0) + 1} / {assets.length}</span>
    </div> : null}
  </>;
}
