import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

import { google } from "googleapis";

const [inputPath] = process.argv.slice(2);
const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!inputPath || !siteUrl || !spreadsheetId || !serviceAccountJson) {
  console.error("Dùng: PUBLIC_SITE_URL=... GOOGLE_SHEET_ID=... GOOGLE_SERVICE_ACCOUNT_JSON='...' node scripts/seed-invitations.mjs data/guests.csv");
  process.exit(1);
}

const csv = await readFile(inputPath, "utf8");
const guests = csv
  .split(/\r?\n/)
  .slice(1)
  .filter((line) => line.trim())
  .map((line, index) => {
    const [name, maxGuests] = line.split(",").map((value) => value.trim());
    return { name, maxGuests: Number(maxGuests), rowNumber: index + 2 };
  });

for (const guest of guests) {
  if (!guest.name) {
    console.error(`Dòng ${guest.rowNumber}: Tên khách mời không được để trống.`);
    process.exit(1);
  }

  if (!Number.isInteger(guest.maxGuests) || guest.maxGuests <= 0) {
    console.error(`Dòng ${guest.rowNumber}: Số khách phải là số nguyên dương.`);
    process.exit(1);
  }
}

const credentials = JSON.parse(serviceAccountJson);
const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth });
const rows = guests.map(({ name, maxGuests }) => [randomBytes(32).toString("base64url"), name, maxGuests, true]);

await sheets.spreadsheets.values.clear({
  spreadsheetId,
  range: "Invitations!A2:D",
});

await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `Invitations!A2:D${rows.length + 1}`,
  valueInputOption: "RAW",
  requestBody: { values: rows },
});

console.table(rows.map(([code, name, maxGuests]) => ({ name, maxGuests, invitationUrl: `${siteUrl}/moi/${code}` })));
