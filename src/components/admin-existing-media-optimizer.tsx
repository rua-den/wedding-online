"use client";

import { useState } from "react";

import {
  formatImageMegabytes,
  prepareImageForUpload,
  type ImageUploadPurpose,
} from "@/lib/client-image-optimize";
import type { MediaAsset, MediaSlot } from "@/lib/media-store";

type MediaResponse = { asset?: MediaAsset; message?: string; ok?: boolean };

function purposeForSlot(slot: MediaSlot): ImageUploadPurpose {
  if (slot === "groom" || slot === "bride") return "portrait";
  return slot;
}

function extensionForType(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/avif") return "avif";
  if (type === "image/gif") return "gif";
  return "webp";
}

async function responseBody(response: Response): Promise<MediaResponse | null> {
  return await response.json().catch(() => null) as MediaResponse | null;
}

export function AdminExistingMediaOptimizer({ initialAssets }: { initialAssets: MediaAsset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const activeAssets = assets.filter((asset) => asset.active);

  async function optimize() {
    if (busy || activeAssets.length === 0) return;
    setBusy(true);
    setStatus("");

    let optimizedCount = 0;
    let skippedCount = 0;
    let savedBytes = 0;
    const replacements = new Map<number, MediaAsset>();

    try {
      for (let index = 0; index < activeAssets.length; index += 1) {
        const asset = activeAssets[index]!;
        setStatus(`Đang kiểm tra ảnh ${index + 1}/${activeAssets.length}: ${asset.alt || asset.slot}…`);

        const sourceResponse = await fetch(asset.src, { cache: "no-store" });
        if (!sourceResponse.ok) throw new Error(`Không thể đọc ảnh hiện tại: ${asset.alt || asset.slot}.`);
        const sourceBlob = await sourceResponse.blob();
        if (!sourceBlob.type.startsWith("image/")) throw new Error(`Tệp ${asset.alt || asset.slot} không còn là ảnh hợp lệ.`);

        const sourceFile = new File(
          [sourceBlob],
          `existing-${asset.id}.${extensionForType(sourceBlob.type)}`,
          { type: sourceBlob.type },
        );
        const prepared = await prepareImageForUpload(sourceFile, purposeForSlot(asset.slot));
        if (!prepared.optimized) {
          skippedCount += 1;
          continue;
        }

        const form = new FormData();
        form.set("file", prepared.file);
        form.set("slot", asset.slot);
        form.set("alt", asset.alt);
        const uploadResponse = await fetch("/api/admin/media", { method: "POST", body: form });
        const uploadBody = await responseBody(uploadResponse);
        if (!uploadResponse.ok || !uploadBody?.asset) {
          throw new Error(uploadBody?.message ?? `Không thể lưu bản tối ưu của ${asset.alt || asset.slot}.`);
        }

        const uploaded = uploadBody.asset;
        const cropResponse = await fetch("/api/admin/media", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: uploaded.id,
            focusX: asset.focusX,
            focusY: asset.focusY,
            zoom: asset.zoom,
          }),
        });
        const cropBody = await responseBody(cropResponse);
        if (!cropResponse.ok || !cropBody?.asset) {
          throw new Error(cropBody?.message ?? `Không thể giữ căn khung của ${asset.alt || asset.slot}.`);
        }

        const deleteResponse = await fetch("/api/admin/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: asset.id }),
        });
        if (!deleteResponse.ok) throw new Error(`Đã tạo ảnh tối ưu nhưng không thể xóa bản cũ của ${asset.alt || asset.slot}.`);

        const replacement = { ...cropBody.asset, sortOrder: asset.sortOrder };
        replacements.set(asset.id, replacement);
        optimizedCount += 1;
        savedBytes += Math.max(0, sourceBlob.size - prepared.file.size);
        setAssets((current) => current
          .filter((item) => item.id !== asset.id)
          .map((item) => item.slot === asset.slot && asset.slot !== "gallery" && item.active
            ? { ...item, active: false }
            : item)
          .concat(replacement));
      }

      if (replacements.size > 0) {
        const finalAssets = assets
          .filter((asset) => !replacements.has(asset.id))
          .concat([...replacements.values()]);
        const galleryIds = finalAssets
          .filter((asset) => asset.slot === "gallery")
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
          .map((asset) => asset.id);
        if (galleryIds.length > 0) {
          const orderResponse = await fetch("/api/admin/media/order", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: galleryIds }),
          });
          if (!orderResponse.ok) throw new Error("Ảnh đã được tối ưu nhưng không thể khôi phục thứ tự gallery.");
        }
      }

      setStatus(
        optimizedCount > 0
          ? `Xong: tối ưu ${optimizedCount} ảnh, giữ nguyên ${skippedCount} ảnh đã nhẹ, giảm khoảng ${formatImageMegabytes(savedBytes)} MB.`
          : `Không cần đổi: ${skippedCount} ảnh hiện tại đã nằm trong mức tối ưu cho web.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể tối ưu bộ ảnh hiện tại.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="admin-panel" aria-labelledby="existing-media-optimizer-title">
    <div className="admin-panel-heading">
      <div>
        <p className="eyebrow">Hiệu năng ảnh</p>
        <h1 id="existing-media-optimizer-title">Tối ưu ảnh đang dùng</h1>
      </div>
      <span className="admin-media-count">{activeAssets.length} ảnh đang hoạt động</span>
    </div>
    <p>
      Công cụ này chạy một lần trên các ảnh đang hiển thị: ảnh nặng sẽ được resize và chuyển WebP,
      giữ nguyên vị trí crop/focus và thứ tự gallery. Ảnh đã đủ nhẹ sẽ được bỏ qua.
    </p>
    <div className="admin-actions">
      <button className="admin-primary-button" type="button" disabled={busy || activeAssets.length === 0} onClick={() => void optimize()}>
        {busy ? "Đang tối ưu…" : "Tối ưu toàn bộ ảnh hiện tại"}
      </button>
      <a className="admin-secondary-button" href="/" target="_blank" rel="noreferrer">Mở thiệp để kiểm tra ↗</a>
    </div>
    {status ? <p role="status" aria-live="polite">{status}</p> : null}
  </section>;
}
