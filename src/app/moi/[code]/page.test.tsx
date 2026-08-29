import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { updateSiteSettings } from "@/lib/site-settings";
import { closeDatabaseForTests } from "@/lib/sqlite";
import PersonalInvitationPage from "./page";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "personal-settings-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("personal invitation page settings", () => {
  it("passes the same persisted settings to personalized invitations", async () => {
    updateSiteSettings({ venue: "Sảnh Hoa", mapsUrl: "https://maps.google.com/?q=Sanh+Hoa" });

    const page = await PersonalInvitationPage({ params: Promise.resolve({ code: "demo" }) });
    expect(page.props.settings).toMatchObject({ venue: "Sảnh Hoa" });
  });
});
