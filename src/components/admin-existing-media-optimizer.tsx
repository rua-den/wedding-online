"use client";

import { useMemo, useState } from "react";

import {
  formatImageMegabytes,
  prepareImageForUpload,
  type ImageUploadPurpose,
} from "@/lib/client-image-optimize";
import type { MediaAsset, MediaSlot } from "@/lib/media-store";
import type { LoveStoryMilestoneContent } from "@/types/invitation-content";

type MediaResponse = {
  asset?: MediaAsset;
  milestone?: LoveStoryMilestoneContent;
  src?: string | null;
  message?: string;
  ok?: boolean;
};

type OptimizationTarget =
  | { kind: "media"; asset: MediaAsset }
  | { kind: "story"; index: number; milestone: LoveStoryMilestoneContent };

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

function targetLabel(target: OptimizationTarget): string {
  if (target.kind === "media") return target.asset.alt || target.asset.slot;
  return `Mốc chuyện tình ${target.index + 1}: ${target.milestone.title}`;
}

async function responseBody(response: Response): Promise<MediaResponse | null> {
  return await response.json().catch(() => null) as MediaResponse | null;
}

export function AdminExistingMediaOptimizer({
  initialAssets,
  initialMilestones = [],
}: {
  initialAssets: MediaAsset[];
  initialMilestones?: LoveStoryMilestoneContent[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const activeAssets = assets.filter((asset) => asset.active);
  const targets = useMemo<OptimizationTarget[]>(() => [
    ...activeAssets.map((asset): OptimizationTarget => ({ kind: "media", asset })),
    ...milestones.flatMap((milestone, index): OptimizationTarget[] =>
      milestone.imageSrc ? [{ kind: "story", index, milestone }] : [],
    ),
  ], [activeAssets, milestones]);

  async function optimize() {
    if (busy || targets.length === 0) return;
    setBusy(true);
    setStatus("");

    let optimizedCount = 0;
    let skippedCount = 0;
    let savedBytes = 0;
    const failures: string[] = [];

    try {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index]!;
        const label = targetLabel(target);
        setStatus(`Đang kiểm tra ảnh ${index + 1}/${targets.length}: ${label}…`);

        try {
          const sourceUrl = target.kind === "media"
            ? `/api/admin/media/optimize?id=${target.asset.id}`
            : `/api/admin/content/image/optimize?index=${target.index}`;
          const sourceResponse = await fetch(sourceUrl, { cache: "no-store" });
          if (!sourceResponse.ok) {
            const sourceBody = await responseBody(sourceResponse);
            throw new Error(sourceBody?.message ?? `Không thể đọc ảnh hiện tại: ${label}.`);
          }
          const sourceBlob = await sourceResponse.blob();
          if (!sourceBlob.type.startsWith("image/")) throw new Error(`Tệp ${label} không còn là ảnh hợp lệ.`);

          const sourceFile = new File(
            [sourceBlob],
            `existing-${target.kind === "media" ? target.asset.id : `story-${target.index}`}.${extensionForType(sourceBlob.type)}`,
            { type: sourceBlob.type },
          );
          const purpose = target.kind === "media" ? purposeForSlot(target.asset.slot) : "story";
          const prepared = await prepareImageForUpload(sourceFile, purpose);
          if (!prepared.optimized) {
            skippedCount += 1;
            continue;
          }

          const form = new FormData();
          form.set("file", prepared.file);
          if (target.kind === "media") {
            form.set("id", String(target.asset.id));
          } else {
            form.set("index", String(target.index));
          }
          const replacementUrl = target.kind === "media"
            ? "/api/admin/media/optimize"
            : "/api/admin/content/image/optimize";
          const replacementResponse = await fetch(replacementUrl, { method: "POST", body: form });
          const replacementBody = await responseBody(replacementResponse);
          if (!replacementResponse.ok) {
            throw new Error(replacementBody?.message ?? `Không thể lưu bản tối ưu của ${label}.`);
          }

          if (target.kind === "media") {
            if (!replacementBody?.asset) throw new Error(`Không thể đọc bản tối ưu của ${label}.`);
            const replacement = replacementBody.asset;
            setAssets((current) => current.map((asset) => asset.id === replacement.id ? replacement : asset));
          } else {
            if (!replacementBody?.milestone) throw new Error(`Không thể đọc bản tối ưu của ${label}.`);
            const replacement = replacementBody.milestone;
            setMilestones((current) => current.map((milestone, milestoneIndex) =>
              milestoneIndex === target.index ? replacement : milestone,
            ));
          }

          optimizedCount += 1;
          savedBytes += Math.max(0, sourceBlob.size - prepared.file.size);
        } catch (error) {
          failures.push(`${label}: ${error instanceof Error ? error.message : "Không thể tối ưu."}`);
        }
      }

      const summary = optimizedCount > 0
        ? `Xong: tối ưu ${optimizedCount} ảnh, giữ nguyên ${skippedCount} ảnh đã nhẹ, giảm khoảng ${formatImageMegabytes(savedBytes)} MB.`
        : `Không cần đổi: ${skippedCount} ảnh hiện tại đã nằm trong mức tối ưu cho web.`;
      setStatus(failures.length > 0
        ? `${summary} Có ${failures.length} ảnh lỗi; có thể bấm chạy lại an toàn. ${failures.slice(0, 2).join(" · ")}`
        : summary);
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
      <span className="admin-media-count">{targets.length} ảnh đang hoạt động</span>
    </div>
    <p>
      Công cụ này kiểm tra cả ảnh trên thiệp và ảnh từng mốc chuyện tình. Ảnh nặng sẽ được resize và chuyển WebP;
      media giữ nguyên ID/crop/thứ tự, mốc chuyện tình giữ nguyên nội dung/crop/vị trí. Ảnh đã đủ nhẹ sẽ được bỏ qua.
    </p>
    <div className="admin-actions">
      <button className="admin-primary-button" type="button" disabled={busy || targets.length === 0} onClick={() => void optimize()}>
        {busy ? "Đang tối ưu…" : "Tối ưu toàn bộ ảnh hiện tại"}
      </button>
      <a className="admin-secondary-button" href="/" target="_blank" rel="noreferrer">Mở thiệp để kiểm tra ↗</a>
    </div>
    {status ? <p role="status" aria-live="polite">{status}</p> : null}
  </section>;
}
