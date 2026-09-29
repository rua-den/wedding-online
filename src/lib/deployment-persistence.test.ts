import BetterSqlite3 from "better-sqlite3";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const verifier = resolve("deploy/verify-persistent-state.cjs");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "wedding-deploy-state-"));
  roots.push(root);
  const data = join(root, "shared", "data");
  const uploads = join(root, "shared", "uploads");
  const backups = join(data, "backups");
  mkdirSync(backups, { recursive: true });
  mkdirSync(uploads, { recursive: true });
  const databasePath = join(data, "wedding.sqlite");
  const database = new BetterSqlite3(databasePath);
  database.exec(`
    CREATE TABLE invitations (id INTEGER PRIMARY KEY, code TEXT NOT NULL);
    CREATE TABLE music_settings (
      id INTEGER PRIMARY KEY,
      enabled INTEGER NOT NULL,
      src TEXT,
      title TEXT NOT NULL,
      loop INTEGER NOT NULL
    );
  `);
  database.prepare("INSERT INTO invitations (code) VALUES (?)").run("guest-a");
  database.prepare("INSERT INTO music_settings (id, enabled, src, title, loop) VALUES (1, 1, '/uploads/song.mp3', 'Song', 1)").run();
  database.close();
  writeFileSync(join(uploads, "song.mp3"), "fake-mp3-for-deploy-state-test");

  const stateFile = join(root, "state.json");
  const env = {
    ...process.env,
    SQLITE_PATH: databasePath,
    SQLITE_BACKUP_DIRECTORY: backups,
    MEDIA_UPLOAD_DIRECTORY: uploads,
    EXPECTED_SHARED_DATA: data,
    EXPECTED_SHARED_UPLOADS: uploads,
    DEPLOY_RELEASE_ID: "test-release",
  };
  return { root, data, uploads, backups, databasePath, stateFile, env };
}

function run(mode: "snapshot" | "verify", stateFile: string, env: NodeJS.ProcessEnv) {
  return execFileSync(process.execPath, [verifier, mode, stateFile], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("production persistent-state verifier", () => {
  it("backs up SQLite and accepts unchanged persistent state", () => {
    const test = fixture();
    expect(run("snapshot", test.stateFile, test.env)).toContain("snapshot OK");
    const snapshot = JSON.parse(readFileSync(test.stateFile, "utf8")) as {
      backupPath: string;
      counts: Record<string, number>;
      uploadFileCount: number;
    };
    expect(snapshot.counts.invitations).toBe(1);
    expect(snapshot.counts.music_settings).toBe(1);
    expect(snapshot.uploadFileCount).toBe(1);
    expect(existsSync(snapshot.backupPath)).toBe(true);
    expect(run("verify", test.stateFile, test.env)).toContain("verify OK");
  });

  it("fails when tracked database rows disappear during deploy", () => {
    const test = fixture();
    run("snapshot", test.stateFile, test.env);
    const database = new BetterSqlite3(test.databasePath);
    database.prepare("DELETE FROM invitations").run();
    database.close();
    expect(() => run("verify", test.stateFile, test.env)).toThrow();
  });

  it("fails before deploy when SQLite references a missing music file", () => {
    const test = fixture();
    rmSync(join(test.uploads, "song.mp3"));
    expect(() => run("snapshot", test.stateFile, test.env)).toThrow();
  });
});
