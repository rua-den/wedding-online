import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("seed-invitations script", () => {
  it("rejects an empty guest name before attempting a Sheets write", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wedding-seed-"));
    const csvPath = join(directory, "guests.csv");
    await writeFile(csvPath, "name,maxGuests\n,2\n", "utf8");

    await expect(execFileAsync(process.execPath, ["scripts/seed-invitations.mjs", csvPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PUBLIC_SITE_URL: "https://wedding.example",
        GOOGLE_SHEET_ID: "sheet-id",
        GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "bot@example.com", private_key: "private-key" }),
      },
    })).rejects.toMatchObject({ stderr: expect.stringContaining("Tên khách mời không được để trống") });
  });
});
