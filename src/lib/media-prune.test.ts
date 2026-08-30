import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pruneOrphanUploads } from "./media-prune";
import { updateMusicSettings } from "./music-store";
import { closeDatabaseForTests, getDatabase, initializeDatabase } from "./sqlite";

let directory: string;
let uploads: string;
const nowMs = Date.UTC(2026, 7, 30, 12, 0, 0);
const oldSeconds = (nowMs - 48 * 60 * 60 * 1000) / 1000;

const filenames = {
  orphanImage: "1788039000000-a2a49997-39dd-4e53-878c-3cb63437fefe.png",
  orphanAudio: "1788039000001-b2a49997-39dd-4e53-878c-3cb63437fefe.mp3",
  recentImage: "1788039000002-c2a49997-39dd-4e53-878c-3cb63437fefe.webp",
  mediaImage: "1788039000003-d2a49997-39dd-4e53-878c-3cb63437fefe.jpg",
  milestoneImage: "1788039000004-e2a49997-39dd-4e53-878c-3cb63437fefe.png",
  musicAudio: "1788039000005-f2a49997-39dd-4e53-878c-3cb63437fefe.mp3",
};

function src(filename: string) {
  return `/uploads/${filename}`;
}

function createOldFile(filename: string) {
  const path = join(uploads, filename);
  writeFileSync(path, "fixture");
  utimesSync(path, oldSeconds, oldSeconds);
  return path;
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "media-prune-"));
  uploads = join(directory, "uploads");
  mkdirSync(uploads, { recursive: true });
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  process.env.MEDIA_UPLOAD_DIRECTORY = uploads;
  vi.stubEnv("NODE_ENV", "test");
  initializeDatabase();
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  delete process.env.MEDIA_UPLOAD_DIRECTORY;
  rmSync(directory, { recursive: true, force: true });
});

describe("orphan upload prune", () => {
  it("deletes only old unreferenced canonical image/audio files", async () => {
    Object.values(filenames).forEach(createOldFile);
    writeFileSync(join(uploads, "notes.txt"), "keep me");
    const recentPath = join(uploads, filenames.recentImage);
    utimesSync(recentPath, nowMs / 1000, nowMs / 1000);

    const db = getDatabase();
    const createdAt = new Date(nowMs).toISOString();
    db.prepare(`
      INSERT INTO media_assets (slot, src, alt, sort_order, active, focus_x, focus_y, zoom, created_at, updated_at)
      VALUES ('hero', ?, 'hero', 0, 1, 50, 50, 1, ?, ?)
    `).run(src(filenames.mediaImage), createdAt, createdAt);

    db.exec(`CREATE TABLE IF NOT EXISTS invitation_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content_json TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`);
    db.prepare("INSERT INTO invitation_content (id, content_json, schema_version, updated_at) VALUES (1, ?, 99, ?)")
      .run(JSON.stringify({ futureShape: { nestedImage: src(filenames.milestoneImage) } }), createdAt);

    updateMusicSettings({ enabled: true, src: src(filenames.musicAudio), title: "Wedding", loop: true });

    const result = await pruneOrphanUploads({ nowMs });

    expect(result.deleted.sort()).toEqual([src(filenames.orphanAudio), src(filenames.orphanImage)].sort());
    expect(() => statSync(join(uploads, filenames.orphanImage))).toThrow();
    expect(() => statSync(join(uploads, filenames.orphanAudio))).toThrow();
    for (const filename of [filenames.recentImage, filenames.mediaImage, filenames.milestoneImage, filenames.musicAudio]) {
      expect(existsSync(join(uploads, filename))).toBe(true);
    }
    expect(existsSync(join(uploads, "notes.txt"))).toBe(true);
    expect(result.ignored).toBe(1);
  });

  it("is harmless when the upload directory is missing", async () => {
    rmSync(uploads, { recursive: true, force: true });
    await expect(pruneOrphanUploads({ nowMs })).resolves.toEqual({ deleted: [], retained: 0, ignored: 0 });
  });

  it("aborts instead of deleting when raw invitation JSON is malformed", async () => {
    createOldFile(filenames.orphanImage);
    const db = getDatabase();
    db.exec(`CREATE TABLE IF NOT EXISTS invitation_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content_json TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`);
    db.prepare("INSERT INTO invitation_content (id, content_json, schema_version, updated_at) VALUES (1, '{broken', 1, ?)").run(new Date(nowMs).toISOString());

    await expect(pruneOrphanUploads({ nowMs })).rejects.toThrow("JSON không hợp lệ");
    expect(existsSync(join(uploads, filenames.orphanImage))).toBe(true);
  });
});
