import { getInvitationEventProfiles } from "@/lib/invitation-event-profile-store";
import { resolveInvitationEvents } from "@/lib/invitation-event-resolver";
import type { InvitationEventScope } from "@/lib/invitation-event-scope";
import type { InvitationContent } from "@/types/invitation-content";

/**
 * Social previews must resolve the same scoped event as the invitation page.
 * Incomplete profiles must not be substituted with another guest's date/venue.
 */
export function socialInvitationContent(
  content: InvitationContent,
  scope: InvitationEventScope,
  profiles = getInvitationEventProfiles(),
): InvitationContent {
  const resolved = resolveInvitationEvents(scope, profiles, content.event);
  if (!resolved.ok) {
    return { ...content, event: { ...content.event, dateLabel: "", venue: "" } };
  }

  if (scope === "both") {
    return {
      ...content,
      event: {
        ...resolved.primary,
        dateLabel: resolved.events.map((event) => event.dateLabel).join(" & "),
        venue: "",
      },
    };
  }

  return { ...content, event: resolved.primary };
}
