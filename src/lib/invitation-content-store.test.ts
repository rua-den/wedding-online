import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { closeDatabaseForTests } from "./sqlite";
import { getInvitationContent, updateInvitationContent } from "./invitation-content-store";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "invitation-content-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("invitation content store", () => {
  it("falls back to config copy before an admin saves overrides", () => {
    const content = getInvitationContent();
    expect(content.couple.shortGroomName).toBe("Huy");
    expect(content.story.milestones.length).toBeGreaterThan(0);
  });

  it("persists editable section content and event settings", () => {
    const content = defaultInvitationContent();
    content.couple.shortGroomName = "Anh";
    content.cover.message = "Lời mời mới";
    content.event.venue = "Sảnh Mới";
    content.event.address = "99 Đường Mới";
    content.event.mapsUrl = "https://www.google.com/maps?q=Sanh+Moi";
    content.story.milestones = [{ date: "2026", title: "Gặp nhau", description: "Một câu chuyện mới." }];

    const saved = updateInvitationContent(content);
    expect(saved.couple.shortGroomName).toBe("Anh");
    expect(saved.cover.message).toBe("Lời mời mới");
    expect(saved.event.venue).toBe("Sảnh Mới");
    expect(getInvitationContent().story.milestones).toEqual(content.story.milestones);
  });

  it("rejects unsafe maps URLs", () => {
    const content = defaultInvitationContent();
    content.event.mapsUrl = "https://example.com/venue";
    expect(() => updateInvitationContent(content)).toThrow("Google Maps");
  });
});
