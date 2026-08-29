import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadFilename } from "@/lib/media-upload";
import { GET } from "./route";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "wedding-upload-route-"));
  vi.stubEnv("MEDIA_UPLOAD_DIRECTORY", join(directory, "uploads-outside-public"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("GET /uploads/[filename]", () => {
  it("serves a fresh generated upload from the configured directory", async () => {
    const filename = createUploadFilename("photo.png");
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const uploadDirectory = join(directory, "uploads-outside-public");
    mkdirSync(uploadDirectory, { recursive: true });
    writeFileSync(join(uploadDirectory, filename), bytes);

    const response = await GET(
      new Request(`http://localhost/uploads/${filename}`),
      { params: Promise.resolve({ filename }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });

  it("does not resolve a non-canonical filename", async () => {
    const response = await GET(
      new Request("http://localhost/uploads/../secret.jpg"),
      { params: Promise.resolve({ filename: "../secret.jpg" }) },
    );

    expect(response.status).toBe(404);
  });
});
