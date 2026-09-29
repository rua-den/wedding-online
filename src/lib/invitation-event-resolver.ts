import type { InvitationEventScope } from "./invitation-event-scope";
import type { InvitationEventProfile, InvitationEventProfiles } from "./invitation-event-profile-store";
import type { InvitationContent } from "@/types/invitation-content";

export type ResolvedInvitationEvent = InvitationContent["event"] & { scope: InvitationEventScope };

export type ResolvedInvitationEvents =
  | { ok: true; primary: ResolvedInvitationEvent; events: ResolvedInvitationEvent[] }
  | { ok: false; message: string };

function asResolved(scope: "oct11" | "oct31", profile: InvitationEventProfile): ResolvedInvitationEvent {
  return { ...profile, scope };
}

function choosePrimary(events: ResolvedInvitationEvent[], now: Date): ResolvedInvitationEvent {
  const upcoming = events.find((event) => new Date(event.dateTime).getTime() >= now.getTime());
  return upcoming ?? events[events.length - 1]!;
}

export function resolveInvitationEvents(
  scope: InvitationEventScope,
  profiles: InvitationEventProfiles,
  legacyEvent: InvitationContent["event"],
  now = new Date(),
): ResolvedInvitationEvents {
  if (scope === "legacy") {
    const event: ResolvedInvitationEvent = { ...legacyEvent, scope: "legacy" };
    return { ok: true, primary: event, events: [event] };
  }

  if (scope === "oct11") {
    if (!profiles.oct11) return { ok: false, message: "Thông tin sự kiện 11/10 chưa được cấu hình." };
    const event = asResolved("oct11", profiles.oct11);
    return { ok: true, primary: event, events: [event] };
  }

  if (scope === "oct31") {
    if (!profiles.oct31) return { ok: false, message: "Thông tin sự kiện 31/10 chưa được cấu hình." };
    const event = asResolved("oct31", profiles.oct31);
    return { ok: true, primary: event, events: [event] };
  }

  if (!profiles.oct11 || !profiles.oct31) {
    return { ok: false, message: "Thiệp hai ngày chưa được cấu hình đầy đủ 11/10 và 31/10." };
  }

  const events = [asResolved("oct11", profiles.oct11), asResolved("oct31", profiles.oct31)];
  return { ok: true, primary: choosePrimary(events, now), events };
}
