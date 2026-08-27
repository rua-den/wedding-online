import { validateRsvp, type Attendance } from "./rsvp";

export type Invitation = {
  code: string;
  name: string;
  maxGuests: number;
  active: boolean;
};

export type StoredRsvp = {
  code: string;
  name: string;
  attendance: Attendance;
  guestCount: number;
  message: string;
};

export type InvitationStore = {
  findInvitation(code: string): Promise<Invitation | null>;
  upsertRsvp(response: StoredRsvp): Promise<void>;
};

type InvitationLookup =
  | { ok: true; invitation: { guestName: string; maxGuests: number } }
  | { ok: false; status: 404; message: string };

type SubmissionResult = { ok: true } | { ok: false; status: 400 | 404; message: string };

export async function getInvitation(code: string, store: InvitationStore): Promise<InvitationLookup> {
  const invitation = await store.findInvitation(code);

  if (!invitation || !invitation.active) {
    return { ok: false, status: 404, message: "Không tìm thấy thiệp mời này." };
  }

  return { ok: true, invitation: { guestName: invitation.name, maxGuests: invitation.maxGuests } };
}

export async function submitRsvp(
  code: string,
  input: { attendance: Attendance; guestCount: number; message: string },
  dependencies: { store: InvitationStore; deadline: Date; now: Date },
): Promise<SubmissionResult> {
  const invitation = await dependencies.store.findInvitation(code);

  if (!invitation || !invitation.active) {
    return { ok: false, status: 404, message: "Không tìm thấy thiệp mời này." };
  }

  const validation = validateRsvp(input, {
    maxGuests: invitation.maxGuests,
    deadline: dependencies.deadline,
    now: dependencies.now,
  });

  if (!validation.ok) {
    return { ok: false, status: 400, message: validation.message };
  }

  await dependencies.store.upsertRsvp({ code, name: invitation.name, ...validation.value });
  return { ok: true };
}
