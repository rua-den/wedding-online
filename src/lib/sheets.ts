import { google } from "googleapis";

import type { InvitationStore, StoredRsvp } from "./invitation-service";

const INVITATION_COLUMNS = "Invitations!A2:D";
const RSVP_COLUMNS = "RSVPs!A2:G";
const rsvpLocks = new Map<string, Promise<void>>();

async function withRsvpLock<T>(code: string, operation: () => Promise<T>): Promise<T> {
  const previous = rsvpLocks.get(code) ?? Promise.resolve();
  let release: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  rsvpLocks.set(code, current);

  await previous;
  try {
    return await operation();
  } finally {
    release!();
    if (rsvpLocks.get(code) === current) rsvpLocks.delete(code);
  }
}

function getSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!sheetId || !serviceAccountJson) {
    throw new Error("Google Sheets chưa được cấu hình trên máy chủ.");
  }

  const credentials = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string };
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheetId, sheets: google.sheets({ version: "v4", auth }) };
}

export const googleSheetsStore: InvitationStore = {
  async findInvitation(code) {
    const { sheetId, sheets } = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: INVITATION_COLUMNS });
    const row = result.data.values?.find(([candidate]) => candidate === code);

    if (!row) return null;

    const maxGuests = Number(row[2]);
    if (!Number.isInteger(maxGuests) || maxGuests <= 0) return null;

    return {
      code: row[0],
      name: row[1] ?? "",
      maxGuests,
      active: row[3]?.toLowerCase() === "true",
    };
  },

  async upsertRsvp(response: StoredRsvp) {
    return withRsvpLock(response.code, async () => {
      const { sheetId, sheets } = getSheetsClient();
      const existing = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: RSVP_COLUMNS });
      const rows = existing.data.values ?? [];
      const index = rows.findIndex(([code]) => code === response.code);
      const now = new Date().toISOString();
      const values = [[response.code, response.name, response.attendance, response.guestCount, response.message, index === -1 ? now : rows[index][5], now]];

      if (index === -1) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: "RSVPs!A:G",
          valueInputOption: "RAW",
          requestBody: { values },
        });
        return;
      }

      const rowNumber = index + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `RSVPs!A${rowNumber}:G${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    });
  },
};
