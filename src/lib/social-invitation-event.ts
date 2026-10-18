import type { InvitationContent } from "@/types/invitation-content";
import type { InvitationEventScope } from "./invitation-event-scope";
import type { InvitationEventProfiles } from "./invitation-event-profile-store";
import { resolveInvitationEvents } from "./invitation-event-resolver";

function canonicalDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Preview metadata and preview art must use the same event as the invitation.
 * Never substitute global (possibly unrelated) settings for a dated invitation.
 */
export function resolveSocialInvitationContent(
  content: InvitationContent,
  scope: InvitationEventScope,
  profiles: InvitationEventProfiles,
): InvitationContent {
  const resolved = resolveInvitationEvents(scope, profiles, content.event);
  if (!resolved.ok) {
    return { ...content, event: { ...content.event, dateLabel: "", venue: "" } };
  }
  const first = resolved.primary;
  const dateLabel = resolved.events.map((event) => canonicalDate(event.dateTime)).filter(Boolean).join(" & ");
  const venue = resolved.events.length === 1 ? first.venue : "";
  return { ...content, event: { ...first, dateLabel, venue } };
}
