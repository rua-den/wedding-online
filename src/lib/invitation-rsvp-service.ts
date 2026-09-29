import { normalizeInvitationEventScope } from "./invitation-event-scope";
import type { DatedInvitationEventScope, InvitationEventProfiles } from "./invitation-event-profile-store";
import type { Invitation, StoredRsvp } from "./invitation-service";
import { validateRsvp, type Attendance } from "./rsvp";

export type StoredEventRsvp = StoredRsvp & { eventScope: DatedInvitationEventScope };

export type InvitationRsvpStore = {
  findInvitation(code: string): Promise<Invitation | null>;
  upsertLegacyRsvp(response: StoredRsvp): Promise<void>;
  upsertEventRsvp(response: StoredEventRsvp): Promise<void>;
};

type RsvpInput = {
  eventScope?: DatedInvitationEventScope;
  attendance: Attendance;
  guestCount: number;
  message: string;
};

type SubmissionResult = { ok: true } | { ok: false; status: 400 | 404; message: string };

export async function submitInvitationRsvp(
  code: string,
  input: RsvpInput,
  dependencies: {
    store: InvitationRsvpStore;
    eventProfiles: InvitationEventProfiles;
    legacyDeadline: Date;
    now: Date;
  },
): Promise<SubmissionResult> {
  const invitation = await dependencies.store.findInvitation(code);
  if (!invitation || !invitation.active) {
    return { ok: false, status: 404, message: "Không tìm thấy thiệp mời này." };
  }

  const assignment = normalizeInvitationEventScope(invitation.eventScope);

  if (assignment === "legacy") {
    if (input.eventScope) return { ok: false, status: 400, message: "Ngày xác nhận không thuộc thiệp mời này." };
    const validation = validateRsvp(input, {
      maxGuests: invitation.maxGuests,
      deadline: dependencies.legacyDeadline,
      now: dependencies.now,
    });
    if (!validation.ok) return { ok: false, status: 400, message: validation.message };
    await dependencies.store.upsertLegacyRsvp({ code, name: invitation.name, ...validation.value });
    return { ok: true };
  }

  if (!input.eventScope) return { ok: false, status: 400, message: "Vui lòng chọn đúng ngày tham dự." };
  if (assignment !== "both" && assignment !== input.eventScope) {
    return { ok: false, status: 400, message: "Ngày xác nhận không thuộc thiệp mời này." };
  }

  const profile = dependencies.eventProfiles[input.eventScope];
  if (!profile) {
    return { ok: false, status: 400, message: `Thông tin sự kiện ${input.eventScope === "oct11" ? "11/10" : "31/10"} chưa được cấu hình.` };
  }

  const validation = validateRsvp(input, {
    maxGuests: invitation.maxGuests,
    deadline: new Date(profile.rsvpDeadline),
    now: dependencies.now,
  });
  if (!validation.ok) return { ok: false, status: 400, message: validation.message };

  await dependencies.store.upsertEventRsvp({
    code,
    name: invitation.name,
    eventScope: input.eventScope,
    ...validation.value,
  });
  return { ok: true };
}
