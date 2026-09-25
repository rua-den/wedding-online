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
    const failures: string[] = [];

    try {
      for (let index = 0; index < activeAssets.length; index += 1) {
        const asset = activeAssets[index]!;
        const label = asset.alt || asset.slot;
        setStatus(`Đang kiểm tra ảnh ${index + 1}/${activeAssets.length}: ${label}…`);

        try {
          const sourceResponse = await fetch(`/api/admin/media/optimize?id=${asset.id}`, { cache: "no-store" });
          if (!sourceResponse.ok) {
            const body = await responseBody(sourceResponse);
            throw new Error(body?.message ?? `Không thể đọc ảnh hiện tại: ${label}.`);
          }
          const sourceBlob = await sourceResponse.blob();
          if (!sourceBlob.type.startsWith("image/")) throw new Error(`Tệp ${label} không còn là ảnh hợp lệ.`);

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
          form.set("id", String(asset.id));
          form.set("file", prepared.file);
          const replaceResponse = await fetch("/api/admin/media/optimize", { method: "POST", body: form });
          const replaceBody = await responseBody(replaceResponse);
          if (!replaceResponse.ok || !replaceBody?.asset) {
            throw new Error(replaceBody?.message ?? `Không thể lưu bản tối ưu của ${label}.`);
          }

          const replacement = replaceBody.asset;
          optimizedCount += 1;
          savedBytes += Math.max(0, sourceBlob.size - prepared.file.size);
          setAssets((current) => current.map((item) => item.id === replacement.id ? replacement : item));
        } catch (error) {
          failures.push(`${label}: ${error instanceof Error ? error.message : "không thể tối ưu"}`);
        }
      }

      if (failures.length > 0) {
        setStatus(
          `Đã tối ưu ${optimizedCount} ảnh, giữ nguyên ${skippedCount} ảnh, giảm khoảng ${formatImageMegabytes(savedBytes)} MB. `
          + `${failures.length} ảnh chưa xử lý được; có thể chạy lại an toàn. ${failures.slice(0, 2).join(" · ")}`,
        );
      } else if (optimizedCount > 0) {
        setStatus(`Xong: tối ưu ${optimizedCount} ảnh, giữ nguyên ${skippedCount} ảnh đã nhẹ, giảm khoảng ${formatImageMegabytes(savedBytes)} MB.`);
      } else {
        setStatus(`Không cần đổi: ${skippedCount} ảnh hiện tại đã nằm trong mức tối ưu cho web.`);
      }
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
      Công cụ này chạy trên các ảnh đang hiển thị: ảnh nặng sẽ được resize và chuyển WebP ngay trên cùng bản ghi,
      nên giữ nguyên vị trí crop/focus, trạng thái và thứ tự gallery. Có thể chạy lại an toàn nếu một ảnh lỗi giữa chừng.
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
