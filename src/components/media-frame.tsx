"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import type { PublicMediaAsset } from "@/lib/media-store";

export type MediaFrameProps = {
  asset: PublicMediaAsset;
  className?: string;
  imageClassName?: string;
  alt?: string;
  loading?: "eager" | "lazy";
  fallback?: ReactNode;
  children?: ReactNode;
};

export function mediaFrameStyle(asset: Pick<PublicMediaAsset, "focusX" | "focusY" | "zoom">): Pick<CSSProperties, "objectPosition" | "transform" | "transformOrigin"> {
  const objectPosition = `${asset.focusX}% ${asset.focusY}%`;
  return {
    objectPosition,
    transform: `scale(${asset.zoom})`,
    transformOrigin: objectPosition,
  };
}

function fallbackVariant(slot: PublicMediaAsset["slot"]) {
  return slot === "groom" || slot === "bride" ? "portrait" : slot;
}

function fallbackMark(slot: PublicMediaAsset["slot"]) {
  switch (slot) {
    case "groom":
      return "H";
    case "bride":
      return "N";
    case "gallery":
      return "Ảnh đang được cập nhật";
    default:
      return "♡";
  }
}

function defaultFallback(asset: PublicMediaAsset, imageAlt: string) {
  const variant = fallbackVariant(asset.slot);
  return (
    <div className={`media-frame-fallback media-frame-fallback-${variant}`} role="img" aria-label={`${imageAlt} không thể tải`}>
      <span aria-hidden={variant !== "gallery"}>{fallbackMark(asset.slot)}</span>
    </div>
  );
}

export function MediaFrame({ asset, className, imageClassName, alt, loading, fallback, children }: MediaFrameProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const frameClassName = ["media-frame", className].filter(Boolean).join(" ");
  const imageClass = ["media-frame-image", imageClassName].filter(Boolean).join(" ");
  const imageAlt = alt ?? asset.alt;
  const loadError = failedSrc === asset.src;

  return (
    <div className={frameClassName} style={{ overflow: "hidden" }}>
      {loadError ? fallback ?? defaultFallback(asset, imageAlt || "Ảnh") : <img
          className={imageClass}
          src={asset.src}
          alt={imageAlt}
          loading={loading}
          onError={() => setFailedSrc(asset.src)}
          style={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            ...mediaFrameStyle(asset),
          }}
        />}
      {children}
    </div>
  );
}
