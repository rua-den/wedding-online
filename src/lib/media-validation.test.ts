import { describe, expect, it } from "vitest";
import { resolveUploadExtension, validateMediaUpload } from "./media-validation";

describe("media upload validation", () => {
  it("accepts supported image metadata and trims alt text", () => {
    expect(validateMediaUpload({ slot: "hero", mimeType: "image/jpeg", size: 1024, alt: "  Ảnh bìa  " })).toEqual({
      slot: "hero", alt: "Ảnh bìa",
    });
  });

  it("rejects non-images and files over 12 MiB", () => {
    expect(() => validateMediaUpload({ slot: "gallery", mimeType: "application/pdf", size: 10, alt: "" })).toThrow("Chỉ chấp nhận tệp hình ảnh.");
    expect(() => validateMediaUpload({ slot: "gallery", mimeType: "image/jpeg", size: 12 * 1024 * 1024 + 1, alt: "" })).toThrow("Ảnh không được vượt quá 12 MB.");
  });

  it("rejects an unknown slot and oversized alt text", () => {
    expect(() => validateMediaUpload({ slot: "map", mimeType: "image/png", size: 10, alt: "" })).toThrow("Vị trí ảnh không hợp lệ.");
    expect(() => validateMediaUpload({ slot: "venue", mimeType: "image/png", size: 10, alt: "x".repeat(161) })).toThrow("Mô tả ảnh quá dài.");
  });

  it("derives an extension from MIME when the filename has none", () => {
    expect(resolveUploadExtension("photo", "image/png")).toBe(".png");
    expect(resolveUploadExtension("photo.unknown", "image/webp")).toBe(".webp");
  });

  it("rejects a known filename extension that disagrees with MIME", () => {
    expect(() => validateMediaUpload({ slot: "gallery", filename: "photo.jpg", mimeType: "image/png", size: 10, alt: "" })).toThrow("Phần mở rộng tệp không khớp với loại hình ảnh.");
  });
});
