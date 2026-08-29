import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

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

  CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY,
    slot TEXT NOT NULL CHECK (slot IN ('hero', 'groom', 'bride', 'story', 'venue', 'gallery')),
    src TEXT NOT NULL UNIQUE,
    alt TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    focus_x REAL NOT NULL DEFAULT 50 CHECK (focus_x BETWEEN 0 AND 100),
    focus_y REAL NOT NULL DEFAULT 50 CHECK (focus_y BETWEEN 0 AND 100),
    zoom REAL NOT NULL DEFAULT 1 CHECK (zoom BETWEEN 1 AND 3),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS media_assets_slot_order_idx
  ON media_assets(slot, sort_order, id);

  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    venue TEXT,
    address TEXT,
    date_label TEXT,
    time_label TEXT,
    maps_url TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS appearance_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme_id TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

function migrateMediaAssetCropColumns(connection: SqliteDatabase): void {
  const columns = connection.prepare("PRAGMA table_info(media_assets)").all() as Array<{ name: string }>;
  const existingColumns = new Set(columns.map((column) => column.name));

  if (!existingColumns.has("focus_x")) connection.exec("ALTER TABLE media_assets ADD COLUMN focus_x REAL NOT NULL DEFAULT 50");
  if (!existingColumns.has("focus_y")) connection.exec("ALTER TABLE media_assets ADD COLUMN focus_y REAL NOT NULL DEFAULT 50");
  if (!existingColumns.has("zoom")) connection.exec("ALTER TABLE media_assets ADD COLUMN zoom REAL NOT NULL DEFAULT 1");
}

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
    const BetterSqlite3 = nodeRequire(/* turbopackIgnore: true */ "better-sqlite3") as new (path: string) => SqliteDatabase;
    return new BetterSqlite3(databasePath);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "MODULE_NOT_FOUND")) throw error;

    const nativeSqlite = nodeRequire("node:sqlite") as NativeSqliteModule;
    const nativeDatabase = new nativeSqlite.DatabaseSync(databasePath);
    return wrapNativeDatabase(nativeDatabase, nativeSqlite.backup);
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
  migrateMediaAssetCropColumns(connection);

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
