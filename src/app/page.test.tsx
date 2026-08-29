import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { updateAppearanceSettings } from "@/lib/appearance-store";
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
  it("passes persisted content and appearance to the invitation", async () => {
    updateSiteSettings({ venue: "Sảnh Hoa", mapsUrl: "https://maps.google.com/?q=Sanh+Hoa" });
    updateAppearanceSettings({ themeId: "sage-garden" });

    const page = await Home({ searchParams: Promise.resolve({}) });
    expect(page.props.themeId).toBe("sage-garden");
    expect(page.props.children.props.content.event.venue).toBe("Sảnh Hoa");
  });

  it("uses a valid preview theme without changing persisted appearance", async () => {
    updateAppearanceSettings({ themeId: "sage-garden" });

    const page = await Home({ searchParams: Promise.resolve({ previewTheme: "midnight-gold" }) });
    expect(page.props.themeId).toBe("midnight-gold");

    const persistedPage = await Home({ searchParams: Promise.resolve({}) });
    expect(persistedPage.props.themeId).toBe("sage-garden");
  });
});
