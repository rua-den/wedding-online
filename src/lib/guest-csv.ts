export type GuestCsvRow = {
  name: string;
  maxGuests: number;
};

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV không hợp lệ: thiếu dấu ngoặc kép đóng.");
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function parseGuestCsv(text: string): GuestCsvRow[] {
  const rows = parseRows(text.replace(/^\uFEFF/, ""));
  const header = rows[0]?.map((value) => value.trim());
  if (!header || header[0] !== "name" || header[1] !== "maxGuests") {
    throw new Error("CSV phải có header: name,maxGuests.");
  }

  const guests: GuestCsvRow[] = [];
  rows.slice(1).forEach((values, index) => {
    const rowNumber = index + 2;
    if (values.every((value) => value.trim() === "")) return;
    const name = values[0]?.trim() ?? "";
    const maxGuests = Number(values[1]?.trim());

    if (!name) throw new Error(`Dòng ${rowNumber}: Tên khách mời không được để trống.`);
    if (!Number.isInteger(maxGuests) || maxGuests <= 0) {
      throw new Error(`Dòng ${rowNumber}: Số khách phải là số nguyên dương.`);
    }
    guests.push({ name, maxGuests });
  });
  return guests;
}

function safeCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toSafeCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  const headers = columns ?? Object.keys(rows[0] ?? {});
  if (headers.length === 0) return "";
  const output = [headers.map(safeCell).join(",")];
  for (const row of rows) output.push(headers.map((header) => safeCell(row[header])).join(","));
  return `${output.join("\r\n")}\r\n`;
}

