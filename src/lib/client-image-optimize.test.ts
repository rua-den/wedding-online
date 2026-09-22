// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_CLIENT_IMAGE_BYTES,
  MAX_CLIENT_IMAGE_EDGE,
  MAX_CLIENT_IMAGE_PIXELS,
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

  it("keeps reasonably sized images within the upload limit unchanged", async () => {
    const close = mockBitmap(2400, 1600);
    const file = new File([new Uint8Array(1024)], "wedding.jpg", { type: "image/jpeg" });

    const result = await prepareImageForUpload(file);

    expect(result.file).toBe(file);
    expect(result.optimized).toBe(false);
    expect(result.originalBytes).toBe(file.size);
    expect(close).toHaveBeenCalledOnce();
  });

  it("downscales a high-resolution photo even when its compressed bytes are already small", async () => {
    const close = mockBitmap(8000, 6000);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      callback(new Blob([new Uint8Array(2 * 1024 * 1024)], { type: type ?? "image/webp" }));
    });

    const original = new File(
      [new Uint8Array(8 * 1024 * 1024)],
      "compressed-but-huge.jpg",
      { type: "image/jpeg" },
    );

    const result = await prepareImageForUpload(original);

    expect(result.optimized).toBe(true);
    expect(result.file.type).toBe("image/webp");
    expect(drawImage).toHaveBeenCalled();
    const firstDraw = drawImage.mock.calls[0]!;
    const width = Number(firstDraw[3]);
    const height = Number(firstDraw[4]);
    expect(Math.max(width, height)).toBeLessThanOrEqual(MAX_CLIENT_IMAGE_EDGE);
    expect(width * height).toBeLessThanOrEqual(MAX_CLIENT_IMAGE_PIXELS);
    expect(close).toHaveBeenCalledOnce();
  });

  it("converts an oversized wedding photo to a high-quality WebP below the server limit", async () => {
    const close = mockBitmap(6000, 4000);

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
