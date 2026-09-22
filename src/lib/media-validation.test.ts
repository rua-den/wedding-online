import { describe, expect, it } from "vitest";
import { resolveUploadExtension, validateImageFile, validateMediaUpload } from "./media-validation";

function pngHeader(width: number, height: number): ArrayBuffer {
  const buffer = new ArrayBuffer(24);
  const bytes = new Uint8Array(buffer);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return buffer;
}

describe("media upload validation", () => {
  it("accepts supported image metadata and trims alt text", () => {
    expect(validateMediaUpload({ slot: "hero", filename: "photo.jpg", mimeType: "image/jpeg", size: 1024, alt: "  Ảnh bìa  " })).toEqual({
      slot: "hero", alt: "Ảnh bìa",
    });
  });

  it("rejects non-images, empty files and files over 12 MiB", () => {
    expect(() => validateMediaUpload({ slot: "gallery", filename: "file.pdf", mimeType: "application/pdf", size: 10, alt: "" })).toThrow("Chỉ chấp nhận tệp hình ảnh.");
    expect(() => validateMediaUpload({ slot: "gallery", filename: "photo.jpg", mimeType: "image/jpeg", size: 0, alt: "" })).toThrow("Tệp hình ảnh đang trống.");
    expect(() => validateMediaUpload({ slot: "gallery", filename: "photo.jpg", mimeType: "image/jpeg", size: 12 * 1024 * 1024 + 1, alt: "" })).toThrow("Ảnh không được vượt quá 12 MB.");
  });

  it("rejects an unknown slot and oversized alt text", () => {
    expect(() => validateMediaUpload({ slot: "map", filename: "photo.png", mimeType: "image/png", size: 10, alt: "" })).toThrow("Vị trí ảnh không hợp lệ.");
    expect(() => validateMediaUpload({ slot: "venue", filename: "photo.png", mimeType: "image/png", size: 10, alt: "x".repeat(161) })).toThrow("Mô tả ảnh quá dài.");
  });

  it("derives an extension from MIME when the filename has none", () => {
    expect(resolveUploadExtension("photo", "image/png")).toBe(".png");
    expect(resolveUploadExtension("photo.unknown", "image/webp")).toBe(".webp");
  });

  it("rejects a known filename extension that disagrees with MIME", () => {
    expect(() => validateMediaUpload({ slot: "gallery", filename: "photo.jpg", mimeType: "image/png", size: 10, alt: "" })).toThrow("Phần mở rộng tệp không khớp với loại hình ảnh.");
  });

  it("accepts an image whose bytes and dimensions are safe", async () => {
    const png = new File([pngHeader(1200, 800)], "photo.png", { type: "image/png" });
    await expect(validateImageFile(png)).resolves.toBe(".png");
  });

  it("rejects an image whose compressed bytes are small but decoded pixels are unsafe", async () => {
    const huge = new File([pngHeader(8000, 6000)], "huge.png", { type: "image/png" });
    await expect(validateImageFile(huge)).rejects.toThrow(/độ phân giải quá lớn/i);
  });

  it("rejects a file that only claims to be an image", async () => {
    const fake = new File(["not really an image"], "photo.png", { type: "image/png" });
    await expect(validateImageFile(fake)).rejects.toThrow("Tệp không có định dạng hình ảnh hợp lệ.");
  });
});
