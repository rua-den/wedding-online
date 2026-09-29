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
  it("creates legacy and event RSVP tables with foreign keys enabled", () => {
    useTemporaryDatabase();
    initializeDatabase();

    const tables = getDatabase()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const invitationColumns = getDatabase().prepare("PRAGMA table_info(invitations)").all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(["invitations", "rsvps", "event_rsvps"]),
    );
    expect(invitationColumns.map((column) => column.name)).toContain("event_scope");
    expect(getDatabase().pragma("foreign_keys", { simple: true })).toBe(1);
    expect(getDatabase().pragma("journal_mode", { simple: true })).toBe("wal");
  });

  it("migrates existing invitations to the legacy event scope without changing rows", () => {
    useTemporaryDatabase();
    const connection = getDatabase();
    connection.exec(`
      CREATE TABLE invitations (
        id INTEGER PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        max_guests INTEGER NOT NULL CHECK (max_guests >= 1),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    connection.prepare("INSERT INTO invitations (code, name, max_guests, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)").run("old", "Khách cũ", 2, "before", "before");

    initializeDatabase();

    expect(connection.prepare("SELECT code, event_scope FROM invitations WHERE code = ?").get("old")).toEqual({ code: "old", event_scope: "legacy" });
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

    expect(() =>
      getDatabase()
        .prepare(
          "INSERT INTO event_rsvps (invitation_code, event_scope, attendance, guest_count, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run("missing", "oct11", "attending", 1, "", "now", "now"),
    ).toThrow();
  });

  it("adds the local demo invitation only in development", () => {
    useTemporaryDatabase();
    vi.stubEnv("NODE_ENV", "development");
    initializeDatabase();

    expect(
      getDatabase()
        .prepare("SELECT code, max_guests, event_scope FROM invitations WHERE code = ?")
        .get("demo"),
    ).toEqual({ code: "demo", max_guests: 2, event_scope: "legacy" });
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
