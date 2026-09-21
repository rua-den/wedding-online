import { describe, expect, it } from "vitest";

import { CURRENT_INVITATION_CONTENT_SCHEMA_VERSION, migrateInvitationContent } from "./invitation-content-migrations";

describe("invitation content typography migration", () => {
  it("adds neutral font scales when migrating v5 content", () => {
    const migrated = migrateInvitationContent({
      story: { milestones: [{ date: "2026", title: "Gặp nhau", description: "Ngày đầu tiên" }] },
    }, 5);

    expect(migrated.version).toBe(CURRENT_INVITATION_CONTENT_SCHEMA_VERSION);
    expect(migrated.content).toMatchObject({
      fontScales: {},
      story: {
        milestones: [{ dateFontScale: 100, titleFontScale: 100, descriptionFontScale: 100 }],
      },
    });
  });

  it("preserves already stored typography overrides during migration", () => {
    const migrated = migrateInvitationContent({
      fontScales: { "cover.message": 145 },
      story: { milestones: [{ titleFontScale: 165 }] },
    }, 5);

    expect(migrated.content).toMatchObject({
      fontScales: { "cover.message": 145 },
      story: { milestones: [{ titleFontScale: 165, dateFontScale: 100, descriptionFontScale: 100 }] },
    });
  });
});
