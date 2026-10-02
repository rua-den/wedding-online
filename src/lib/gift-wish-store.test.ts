import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeDatabaseForTests } from "./sqlite";
import { createGiftWish, listGiftWishes } from "./gift-wish-store";
import { createAdminInvitation } from "./sqlite-store";

let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "gift-wishes-")); process.env.SQLITE_PATH = join(directory, "wedding.sqlite"); });
afterEach(() => { closeDatabaseForTests(); rmSync(directory, { recursive: true, force: true }); delete process.env.SQLITE_PATH; });

describe("gift wish store", () => {
  it("persists a validated wish with optional invitation code", () => {
    createAdminInvitation({ code: "mai", name: "Mai", maxGuests: 1 });
    const created = createGiftWish({ invitationCode: "mai", name: " Mai ", message: "  Chúc hai bạn trăm năm!  " });
    expect(created).toMatchObject({ invitationCode: "mai", name: "Mai", message: "Chúc hai bạn trăm năm!" });
    expect(listGiftWishes()).toHaveLength(1);
  });

  it("rejects blank or oversized wishes", () => {
    expect(() => createGiftWish({ name: " ", message: "Lời chúc" })).toThrow();
    expect(() => createGiftWish({ name: "Mai", message: "x".repeat(1001) })).toThrow();
  });
});
