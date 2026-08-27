import { afterEach, describe, expect, it, vi } from "vitest";

const sheetValues = vi.hoisted(() => ({
  get: vi.fn(),
  append: vi.fn(),
  update: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: { GoogleAuth: vi.fn() },
    sheets: vi.fn(() => ({ spreadsheets: { values: sheetValues } })),
  },
}));

import { googleSheetsStore } from "./sheets";

function prepareEnvironment() {
  process.env.GOOGLE_SHEET_ID = "sheet-id";
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "bot@example.com", private_key: "private-key" });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("googleSheetsStore", () => {
  it("does not expose an invitation whose guest limit is not a positive integer", async () => {
    prepareEnvironment();
    sheetValues.get.mockResolvedValue({ data: { values: [["invite-code", "Guest", "0", "true"]] } });

    await expect(googleSheetsStore.findInvitation("invite-code")).resolves.toBeNull();
  });

  it("writes RSVP values with RAW input semantics", async () => {
    prepareEnvironment();
    sheetValues.get.mockResolvedValue({ data: { values: [] } });
    sheetValues.append.mockResolvedValue({});

    await googleSheetsStore.upsertRsvp({
      code: "invite-code",
      name: "Guest",
      attendance: "attending",
      guestCount: 1,
      message: "=not a formula",
    });

    expect(sheetValues.append).toHaveBeenCalledWith(expect.objectContaining({
      valueInputOption: "RAW",
      requestBody: expect.objectContaining({ values: expect.arrayContaining([expect.arrayContaining(["=not a formula"])]) }),
    }));
  });

  it("serializes concurrent first responses for the same invitation", async () => {
    prepareEnvironment();
    const rows: string[][] = [];
    let releaseAppend: (() => void) | undefined;
    const appendStarted = new Promise<void>((resolve) => { releaseAppend = resolve; });

    sheetValues.get.mockImplementation(async () => ({ data: { values: rows.map((row) => [...row]) } }));
    sheetValues.append.mockImplementation(async ({ requestBody }) => {
      await appendStarted;
      rows.push(requestBody.values[0]);
    });
    sheetValues.update.mockImplementation(async ({ requestBody, range }) => {
      const rowNumber = Number(range.match(/A(\d+):/)?.[1]);
      rows[rowNumber - 2] = requestBody.values[0];
    });

    const response = { code: "invite-code", name: "Guest", attendance: "attending" as const, guestCount: 1, message: "Hello" };
    const first = googleSheetsStore.upsertRsvp(response);
    const second = googleSheetsStore.upsertRsvp(response);

    await vi.waitFor(() => expect(sheetValues.append).toHaveBeenCalledTimes(1));
    releaseAppend?.();
    await Promise.all([first, second]);

    expect(sheetValues.append).toHaveBeenCalledTimes(1);
    expect(sheetValues.update).toHaveBeenCalledTimes(1);
  });
});
