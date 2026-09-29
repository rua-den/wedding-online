import type { DatedInvitationEventScope } from "./invitation-event-profile-store";
import type { InvitationRsvpStore, StoredEventRsvp } from "./invitation-rsvp-service";
import type { Attendance } from "./rsvp";
import { getDatabase, initializeDatabase } from "./sqlite";
import { sqliteInvitationStore } from "./sqlite-store";

export type StoredEventRsvpRow = {
  code: string;
  eventScope: DatedInvitationEventScope;
  attendance: Attendance;
  guestCount: number;
  message: string;
  createdAt: string;
  updatedAt: string;
};

function database() {
  initializeDatabase();
  return getDatabase();
}

async function upsertEventRsvp(response: StoredEventRsvp): Promise<void> {
  const connection = database();
  const existing = connection
    .prepare("SELECT created_at, updated_at FROM event_rsvps WHERE invitation_code = ? AND event_scope = ?")
    .get(response.code, response.eventScope) as { created_at: string; updated_at: string } | undefined;
  const nowValue = Date.now();
  const previousValue = existing ? Date.parse(existing.updated_at) : 0;
  const now = new Date(Math.max(nowValue, previousValue + 1)).toISOString();

  connection.prepare(`
    INSERT INTO event_rsvps (invitation_code, event_scope, attendance, guest_count, message, created_at, updated_at)
    VALUES (@code, @eventScope, @attendance, @guestCount, @message, @now, @now)
    ON CONFLICT(invitation_code, event_scope) DO UPDATE SET
      attendance = excluded.attendance,
      guest_count = excluded.guest_count,
      message = excluded.message,
      updated_at = excluded.updated_at
  `).run({
    code: response.code,
    eventScope: response.eventScope,
    attendance: response.attendance,
    guestCount: response.guestCount,
    message: response.message,
    now,
  });
}

export const sqliteInvitationRsvpStore: InvitationRsvpStore = {
  findInvitation: sqliteInvitationStore.findInvitation,
  upsertLegacyRsvp: sqliteInvitationStore.upsertRsvp,
  upsertEventRsvp,
};

export function listEventRsvpsForInvitation(code: string): StoredEventRsvpRow[] {
  const rows = database().prepare(`
    SELECT invitation_code AS code, event_scope, attendance, guest_count, message, created_at, updated_at
    FROM event_rsvps
    WHERE invitation_code = ?
    ORDER BY CASE event_scope WHEN 'oct11' THEN 1 ELSE 2 END
  `).all(code) as Array<{
    code: string;
    event_scope: DatedInvitationEventScope;
    attendance: Attendance;
    guest_count: number;
    message: string;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    code: row.code,
    eventScope: row.event_scope,
    attendance: row.attendance,
    guestCount: row.guest_count,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
