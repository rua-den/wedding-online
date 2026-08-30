import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase, closeDatabaseForTests } from "./sqlite";
import { getAppearanceSettings, resolveAppearanceSettings, updateAppearanceSettings } from "./appearance-store";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "appearance-store-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("appearance settings", () => {
  it("uses original theme and font before an admin saves appearance", () => {
    expect(getAppearanceSettings()).toEqual({ themeId: "ivory-gold", fontId: "classic-serif" });
  });

  it("persists known theme and font presets", () => {
    expect(updateAppearanceSettings({ themeId: "midnight-gold", fontId: "playfair-display" })).toEqual({
      themeId: "midnight-gold",
      fontId: "playfair-display",
    });
    expect(getAppearanceSettings()).toEqual({ themeId: "midnight-gold", fontId: "playfair-display" });
  });

  it("lets valid preview values win without persisting them", () => {
    updateAppearanceSettings({ themeId: "sage-garden", fontId: "lora" });
    expect(resolveAppearanceSettings({ previewTheme: "blush-rose", previewFont: "cormorant-garamond" })).toEqual({
      themeId: "blush-rose",
      fontId: "cormorant-garamond",
    });
    expect(getAppearanceSettings()).toEqual({ themeId: "sage-garden", fontId: "lora" });
    expect(resolveAppearanceSettings({ previewTheme: "not-a-theme", previewFont: "not-a-font" })).toEqual({
      themeId: "sage-garden",
      fontId: "lora",
    });
  });

  it("falls back safely when stored presets are no longer known", () => {
    getAppearanceSettings();
    getDatabase().prepare("INSERT INTO appearance_settings (id, theme_id, font_id, updated_at) VALUES (1, ?, ?, ?)")
      .run("removed-theme", "removed-font", new Date().toISOString());

    expect(getAppearanceSettings()).toEqual({
      themeId: "ivory-gold",
      fontId: "classic-serif",
      invalidStoredThemeId: "removed-theme",
      invalidStoredFontId: "removed-font",
    });
  });
});
