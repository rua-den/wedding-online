import { createInvitationCode } from "./invite-code";
import type { Invitation, InvitationStore, StoredRsvp } from "./invitation-service";
import type { Attendance } from "./rsvp";
import { getDatabase, initializeDatabase } from "./sqlite";

export type AdminInvitation = Invitation & {
  createdAt: string;
  updatedAt: string;
  attendance: Attendance | null;
  guestCount: number | null;
  rsvpUpdatedAt: string | null;
};

export type AdminRsvp = {
  code: string;
  name: string;
  maxGuests: number;
  active: boolean;
  attendance: Attendance | null;
  guestCount: number | null;
  message: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminSummary = {
  invitationCount: number;
  respondedCount: number;
  attendingCount: number;
  declinedCount: number;
  pendingCount: number;
  confirmedGuestCount: number;
};

export class InvitationCodeConflictError extends Error {}
export class InvitationNotFoundError extends Error {}

type InvitationRow = {
  code: string;
  name: string;
  max_guests: number;
  active: number;
  created_at: string;
  updated_at: string;
  attendance?: Attendance | null;
  guest_count?: number | null;
  rsvp_updated_at?: string | null;
};

type RsvpRow = {
  code: string;
  name: string;
  max_guests: number;
  active: number;
  attendance: Attendance | null;
  guest_count: number | null;
  message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function database() {
  initializeDatabase();
  return getDatabase();
}

function mapInvitation(row: InvitationRow): AdminInvitation {
  return {
    code: row.code,
    name: row.name,
    maxGuests: row.max_guests,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attendance: row.attendance ?? null,
    guestCount: row.guest_count ?? null,
    rsvpUpdatedAt: row.rsvp_updated_at ?? null,
  };
}

function mapRsvp(row: RsvpRow): AdminRsvp {
  return {
    code: row.code,
    name: row.name,
    maxGuests: row.max_guests,
    active: row.active === 1,
    attendance: row.attendance,
    guestCount: row.guest_count,
    message: row.message ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const sqliteInvitationStore: InvitationStore = {
  async findInvitation(code) {
    const row = database()
      .prepare(`
        SELECT code, name, max_guests, active, created_at, updated_at
        FROM invitations
        WHERE code = ? AND active = 1
      `)
      .get(code) as InvitationRow | undefined;

    return row ? mapInvitation(row) : null;
  },

  async upsertRsvp(response: StoredRsvp) {
    const connection = database();
    const existing = connection
      .prepare("SELECT created_at, updated_at FROM rsvps WHERE invitation_code = ?")
      .get(response.code) as { created_at: string; updated_at: string } | undefined;
    const nowValue = Date.now();
    const previousValue = existing ? Date.parse(existing.updated_at) : 0;
    const now = new Date(Math.max(nowValue, previousValue + 1)).toISOString();

    connection
      .prepare(`
        INSERT INTO rsvps (invitation_code, attendance, guest_count, message, created_at, updated_at)
        VALUES (@code, @attendance, @guestCount, @message, @now, @now)
        ON CONFLICT(invitation_code) DO UPDATE SET
          attendance = excluded.attendance,
          guest_count = excluded.guest_count,
          message = excluded.message,
          updated_at = excluded.updated_at
      `)
      .run({
        code: response.code,
        attendance: response.attendance,
        guestCount: response.guestCount,
        message: response.message,
        now,
      });
  },
};

export function listAdminInvitations(query = ""): AdminInvitation[] {
  const search = `%${query.trim()}%`;
  const rows = database()
    .prepare(`
      SELECT i.code, i.name, i.max_guests, i.active, i.created_at, i.updated_at,
             r.attendance, r.guest_count, r.updated_at AS rsvp_updated_at
      FROM invitations i
      LEFT JOIN rsvps r ON r.invitation_code = i.code
      WHERE ? = '%%' OR i.name LIKE ? COLLATE NOCASE OR i.code LIKE ? COLLATE NOCASE
      ORDER BY i.created_at DESC, i.id DESC
    `)
    .all(search, search, search) as InvitationRow[];
  return rows.map(mapInvitation);
}

export function createAdminInvitation(input: {
  name: string;
  maxGuests: number;
  code?: string;
}): AdminInvitation {
  const connection = database();
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = input.code?.trim() || createInvitationCode();
    try {
      connection
        .prepare(`
          INSERT INTO invitations (code, name, max_guests, active, created_at, updated_at)
          VALUES (?, ?, ?, 1, ?, ?)
        `)
        .run(code, input.name.trim(), input.maxGuests, now, now);
      return listAdminInvitations(code).find((row) => row.code === code)!;
    } catch (error) {
      const duplicate = error instanceof Error && error.message.includes("UNIQUE constraint failed");
      if (!duplicate || input.code || attempt === 4) {
        if (duplicate) throw new InvitationCodeConflictError("Mã thiệp mời đã tồn tại.");
        throw error;
      }
    }
  }

  throw new InvitationCodeConflictError("Không thể tạo mã thiệp mời duy nhất.");
}

export function updateAdminInvitation(input: {
  code: string;
  name?: string;
  maxGuests?: number;
  active?: boolean;
}): AdminInvitation {
  const connection = database();
  const current = connection
    .prepare("SELECT code, name, max_guests, active, created_at, updated_at FROM invitations WHERE code = ?")
    .get(input.code) as InvitationRow | undefined;

  if (!current) throw new InvitationNotFoundError("Không tìm thấy thiệp mời này.");

  connection
    .prepare(`
      UPDATE invitations
      SET name = ?, max_guests = ?, active = ?, updated_at = ?
      WHERE code = ?
    `)
    .run(
      input.name?.trim() ?? current.name,
      input.maxGuests ?? current.max_guests,
      input.active === undefined ? current.active : Number(input.active),
      new Date().toISOString(),
      input.code,
    );

  return listAdminInvitations(input.code).find((row) => row.code === input.code)!;
}

export function listAdminRsvps(filters: {
  query?: string;
  status?: Attendance | "pending";
} = {}): AdminRsvp[] {
  const search = `%${filters.query?.trim() ?? ""}%`;
  const status = filters.status ?? "";
  const rows = database()
    .prepare(`
      SELECT i.code, i.name, i.max_guests, i.active,
             r.attendance, r.guest_count, r.message, r.created_at, r.updated_at
      FROM invitations i
      LEFT JOIN rsvps r ON r.invitation_code = i.code
      WHERE (? = '%%' OR i.name LIKE ? COLLATE NOCASE OR i.code LIKE ? COLLATE NOCASE)
        AND (
          ? = '' OR
          (? = 'pending' AND r.id IS NULL) OR
          r.attendance = ?
        )
      ORDER BY COALESCE(r.updated_at, i.created_at) DESC, i.id DESC
    `)
    .all(search, search, search, status, status, status) as RsvpRow[];
  return rows.map(mapRsvp);
}

export function getAdminSummary(): AdminSummary {
  return database()
    .prepare(`
      SELECT
        COUNT(i.id) AS invitationCount,
        COUNT(r.id) AS respondedCount,
        COALESCE(SUM(CASE WHEN r.attendance = 'attending' THEN 1 ELSE 0 END), 0) AS attendingCount,
        COALESCE(SUM(CASE WHEN r.attendance = 'declined' THEN 1 ELSE 0 END), 0) AS declinedCount,
        COALESCE(SUM(CASE WHEN r.id IS NULL THEN 1 ELSE 0 END), 0) AS pendingCount,
        COALESCE(SUM(CASE WHEN r.attendance = 'attending' THEN r.guest_count ELSE 0 END), 0) AS confirmedGuestCount
      FROM invitations i
      LEFT JOIN rsvps r ON r.invitation_code = i.code
    `)
    .get() as AdminSummary;
}

export function getRsvpExportRows(): AdminRsvp[] {
  return listAdminRsvps();
}
