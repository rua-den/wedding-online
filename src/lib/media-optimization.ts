import { extname } from "node:path";

import { referencedUploadSources } from "./media-prune";
import { listAdminMedia, MediaNotFoundError, type MediaAsset } from "./media-store";
import {
  canonicalUploadFilename,
  createUploadFilename,
  mediaUploadPath,
  removeMediaFile,
  saveMediaFile,
} from "./media-upload";
import { validateImageFile } from "./media-validation";
import { getDatabase, initializeDatabase } from "./sqlite";

const imageContentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export class MediaSourceUnavailableError extends Error {}

export function mediaAssetOptimizationSource(id: number): {
  asset: MediaAsset;
  absolutePath: string;
  contentType: string;
} {
  const asset = listAdminMedia().find((item) => item.id === id);
  if (!asset) throw new MediaNotFoundError("Không tìm thấy ảnh.");

  const filename = canonicalUploadFilename(asset.src);
  const absolutePath = filename ? mediaUploadPath(filename) : null;
  const contentType = filename ? imageContentTypes[extname(filename).toLowerCase()] : undefined;
  if (!filename || !absolutePath || !contentType) {
    throw new MediaSourceUnavailableError("Ảnh này không nằm trong kho upload có thể tối ưu tự động.");
  }

  return { asset, absolutePath, contentType };
}

export async function replaceMediaAssetWithOptimizedFile(id: number, file: File): Promise<MediaAsset> {
  const current = mediaAssetOptimizationSource(id).asset;
  const extension = await validateImageFile(file);
  const saved = await saveMediaFile(file, createUploadFilename(file.name, extension));

  initializeDatabase();
  const connection = getDatabase();
  try {
    connection.exec("BEGIN IMMEDIATE");
    const result = connection.prepare(`
      UPDATE media_assets
      SET src = ?, updated_at = ?
      WHERE id = ? AND src = ?
    `).run(saved.src, new Date().toISOString(), current.id, current.src) as { changes?: number | bigint };
    if (Number(result.changes ?? 0) !== 1) {
      throw new Error("Ảnh đã thay đổi trong lúc tối ưu. Hãy tải lại trang và thử lại.");
    }
    connection.exec("COMMIT");
  } catch (error) {
    try {
      connection.exec("ROLLBACK");
    } catch {
      // Preserve the original replacement error.
    }
    try {
      await removeMediaFile(saved.src);
    } catch {
      // An orphaned new file can be cleaned by the regular upload pruner.
    }
    throw error;
  }

  const updated = listAdminMedia().find((item) => item.id === current.id);
  if (!updated) throw new MediaNotFoundError("Không thể đọc ảnh vừa tối ưu.");

  try {
    if (!referencedUploadSources().has(current.src)) await removeMediaFile(current.src);
  } catch (error) {
    console.warn("Optimized media replaced but old upload cleanup failed:", error instanceof Error ? error.message : error);
  }

  return updated;
}
