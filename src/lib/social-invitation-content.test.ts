import { describe, expect, it } from "vitest";
import { defaultInvitationContent } from "@/config/invitation-content";
import type { InvitationEventProfile, InvitationEventProfiles } from "./invitation-event-profile-store";
import { socialInvitationContent } from "./social-invitation-content";

const source = defaultInvitationContent();
const profile = (scope: "oct11" | "oct31"): InvitationEventProfile => ({
  ...source.event,
  scope,
  dateTime: scope === "oct11" ? "2026-10-11T10:00:00+07:00" : "2026-10-31T10:00:00+07:00",
  dateLabel: scope === "oct11" ? "11/10/2026" : "31/10/2026",
  venue: scope === "oct11" ? "Sảnh 11" : "Sảnh 31",
});
const profiles: InvitationEventProfiles = { oct11: profile("oct11"), oct31: profile("oct31") };

describe("social invitation content", () => {
  it("keeps 11/10 invitations separate from the global 31/10 event", () => {
    const global = { ...source, event: { ...source.event, dateLabel: "Chủ Nhật, 31/10/2026", venue: "Wrong venue" } };
    const preview = socialInvitationContent(global, "oct11", profiles);
    expect(preview.event.dateLabel).toMatch(/Chủ Nhật.*11\/10\/2026/i);
    expect(preview.event.venue).toBe("Sảnh 11");
  });

  it("shows Saturday for 31/10/2026 and the assigned venue", () => {
    const preview = socialInvitationContent(source, "oct31", profiles);
    expect(preview.event.dateLabel).toMatch(/Thứ Bảy.*31\/10\/2026/i);
    expect(preview.event.venue).toBe("Sảnh 31");
  });

  it("shows both dates without misleading guests with one venue", () => {
    const preview = socialInvitationContent(source, "both", profiles);
    expect(preview.event.dateLabel).toContain("11/10/2026");
    expect(preview.event.dateLabel).toContain("31/10/2026");
    expect(preview.event.venue).toBe("");
  });

  it("does not fall back to a wrong global event when a required profile is absent", () => {
    const preview = socialInvitationContent(source, "oct31", { ...profiles, oct31: null });
    expect(preview.event.dateLabel).toBe("");
    expect(preview.event.venue).toBe("");
  });

  it("does not change the legacy event source date", () => {
    const preview = socialInvitationContent(source, "legacy", profiles);
    expect(preview.event.dateLabel).toContain("19/12/2027");
  });
});
