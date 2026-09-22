import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAudioFilename } from "@/lib/audio-upload";
import { createUploadFilename } from "@/lib/media-upload";
import { GET } from "./route";

let directory: string;

function pngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "wedding-upload-route-"));
  vi.stubEnv("MEDIA_UPLOAD_DIRECTORY", join(directory, "uploads-outside-public"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("GET /uploads/[filename]", () => {
  it("serves a fresh generated image upload from the configured directory", async () => {
    const filename = createUploadFilename("photo.png");
    const bytes = pngHeader(1200, 800);
    const uploadDirectory = join(directory, "uploads-outside-public");
    mkdirSync(uploadDirectory, { recursive: true });
    writeFileSync(join(uploadDirectory, filename), bytes);

    const response = await GET(new Request(`http://localhost/uploads/${filename}`), { params: Promise.resolve({ filename }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });

  it("quarantines a legacy image whose decoded dimensions could exhaust browser memory", async () => {
    const filename = createUploadFilename("huge.png");
    const uploadDirectory = join(directory, "uploads-outside-public");
    mkdirSync(uploadDirectory, { recursive: true });
    writeFileSync(join(uploadDirectory, filename), pngHeader(8000, 6000));

    const response = await GET(new Request(`http://localhost/uploads/${filename}`), { params: Promise.resolve({ filename }) });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("streams MP3 byte ranges for browser playback and seeking", async () => {
    const filename = createAudioFilename();
    const bytes = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x10, 0x20, 0x30]);
    const uploadDirectory = join(directory, "uploads-outside-public");
    mkdirSync(uploadDirectory, { recursive: true });
    writeFileSync(join(uploadDirectory, filename), bytes);

    const response = await GET(
      new Request(`http://localhost/uploads/${filename}`, { headers: { Range: "bytes=2-5" } }),
      { params: Promise.resolve({ filename }) },
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-range")).toBe(`bytes 2-5/${bytes.length}`);
    expect(response.headers.get("content-length")).toBe("4");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes.subarray(2, 6));
  });

  it("rejects invalid audio ranges with 416", async () => {
    const filename = createAudioFilename();
    const bytes = Buffer.from([0x49, 0x44, 0x33, 0x04]);
    const uploadDirectory = join(directory, "uploads-outside-public");
    mkdirSync(uploadDirectory, { recursive: true });
    writeFileSync(join(uploadDirectory, filename), bytes);

    const response = await GET(
      new Request(`http://localhost/uploads/${filename}`, { headers: { Range: "bytes=99-120" } }),
      { params: Promise.resolve({ filename }) },
    );

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe(`bytes */${bytes.length}`);
  });

  it("does not resolve a non-canonical filename", async () => {
    const response = await GET(new Request("http://localhost/uploads/../secret.jpg"), { params: Promise.resolve({ filename: "../secret.jpg" }) });
    expect(response.status).toBe(404);
  });
});
