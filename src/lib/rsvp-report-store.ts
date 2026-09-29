import type { InvitationEventScope } from "./invitation-event-scope";
import type { Attendance } from "./rsvp";
import { getDatabase, initializeDatabase } from "./sqlite";
import {
  deleteAdminInvitation,
  type AdminInvitation,
  type AdminSummary,
  type DeletedAdminInvitation,
} from "./sqlite-store";

export type AdminRsvpTarget = {
  code: string;
  name: string;
  guestName: string;
  maxGuests: number;
  active: boolean;
  eventScope: InvitationEventScope;
  attendance: Attendance | null;
  guestCount: number | null;
  message: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type TargetRow = {
  code: string;
  name: string;
  max_guests: number;
  active: number;
  event_scope: InvitationEventScope;
  attendance: Attendance | null;
  guest_count: number | null;
  message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type InvitationAggregateRow = {
  code: string;
  name: string;
  max_guests: number;
  active: number;
  event_scope: InvitationEventScope;
  created_at: string;
  updated_at: string;
  attendance: Attendance | null;
  guest_count: number | null;
  rsvp_updated_at: string | null;
};

function database() {
  initializeDatabase();
  return getDatabase();
}

const targetCte = `
  WITH targets AS (
    SELECT i.code, i.name, i.max_guests, i.active, 'legacy' AS event_scope, i.created_at AS invitation_created_at
    FROM invitations i WHERE i.event_scope = 'legacy'
    UNION ALL
    SELECT i.code, i.name, i.max_guests, i.active, 'oct11' AS event_scope, i.created_at AS invitation_created_at
    FROM invitations i WHERE i.event_scope IN ('oct11', 'both')
    UNION ALL
    SELECT i.code, i.name, i.max_guests, i.active, 'oct31' AS event_scope, i.created_at AS invitation_created_at
    FROM invitations i WHERE i.event_scope IN ('oct31', 'both')
  ),
  responses AS (
    SELECT invitation_code AS code, 'legacy' AS event_scope, attendance, guest_count, message, created_at, updated_at FROM rsvps
    UNION ALL
    SELECT invitation_code AS code, event_scope, attendance, guest_count, message, created_at, updated_at FROM event_rsvps
  )
`;

function scopeSuffix(scope: InvitationEventScope): string {
  if (scope === "oct11") return " · 11/10";
  if (scope === "oct31") return " · 31/10";
  return "";
}

export function listAdminRsvpTargets(filters: { query?: string; status?: Attendance | "pending" } = {}): AdminRsvpTarget[] {
  const search = `%${filters.query?.trim() ?? ""}%`;
  const status = filters.status ?? "";
  const rows = database().prepare(`${targetCte}
    SELECT t.code, t.name, t.max_guests, t.active, t.event_scope,
           r.attendance, r.guest_count, r.message, r.created_at, r.updated_at
    FROM targets t
    LEFT JOIN responses r ON r.code = t.code AND r.event_scope = t.event_scope
    WHERE (? = '%%' OR t.name LIKE ? COLLATE NOCASE OR t.code LIKE ? COLLATE NOCASE)
      AND (
        ? = '' OR
        (? = 'pending' AND r.code IS NULL) OR
        r.attendance = ?
      )
    ORDER BY COALESCE(r.updated_at, t.invitation_created_at) DESC,
             t.code,
             CASE t.event_scope WHEN 'legacy' THEN 0 WHEN 'oct11' THEN 1 ELSE 2 END
  `).all(search, search, search, status, status, status) as TargetRow[];

  return rows.map((row) => ({
    code: row.code,
    name: `${row.name}${scopeSuffix(row.event_scope)}`,
    guestName: row.name,
    maxGuests: row.max_guests,
    active: row.active === 1,
    eventScope: row.event_scope,
    attendance: row.attendance,
    guestCount: row.guest_count,
    message: row.message ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function listAdminInvitationsWithResponses(query = ""): AdminInvitation[] {
  const search = `%${query.trim()}%`;
  const rows = database().prepare(`
    WITH responses AS (
      SELECT invitation_code AS code, 'legacy' AS event_scope, attendance, guest_count, updated_at FROM rsvps
      UNION ALL
      SELECT invitation_code AS code, event_scope, attendance, guest_count, updated_at FROM event_rsvps
    )
    SELECT i.code, i.name, i.max_guests, i.active, i.event_scope, i.created_at, i.updated_at,
           CASE
             WHEN COUNT(r.code) = 0 THEN NULL
             WHEN SUM(CASE WHEN r.attendance = 'attending' THEN 1 ELSE 0 END) > 0 THEN 'attending'
             ELSE 'declined'
           END AS attendance,
           CASE WHEN COUNT(r.code) = 0 THEN NULL ELSE COALESCE(SUM(r.guest_count), 0) END AS guest_count,
           MAX(r.updated_at) AS rsvp_updated_at
    FROM invitations i
    LEFT JOIN responses r ON r.code = i.code AND (
      (i.event_scope = 'legacy' AND r.event_scope = 'legacy') OR
      (i.event_scope = 'oct11' AND r.event_scope = 'oct11') OR
      (i.event_scope = 'oct31' AND r.event_scope = 'oct31') OR
      (i.event_scope = 'both' AND r.event_scope IN ('oct11', 'oct31'))
    )
    WHERE ? = '%%' OR i.name LIKE ? COLLATE NOCASE OR i.code LIKE ? COLLATE NOCASE
    GROUP BY i.code, i.name, i.max_guests, i.active, i.event_scope, i.created_at, i.updated_at, i.id
    ORDER BY i.created_at DESC, i.id DESC
  `).all(search, search, search) as InvitationAggregateRow[];

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    maxGuests: row.max_guests,
    active: row.active === 1,
    eventScope: row.event_scope,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attendance: row.attendance,
    guestCount: row.guest_count,
    rsvpUpdatedAt: row.rsvp_updated_at,
  }));
}

export function getAdminRsvpSummary(): AdminSummary {
  return database().prepare(`${targetCte}
    SELECT
      (SELECT COUNT(*) FROM invitations) AS invitationCount,
      COUNT(r.code) AS respondedCount,
      COALESCE(SUM(CASE WHEN r.attendance = 'attending' THEN 1 ELSE 0 END), 0) AS attendingCount,
      COALESCE(SUM(CASE WHEN r.attendance = 'declined' THEN 1 ELSE 0 END), 0) AS declinedCount,
      COALESCE(SUM(CASE WHEN r.code IS NULL THEN 1 ELSE 0 END), 0) AS pendingCount,
      COALESCE(SUM(CASE WHEN r.attendance = 'attending' THEN r.guest_count ELSE 0 END), 0) AS confirmedGuestCount
    FROM targets t
    LEFT JOIN responses r ON r.code = t.code AND r.event_scope = t.event_scope
  `).get() as AdminSummary;
}

export function deleteAdminInvitationWithResponses(code: string): DeletedAdminInvitation {
  const hadEventRsvp = Boolean(database().prepare("SELECT 1 FROM event_rsvps WHERE invitation_code = ? LIMIT 1").get(code));
  const deleted = deleteAdminInvitation(code);
  return { ...deleted, hadRsvp: deleted.hadRsvp || hadEventRsvp };
}

export function getRsvpTargetExportRows(): AdminRsvpTarget[] {
  return listAdminRsvpTargets();
}
