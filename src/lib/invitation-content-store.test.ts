import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { CURRENT_INVITATION_CONTENT_SCHEMA_VERSION } from "./invitation-content-migrations";
import { closeDatabaseForTests, getDatabase } from "./sqlite";
import { getInvitationContent, invitationContentSchema, updateInvitationContent } from "./invitation-content-store";

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

function contentRow() {
  return getDatabase()
    .prepare("SELECT content_json, schema_version FROM invitation_content WHERE id = 1")
    .get() as { content_json: string; schema_version: number } | undefined;
}

describe("invitation content store", () => {
  it("falls back to config copy before an admin saves overrides", () => {
    const content = getInvitationContent();
    expect(content.couple.shortGroomName).toBe("Huy");
    expect(content.story.milestones.length).toBeGreaterThan(0);
    expect(content.story.milestones[0]?.imageSrc).toBeNull();
  });

  it("migrates a legacy v1 row in memory without rewriting it", () => {
    getInvitationContent();
    const legacy = defaultInvitationContent() as unknown as Record<string, unknown>;
    const story = legacy.story as { milestones: Array<Record<string, unknown>> };
    delete story.milestones[0]?.imageSrc;
    (legacy.couple as Record<string, unknown>).shortGroomName = "Anh";

    getDatabase().prepare(`
      INSERT INTO invitation_content (id, content_json, schema_version, updated_at)
      VALUES (1, ?, 1, ?)
    `).run(JSON.stringify(legacy), new Date().toISOString());

    const migrated = getInvitationContent();
    expect(migrated.couple.shortGroomName).toBe("Anh");
    expect(migrated.story.milestones[0]?.imageSrc).toBeNull();
    expect(contentRow()?.schema_version).toBe(1);
  });

  it("persists editable content at the current schema version", () => {
    const content = defaultInvitationContent();
    content.couple.shortGroomName = "Anh";
    content.cover.message = "Lời mời mới";
    content.event.venue = "Sảnh Mới";
    content.event.address = "99 Đường Mới";
    content.event.mapsUrl = "https://www.google.com/maps?q=Sanh+Moi";
    content.story.milestones = [{
      date: "2026",
      title: "Gặp nhau",
      description: "Một câu chuyện mới.",
      imageSrc: "/uploads/1788039145650-f2a49997-39dd-4e53-878c-3cb63437fefe.png",
    }];

    const saved = updateInvitationContent(content);
    expect(saved.couple.shortGroomName).toBe("Anh");
    expect(saved.cover.message).toBe("Lời mời mới");
    expect(saved.event.venue).toBe("Sảnh Mới");
    expect(getInvitationContent().story.milestones).toEqual(content.story.milestones);
    expect(contentRow()?.schema_version).toBe(CURRENT_INVITATION_CONTENT_SCHEMA_VERSION);
  });

  it("advances a migrated legacy row only when it is saved", () => {
    getInvitationContent();
    const legacy = defaultInvitationContent() as unknown as Record<string, unknown>;
    const story = legacy.story as { milestones: Array<Record<string, unknown>> };
    delete story.milestones[0]?.imageSrc;
    getDatabase().prepare(`
      INSERT INTO invitation_content (id, content_json, schema_version, updated_at)
      VALUES (1, ?, 1, ?)
    `).run(JSON.stringify(legacy), new Date().toISOString());

    const migrated = getInvitationContent();
    expect(contentRow()?.schema_version).toBe(1);
    updateInvitationContent(migrated);
    expect(contentRow()?.schema_version).toBe(CURRENT_INVITATION_CONTENT_SCHEMA_VERSION);
  });

  it("does not downgrade or overwrite a future schema version", () => {
    getInvitationContent();
    const futureJson = JSON.stringify({ future: true });
    getDatabase().prepare(`
      INSERT INTO invitation_content (id, content_json, schema_version, updated_at)
      VALUES (1, ?, 99, ?)
    `).run(futureJson, new Date().toISOString());

    expect(getInvitationContent().couple.shortGroomName).toBe("Huy");
    expect(contentRow()).toMatchObject({ content_json: futureJson, schema_version: 99 });
    expect(() => updateInvitationContent(defaultInvitationContent())).toThrow("schema version 99");
    expect(contentRow()).toMatchObject({ content_json: futureJson, schema_version: 99 });
  });

  it("does not mutate malformed stored JSON during read", () => {
    getInvitationContent();
    getDatabase().prepare(`
      INSERT INTO invitation_content (id, content_json, schema_version, updated_at)
      VALUES (1, ?, 1, ?)
    `).run("{broken", new Date().toISOString());

    expect(getInvitationContent().couple.shortGroomName).toBe("Huy");
    expect(contentRow()).toMatchObject({ content_json: "{broken", schema_version: 1 });
  });

  it("keeps the current schema compatible with milestones that omit imageSrc", () => {
    const content = defaultInvitationContent() as unknown as Record<string, unknown>;
    const story = content.story as { milestones: Array<Record<string, unknown>> };
    delete story.milestones[0]?.imageSrc;
    const migrated = getInvitationContent();
    expect(migrated.story.milestones[0]?.imageSrc).toBeNull();
    expect(invitationContentSchema.safeParse(content).success).toBe(true);
  });

  it("rejects unsafe maps URLs", () => {
    const content = defaultInvitationContent();
    content.event.mapsUrl = "https://example.com/venue";
    expect(() => updateInvitationContent(content)).toThrow("Google Maps");
  });
});
