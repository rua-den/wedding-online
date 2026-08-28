import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { DatabaseSync, backup as nativeBackup } from "node:sqlite";

type SqliteParameter = string | number | bigint | Uint8Array | null;
type SqliteStatement = {
  get(...parameters: unknown[]): unknown;
  all(...parameters: unknown[]): unknown[];
  run(...parameters: unknown[]): unknown;
};
type SqliteDatabase = {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  pragma(expression: string, options?: { simple?: boolean }): unknown;
  backup(path: string): Promise<unknown>;
  close(): void;
};

type NativeStatement = {
  get(...parameters: unknown[]): unknown;
  all(...parameters: unknown[]): unknown[];
  run(...parameters: unknown[]): unknown;
};
type NativeDatabase = {
  prepare(sql: string): NativeStatement;
  exec(sql: string): void;
  close(): void;
};

type NativeSqliteModule = {
  DatabaseSync: new (path: string) => NativeDatabase;
  backup(database: NativeDatabase, path: string): Promise<unknown> | unknown;
};

const nodeRequire = createRequire(import.meta.url);
let database: SqliteDatabase | undefined;

const schema = `
  CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    max_guests INTEGER NOT NULL CHECK (max_guests >= 1),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY,
    invitation_code TEXT NOT NULL UNIQUE REFERENCES invitations(code),
    attendance TEXT NOT NULL CHECK (attendance IN ('attending', 'declined')),
    guest_count INTEGER NOT NULL CHECK (guest_count >= 0),
    message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS rsvps_attendance_updated_idx
    ON rsvps(attendance, updated_at DESC);
`;

function wrapNativeDatabase(native: NativeDatabase, backupDatabase: NativeSqliteModule["backup"]): SqliteDatabase {
  return {
    prepare: (sql) => {
      const statement = native.prepare(sql);
      const plainRow = (row: unknown) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return row;
        return Object.fromEntries(Object.entries(row));
      };
      return {
        get: (...parameters) => plainRow(statement.get(...parameters)),
        all: (...parameters) => statement.all(...parameters).map(plainRow),
        run: (...parameters) => statement.run(...parameters),
      };
    },
    exec: (sql) => native.exec(sql),
    close: () => native.close(),
    backup: (path) => Promise.resolve(backupDatabase(native, path)),
    pragma(expression, options) {
      const normalized = expression.trim();
      if (/^[a-z_]+\s*=/.test(normalized)) {
        native.exec(`PRAGMA ${normalized}`);
        return undefined;
      }

      const row = native.prepare(`PRAGMA ${normalized}`).get() as Record<string, SqliteParameter> | undefined;
      if (!options?.simple) return row;
      return row ? Object.values(row)[0] : undefined;
    },
  };
}

function openDatabase(databasePath: string): SqliteDatabase {
  try {
    const BetterSqlite3 = nodeRequire("better-sqlite3") as new (path: string) => SqliteDatabase;
    return new BetterSqlite3(databasePath);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "MODULE_NOT_FOUND")) throw error;

    const nativeDatabase = new DatabaseSync(databasePath) as unknown as NativeDatabase;
    return wrapNativeDatabase(nativeDatabase, (database, path) => nativeBackup(database as DatabaseSync, path));
  }
}

export function getDatabase(): SqliteDatabase {
  if (!database) {
    const databasePath = resolve(/* turbopackIgnore: true */ process.env.SQLITE_PATH ?? "data/wedding.sqlite");
    mkdirSync(dirname(databasePath), { recursive: true });
    database = openDatabase(databasePath);
    database.pragma("foreign_keys = ON");
    database.pragma("journal_mode = WAL");
  }

  return database;
}

export function initializeDatabase(): void {
  const connection = getDatabase();
  connection.exec(schema);

  if (process.env.NODE_ENV === "development") {
    const now = new Date().toISOString();
    connection
      .prepare(`
        INSERT INTO invitations (code, name, max_guests, active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(code) DO NOTHING
      `)
      .run("demo", "Khách mời thân yêu", 2, now, now);
  }
}

export function closeDatabaseForTests(): void {
  if (database) {
    database.close();
    database = undefined;
  }
}
