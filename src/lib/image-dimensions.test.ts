import { describe, expect, it } from "vitest";

import { imageDimensions, isSafeImageDimensions } from "./image-dimensions";

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpegHeader(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

describe("image dimension safety", () => {
  it("reads PNG dimensions and rejects a compressed image with an unsafe decoded size", () => {
    expect(imageDimensions(pngHeader(8000, 6000), "image/png")).toEqual({ width: 8000, height: 6000 });
    expect(isSafeImageDimensions({ width: 8000, height: 6000 })).toBe(false);
  });

  it("reads JPEG SOF dimensions and accepts normal wedding output sizes", () => {
    expect(imageDimensions(jpegHeader(3000, 2000), "image/jpeg")).toEqual({ width: 3000, height: 2000 });
    expect(isSafeImageDimensions({ width: 3000, height: 2000 })).toBe(true);
  });
});
