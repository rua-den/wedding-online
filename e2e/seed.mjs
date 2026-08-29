import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const databasePath = resolve(process.env.SQLITE_PATH ?? "data/wedding.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma("foreign_keys = ON");
database.exec(`
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
`);

const now = new Date().toISOString();
database.prepare(`
  INSERT INTO invitations (code, name, max_guests, active, created_at, updated_at)
  VALUES (?, ?, ?, 1, ?, ?)
  ON CONFLICT(code) DO NOTHING
`).run("demo", "Khách mời thân yêu", 2, now, now);
database.close();
