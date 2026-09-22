export const MAX_RENDER_IMAGE_EDGE = 3840;
export const MAX_RENDER_IMAGE_PIXELS = 12_000_000;

export type ImageDimensions = { width: number; height: number };

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function u16be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function u24le(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! << 24) >>> 0)
    + (bytes[offset + 1]! << 16)
    + (bytes[offset + 2]! << 8)
    + bytes[offset + 3]!;
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]!
    + (bytes[offset + 1]! << 8)
    + (bytes[offset + 2]! << 16)
    + ((bytes[offset + 3]! << 24) >>> 0)) >>> 0;
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset]!;
    offset += 1;
    if (marker === 0xd8 || marker === 0x01) continue;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 1 >= bytes.length) break;
    const length = u16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (sofMarkers.has(marker) && length >= 7) {
      const height = u16be(bytes, offset + 3);
      const width = u16be(bytes, offset + 5);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 12) !== "WEBP") return null;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, offset + 4);
    const chunkSize = u32le(bytes, offset + 4);
    const data = offset + 8;
    if (type === "VP8X" && data + 10 <= bytes.length) {
      return {
        width: 1 + u24le(bytes, data + 4),
        height: 1 + u24le(bytes, data + 7),
      };
    }
    if (type === "VP8L" && data + 5 <= bytes.length && bytes[data] === 0x2f) {
      const b1 = bytes[data + 1]!;
      const b2 = bytes[data + 2]!;
      const b3 = bytes[data + 3]!;
      const b4 = bytes[data + 4]!;
      return {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + ((b2 >> 6) & 0x03) + (b3 << 2) + ((b4 & 0x0f) << 10),
      };
    }
    if (type === "VP8 " && data + 10 <= bytes.length
      && bytes[data + 3] === 0x9d && bytes[data + 4] === 0x01 && bytes[data + 5] === 0x2a) {
      return {
        width: u16le(bytes, data + 6) & 0x3fff,
        height: u16le(bytes, data + 8) & 0x3fff,
      };
    }
    const next = data + chunkSize + (chunkSize % 2);
    if (next <= offset || next > bytes.length) break;
    offset = next;
  }
  return null;
}

function avifDimensions(bytes: Uint8Array): ImageDimensions | null {
  for (let offset = 4; offset + 16 <= bytes.length; offset += 1) {
    if (ascii(bytes, offset, offset + 4) !== "ispe") continue;
    const boxSize = u32be(bytes, offset - 4);
    if (boxSize < 20) continue;
    const width = u32be(bytes, offset + 8);
    const height = u32be(bytes, offset + 12);
    if (width > 0 && height > 0) return { width, height };
  }
  return null;
}

export function imageDimensions(bytes: Uint8Array, mimeType: string): ImageDimensions | null {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/png" && bytes.length >= 24 && ascii(bytes, 12, 16) === "IHDR") {
    return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
  }
  if (normalized === "image/gif" && bytes.length >= 10) {
    return { width: u16le(bytes, 6), height: u16le(bytes, 8) };
  }
  if (normalized === "image/jpeg") return jpegDimensions(bytes);
  if (normalized === "image/webp") return webpDimensions(bytes);
  if (normalized === "image/avif") return avifDimensions(bytes);
  return null;
}

export function isSafeImageDimensions(dimensions: ImageDimensions): boolean {
  const { width, height } = dimensions;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) return false;
  return Math.max(width, height) <= MAX_RENDER_IMAGE_EDGE
    && width * height <= MAX_RENDER_IMAGE_PIXELS;
}
