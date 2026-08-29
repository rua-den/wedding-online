import { basename, extname } from "node:path";
import { mediaSlots, type MediaSlot } from "./media-store";
import { validateMediaAlt } from "./media-text";

export { MAX_MEDIA_ALT_LENGTH, validateMediaAlt } from "./media-text";

export const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
const mimeExtensions: Record<string, readonly string[]> = {
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export function resolveUploadExtension(filename: string, mimeType: string): string {
  const normalizedMime = mimeType.trim().toLowerCase();
  const preferredExtensions = mimeExtensions[normalizedMime];
  if (!preferredExtensions) throw new Error("Chỉ chấp nhận tệp hình ảnh.");

  const filenameExtension = extname(basename(filename)).toLowerCase();
  if (!filenameExtension) return preferredExtensions[0];
  if (!preferredExtensions.includes(filenameExtension)) {
    const knownImageExtension = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"].includes(filenameExtension);
    if (knownImageExtension) throw new Error("Phần mở rộng tệp không khớp với loại hình ảnh.");
    return preferredExtensions[0];
  }
  return filenameExtension;
}

export function validateMediaUpload(input: {
  slot: string;
  filename?: string;
  mimeType: string;
  size: number;
  alt: string;
}): { slot: MediaSlot; alt: string } {
  if (!mediaSlots.includes(input.slot as MediaSlot)) throw new Error("Vị trí ảnh không hợp lệ.");
  resolveUploadExtension(input.filename ?? "", input.mimeType);
  if (input.size > MAX_MEDIA_BYTES) throw new Error("Ảnh không được vượt quá 12 MB.");
  return { slot: input.slot as MediaSlot, alt: validateMediaAlt(input.alt) };
}
