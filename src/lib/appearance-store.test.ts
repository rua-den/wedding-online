import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase, closeDatabaseForTests } from "./sqlite";
import { getAppearanceSettings, resolveAppearanceThemeId, updateAppearanceSettings } from "./appearance-store";

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
  it("uses ivory-gold before any appearance has been saved", () => {
    expect(getAppearanceSettings()).toEqual({ themeId: "ivory-gold" });
  });

  it("persists a known preset", () => {
    expect(updateAppearanceSettings({ themeId: "midnight-gold" })).toEqual({ themeId: "midnight-gold" });
    expect(getAppearanceSettings()).toEqual({ themeId: "midnight-gold" });
  });

  it("lets a known preview override win without persisting it", () => {
    updateAppearanceSettings({ themeId: "sage-garden" });
    expect(resolveAppearanceThemeId("blush-rose")).toBe("blush-rose");
    expect(getAppearanceSettings()).toEqual({ themeId: "sage-garden" });
    expect(resolveAppearanceThemeId("not-a-theme")).toBe("sage-garden");
  });

  it("falls back safely when a stored preset is no longer known", () => {
    getAppearanceSettings();
    getDatabase().prepare("INSERT INTO appearance_settings (id, theme_id, updated_at) VALUES (1, ?, ?)")
      .run("removed-theme", new Date().toISOString());

    expect(getAppearanceSettings()).toEqual({ themeId: "ivory-gold", invalidStoredThemeId: "removed-theme" });
  });
});
