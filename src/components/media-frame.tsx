"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

import type { MediaSlot, PublicMediaAsset } from "@/lib/media-store";

type MediaFrameProps = {
  asset: PublicMediaAsset;
  className?: string;
  imageClassName?: string;
  alt?: string;
  loading?: "eager" | "lazy";
  sizes?: string;
};

export function mediaFrameStyle(asset: PublicMediaAsset): CSSProperties {
  return {
    objectPosition: `${asset.focusX}% ${asset.focusY}%`,
    transform: `scale(${asset.zoom})`,
    transformOrigin: `${asset.focusX}% ${asset.focusY}%`,
  };
}

export function mediaFrameSizes(slot: MediaSlot): string {
  switch (slot) {
    case "hero":
      return "100vw";
    case "groom":
    case "bride":
      return "(max-width: 720px) 88vw, 38vw";
    case "gallery":
      return "(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 24vw";
    case "venue":
      return "(max-width: 720px) 92vw, 50vw";
    case "story":
    default:
      return "(max-width: 720px) 92vw, 70vw";
  }
}

function fallbackLabel(slot: MediaSlot, alt: string): string {
  if (slot === "hero") return "Ảnh cover không thể tải";
  if (slot === "groom") return "Ảnh chú rể không thể tải";
  if (slot === "bride") return "Ảnh cô dâu không thể tải";
  if (slot === "venue") return "Ảnh địa điểm không thể tải";
  if (slot === "story") return "Ảnh chuyện tình không thể tải";
  return alt ? `${alt} không thể tải` : "Ảnh gallery không thể tải";
}

function fallbackContent(slot: MediaSlot): string {
  if (slot === "groom") return "H";
  if (slot === "bride") return "N";
  if (slot === "venue") return "⌖";
  if (slot === "story") return "♡";
  if (slot === "gallery") return "✦";
  return "H ♥ N";
}

export function MediaFrame({ asset, className = "", imageClassName, alt, loading = "lazy", sizes }: MediaFrameProps) {
  const [failed, setFailed] = useState(false);
  const resolved = alt ?? asset.alt;

  if (failed) {
    return <div
      className={`${className} media-frame-fallback media-frame-fallback-${asset.slot}`.trim()}
      role="img"
      aria-label={fallbackLabel(asset.slot, resolved)}
    >
      <span aria-hidden="true">{fallbackContent(asset.slot)}</span>
    </div>;
  }

  return <div className={className}>
    <Image
      src={asset.src}
      fill
      sizes={sizes ?? mediaFrameSizes(asset.slot)}
      className={imageClassName}
      alt={resolved}
      style={mediaFrameStyle(asset)}
      loading={loading}
      onError={() => setFailed(true)}
    />
  </div>;
}
