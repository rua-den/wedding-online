import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminSession } from "@/lib/admin-auth";
import { audioUploadPath, canonicalAudioFilename } from "@/lib/audio-upload";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { DELETE, GET, POST, PUT } from "./route";

let directory: string;

function authenticatedHeaders() {
  return { cookie: `wedding_admin_session=${createAdminSession()}` };
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-music-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  process.env.MEDIA_UPLOAD_DIRECTORY = join(directory, "uploads");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  delete process.env.MEDIA_UPLOAD_DIRECTORY;
  rmSync(directory, { recursive: true, force: true });
});

describe("/api/admin/music", () => {
  it("rejects unauthenticated reads and mutation", async () => {
    expect((await GET(new Request("http://localhost/api/admin/music"))).status).toBe(401);
    const form = new FormData();
    form.set("file", new File([Uint8Array.from([0x49, 0x44, 0x33, 0x04])], "wedding.mp3", { type: "audio/mpeg" }));
    expect((await POST(new Request("http://localhost/api/admin/music", { method: "POST", body: form }))).status).toBe(401);
  });

  it("uploads, updates and removes one MP3 track safely", async () => {
    const form = new FormData();
    form.set("file", new File([Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0, 1, 2, 3])], "our-song.mp3", { type: "audio/mpeg" }));
    form.set("title", "Our Song");
    const upload = await POST(new Request("http://localhost/api/admin/music", { method: "POST", headers: authenticatedHeaders(), body: form }));
    expect(upload.status).toBe(201);
    const uploaded = await upload.json() as { music: { src: string; enabled: boolean; title: string; loop: boolean } };
    expect(uploaded.music).toMatchObject({ enabled: true, title: "Our Song", loop: true });
    const filename = canonicalAudioFilename(uploaded.music.src);
    expect(filename).not.toBeNull();
    expect(existsSync(audioUploadPath(filename!)!)).toBe(true);

    const saved = await PUT(new Request("http://localhost/api/admin/music", {
      method: "PUT",
      headers: { ...authenticatedHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ enabled: false, title: "First Dance", loop: false }),
    }));
    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({ music: { enabled: false, title: "First Dance", loop: false, src: uploaded.music.src } });

    const read = await GET(new Request("http://localhost/api/admin/music", { headers: authenticatedHeaders() }));
    await expect(read.json()).resolves.toMatchObject({ music: { enabled: false, title: "First Dance", src: uploaded.music.src } });

    const removed = await DELETE(new Request("http://localhost/api/admin/music", { method: "DELETE", headers: authenticatedHeaders() }));
    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toEqual({ music: { enabled: false, src: null, title: "", loop: true } });
    expect(existsSync(audioUploadPath(filename!)!)).toBe(false);
  });

  it("rejects non-MP3 uploads", async () => {
    const form = new FormData();
    form.set("file", new File(["not audio"], "song.wav", { type: "audio/wav" }));
    const response = await POST(new Request("http://localhost/api/admin/music", { method: "POST", headers: authenticatedHeaders(), body: form }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: expect.stringContaining("MP3") });
  });
});
