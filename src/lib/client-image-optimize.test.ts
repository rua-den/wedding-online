// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_CLIENT_IMAGE_BYTES, prepareImageForUpload } from "./client-image-optimize";

describe("prepareImageForUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  });

  it("keeps images already within the upload limit unchanged", async () => {
    const file = new File([new Uint8Array(1024)], "wedding.jpg", { type: "image/jpeg" });

    const result = await prepareImageForUpload(file);

    expect(result.file).toBe(file);
    expect(result.optimized).toBe(false);
    expect(result.originalBytes).toBe(file.size);
  });

  it("converts an oversized wedding photo to a high-quality WebP below the server limit", async () => {
    const close = vi.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: vi.fn(async () => ({ width: 6000, height: 4000, close })),
    });

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    const encodedBytes = 10 * 1024 * 1024;
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      callback(new Blob([new Uint8Array(encodedBytes)], { type: type ?? "image/webp" }));
    });

    const original = new File(
      [new Uint8Array(MAX_CLIENT_IMAGE_BYTES + 1024)],
      "full-resolution-wedding.jpg",
      { type: "image/jpeg", lastModified: 123 },
    );

    const result = await prepareImageForUpload(original);

    expect(result.optimized).toBe(true);
    expect(result.originalBytes).toBe(original.size);
    expect(result.file.name).toBe("full-resolution-wedding.webp");
    expect(result.file.type).toBe("image/webp");
    expect(result.file.size).toBe(encodedBytes);
    expect(result.file.size).toBeLessThan(MAX_CLIENT_IMAGE_BYTES);
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not silently flatten an oversized animated GIF", async () => {
    const gif = new File(
      [new Uint8Array(MAX_CLIENT_IMAGE_BYTES + 1)],
      "animation.gif",
      { type: "image/gif" },
    );

    await expect(prepareImageForUpload(gif)).rejects.toThrow(/không thể tự tối ưu.*giữ chuyển động/i);
  });
});
