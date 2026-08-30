import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeDatabaseForTests } from "./sqlite";
import { clearMusicSettings, getMusicSettings, updateMusicSettings } from "./music-store";

let directory: string;
const track = "/uploads/1788039145650-f2a49997-39dd-4e53-878c-3cb63437fefe.mp3";

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "music-store-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("music settings", () => {
  it("defaults to disabled with looping enabled", () => {
    expect(getMusicSettings()).toEqual({ enabled: false, src: null, title: "", loop: true });
  });

  it("persists one canonical uploaded track", () => {
    expect(updateMusicSettings({ enabled: true, src: track, title: " Ngày chung đôi ", loop: false })).toEqual({ enabled: true, src: track, title: "Ngày chung đôi", loop: false });
    expect(getMusicSettings()).toEqual({ enabled: true, src: track, title: "Ngày chung đôi", loop: false });
  });

  it("cannot enable music without a saved track", () => {
    expect(updateMusicSettings({ enabled: true, src: null, title: "Không có file", loop: true })).toEqual({ enabled: false, src: null, title: "Không có file", loop: true });
  });

  it("rejects non-canonical audio sources", () => {
    expect(() => updateMusicSettings({ enabled: true, src: "https://example.com/song.mp3", title: "Remote", loop: true })).toThrow("Tệp nhạc không hợp lệ");
  });

  it("clears the singleton without touching other tables", () => {
    updateMusicSettings({ enabled: true, src: track, title: "Ngày chung đôi", loop: true });
    expect(clearMusicSettings()).toEqual({ enabled: false, src: null, title: "", loop: true });
  });
});
