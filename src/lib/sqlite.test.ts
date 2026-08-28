import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDatabaseForTests, getDatabase, initializeDatabase } from "./sqlite";

let temporaryDirectory: string | undefined;

function useTemporaryDatabase() {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "wedding-sqlite-"));
  process.env.SQLITE_PATH = join(temporaryDirectory, "wedding.sqlite");
}

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = undefined;
});

describe("SQLite database", () => {
  it("creates the invitation and RSVP tables with foreign keys enabled", () => {
    useTemporaryDatabase();
    initializeDatabase();

    const tables = getDatabase()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(["invitations", "rsvps"]),
    );
    expect(getDatabase().pragma("foreign_keys", { simple: true })).toBe(1);
    expect(getDatabase().pragma("journal_mode", { simple: true })).toBe("wal");
  });

  it("enforces invitation and RSVP constraints", () => {
    useTemporaryDatabase();
    initializeDatabase();

    expect(() =>
      getDatabase()
        .prepare(
          "INSERT INTO invitations (code, name, max_guests, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run("invalid", "Invalid", 0, 1, "now", "now"),
    ).toThrow();

    expect(() =>
      getDatabase()
        .prepare(
          "INSERT INTO rsvps (invitation_code, attendance, guest_count, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run("missing", "attending", 1, "", "now", "now"),
    ).toThrow();
  });

  it("adds the local demo invitation only in development", () => {
    useTemporaryDatabase();
    vi.stubEnv("NODE_ENV", "development");
    initializeDatabase();

    expect(
      getDatabase()
        .prepare("SELECT code, max_guests FROM invitations WHERE code = ?")
        .get("demo"),
    ).toEqual({ code: "demo", max_guests: 2 });
  });

  it("does not add the demo invitation outside development", () => {
    useTemporaryDatabase();
    vi.stubEnv("NODE_ENV", "production");
    initializeDatabase();

    expect(
      getDatabase().prepare("SELECT code FROM invitations WHERE code = ?").get("demo"),
    ).toBeUndefined();
  });

  it("returns plain objects that can cross a server component boundary", () => {
    useTemporaryDatabase();
    initializeDatabase();

    const row = getDatabase().prepare("SELECT 1 AS value").get() as object;
    expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
  });

  it("creates a readable backup file", async () => {
    useTemporaryDatabase();
    initializeDatabase();
    const backupPath = join(temporaryDirectory!, "backup.sqlite");

    await getDatabase().backup(backupPath);

    expect(existsSync(backupPath)).toBe(true);
  });
});
