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

  const label = (dateTime: string) => new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(dateTime));

  if (scope === "both") {
    return {
      ...content,
      event: {
        ...resolved.primary,
        dateLabel: resolved.events.map((event) => label(event.dateTime)).join(" & "),
        venue: "",
      },
    };
  }

  return { ...content, event: { ...resolved.primary, dateLabel: label(resolved.primary.dateTime) } };
}
