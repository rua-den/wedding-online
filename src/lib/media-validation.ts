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

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function hasExpectedImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  switch (mimeType.trim().toLowerCase()) {
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a";
    case "image/webp":
      return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP";
    case "image/avif": {
      if (ascii(bytes, 4, 8) !== "ftyp") return false;
      const brands = ascii(bytes, 8, Math.min(bytes.length, 64));
      return brands.includes("avif") || brands.includes("avis");
    }
    default:
      return false;
  }
}

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

export async function validateImageFile(file: File): Promise<string> {
  if (file.size <= 0) throw new Error("Tệp hình ảnh đang trống.");
  if (file.size > MAX_MEDIA_BYTES) throw new Error("Ảnh không được vượt quá 12 MB.");

  const extension = resolveUploadExtension(file.name, file.type);
  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (!hasExpectedImageSignature(header, file.type)) {
    throw new Error("Tệp không có định dạng hình ảnh hợp lệ.");
  }
  return extension;
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
  if (input.size <= 0) throw new Error("Tệp hình ảnh đang trống.");
  if (input.size > MAX_MEDIA_BYTES) throw new Error("Ảnh không được vượt quá 12 MB.");
  return { slot: input.slot as MediaSlot, alt: validateMediaAlt(input.alt) };
}
