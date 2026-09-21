import { describe, expect, it } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { invitationContentSchema } from "./invitation-content-store";
import {
  INVITATION_DISPLAY_FONT_FAMILY,
  normalizeTextScale,
  scaledTextStyle,
} from "./invitation-typography";

describe("invitation typography", () => {
  it("keeps legacy or missing text scales at the original design size and selected display font", () => {
    expect(normalizeTextScale(undefined)).toBe(100);
    expect(scaledTextStyle(undefined)).toEqual({
      fontFamily: INVITATION_DISPLAY_FONT_FAMILY,
      fontSize: "1em",
    });
  });

  it("accepts supported persisted scales and rejects out-of-range values", () => {
    const content = defaultInvitationContent();
    content.fontScales = { "cover.message": 165 };
    content.story.milestones[0]!.titleFontScale = 180;
    expect(invitationContentSchema.safeParse(content).success).toBe(true);

    content.fontScales["cover.message"] = 205;
    expect(invitationContentSchema.safeParse(content).success).toBe(false);
  });
});
