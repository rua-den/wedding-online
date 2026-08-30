import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { updateAppearanceSettings } from "@/lib/appearance-store";
import { updateMusicSettings } from "@/lib/music-store";
import { updateSiteSettings } from "@/lib/site-settings";
import { closeDatabaseForTests } from "@/lib/sqlite";
import Home from "./page";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "home-settings-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("home page settings", () => {
  it("passes persisted content, appearance and music to the invitation", async () => {
    updateSiteSettings({ venue: "Sảnh Hoa", mapsUrl: "https://maps.google.com/?q=Sanh+Hoa" });
    updateAppearanceSettings({ themeId: "sage-garden", fontId: "lora" });
    updateMusicSettings({ enabled: true, src: "/uploads/1788039145650-f2a49997-39dd-4e53-878c-3cb63437fefe.mp3", title: "Ngày chung đôi", loop: true });

    const page = await Home({ searchParams: Promise.resolve({}) });
    expect(page.props.themeId).toBe("sage-garden");
    expect(page.props.fontId).toBe("lora");
    const children = Array.isArray(page.props.children) ? page.props.children : [page.props.children];
    expect(children[0].props.content.event.venue).toBe("Sảnh Hoa");
    expect(children[1].props.settings).toMatchObject({ enabled: true, title: "Ngày chung đôi" });
  });

  it("uses valid preview appearance without changing persisted settings", async () => {
    updateAppearanceSettings({ themeId: "sage-garden", fontId: "lora" });

    const page = await Home({ searchParams: Promise.resolve({ previewTheme: "midnight-gold", previewFont: "playfair-display" }) });
    expect(page.props.themeId).toBe("midnight-gold");
    expect(page.props.fontId).toBe("playfair-display");

    const persistedPage = await Home({ searchParams: Promise.resolve({}) });
    expect(persistedPage.props.themeId).toBe("sage-garden");
    expect(persistedPage.props.fontId).toBe("lora");
  });
});
