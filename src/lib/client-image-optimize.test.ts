// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_UPLOAD_PROFILES,
  MAX_CLIENT_IMAGE_BYTES,
  prepareImageForUpload,
} from "./client-image-optimize";

describe("prepareImageForUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "createImageBitmap");
  });

  function mockBitmap(width: number, height: number) {
    const close = vi.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: vi.fn(async () => ({ width, height, close })),
    });
    return close;
  }

  function mockCanvasOutput(bytes: number) {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      callback(new Blob([new Uint8Array(bytes)], { type: type ?? "image/webp" }));
    });
    return drawImage;
  }

  it("keeps an already-light photo unchanged when it fits its delivery profile", async () => {
    const close = mockBitmap(2400, 1600);
    const file = new File([new Uint8Array(1024)], "wedding.jpg", { type: "image/jpeg" });

    const result = await prepareImageForUpload(file, "hero");

    expect(result.file).toBe(file);
    expect(result.optimized).toBe(false);
    expect(result.originalBytes).toBe(file.size);
    expect(close).toHaveBeenCalledOnce();
  });

  it("downscales a high-resolution gallery photo even when its compressed bytes are already small", async () => {
    const close = mockBitmap(8000, 6000);
    const drawImage = mockCanvasOutput(600 * 1024);
    const original = new File(
      [new Uint8Array(700 * 1024)],
      "compressed-but-huge.jpg",
      { type: "image/jpeg" },
    );

    const result = await prepareImageForUpload(original, "gallery");

    expect(result.optimized).toBe(true);
    expect(result.file.type).toBe("image/webp");
    const firstDraw = drawImage.mock.calls[0]!;
    const width = Number(firstDraw[3]);
    const height = Number(firstDraw[4]);
    expect(Math.max(width, height)).toBeLessThanOrEqual(IMAGE_UPLOAD_PROFILES.gallery.maxEdge);
    expect(width * height).toBeLessThanOrEqual(IMAGE_UPLOAD_PROFILES.gallery.maxPixels);
    expect(close).toHaveBeenCalledOnce();
  });

  it("compresses a normal-resolution photo that is under 12 MB but still too heavy for the web", async () => {
    const close = mockBitmap(2200, 1400);
    mockCanvasOutput(1200 * 1024);
    const original = new File(
      [new Uint8Array(4 * 1024 * 1024)],
      "heavy-cover.jpg",
      { type: "image/jpeg", lastModified: 123 },
    );

    const result = await prepareImageForUpload(original, "hero");

    expect(result.optimized).toBe(true);
    expect(result.file.name).toBe("heavy-cover.webp");
    expect(result.file.type).toBe("image/webp");
    expect(result.file.size).toBeLessThanOrEqual(IMAGE_UPLOAD_PROFILES.hero.targetBytes);
    expect(result.file.size).toBeLessThan(original.size);
    expect(close).toHaveBeenCalledOnce();
  });

  it("converts an oversized wedding photo to a WebP inside the selected delivery budget", async () => {
    const close = mockBitmap(6000, 4000);
    const encodedBytes = 800 * 1024;
    mockCanvasOutput(encodedBytes);
    const original = new File(
      [new Uint8Array(MAX_CLIENT_IMAGE_BYTES + 1024)],
      "full-resolution-wedding.jpg",
      { type: "image/jpeg", lastModified: 123 },
    );

    const result = await prepareImageForUpload(original, "gallery");

    expect(result.optimized).toBe(true);
    expect(result.originalBytes).toBe(original.size);
    expect(result.file.name).toBe("full-resolution-wedding.webp");
    expect(result.file.type).toBe("image/webp");
    expect(result.file.size).toBe(encodedBytes);
    expect(result.file.size).toBeLessThanOrEqual(IMAGE_UPLOAD_PROFILES.gallery.targetBytes);
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not silently flatten an oversized animated GIF", async () => {
    const gif = new File(
      [new Uint8Array(MAX_CLIENT_IMAGE_BYTES + 1)],
      "animation.gif",
      { type: "image/gif" },
    );

    await expect(prepareImageForUpload(gif, "gallery")).rejects.toThrow(/không thể tự tối ưu.*giữ chuyển động/i);
  });
});
