import BetterSqlite3 from "better-sqlite3";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
  writeFileSync(join(uploads, "photo.jpg"), "fake-image-for-deploy-state-test");

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

function run(mode: "snapshot" | "verify" | "audit", stateFile: string, env: NodeJS.ProcessEnv) {
  return execFileSync(process.execPath, [verifier, mode, ...(mode === "audit" ? [] : [stateFile])], {
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
      uploadFiles: string[];
      uploadFileCount: number;
    };
    expect(snapshot.counts.invitations).toBe(1);
    expect(snapshot.counts.music_settings).toBe(1);
    expect(snapshot.uploadFiles).toEqual(["photo.jpg", "song.mp3"]);
    expect(snapshot.uploadFileCount).toBe(2);
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

  it("fails when a persisted upload is replaced even if file count stays equal", () => {
    const test = fixture();
    run("snapshot", test.stateFile, test.env);
    rmSync(join(test.uploads, "photo.jpg"));
    writeFileSync(join(test.uploads, "replacement.jpg"), "different-file");
    expect(() => run("verify", test.stateFile, test.env)).toThrow();
  });

  it("fails before deploy when SQLite references a missing music file", () => {
    const test = fixture();
    rmSync(join(test.uploads, "song.mp3"));
    expect(() => run("snapshot", test.stateFile, test.env)).toThrow();
  });

  it("audits persistent state read-only without requiring a snapshot or creating files", () => {
    const test = fixture();
    const before = readdirSync(test.backups);

    const output = run("audit", test.stateFile, test.env);

    expect(output).toContain("audit OK");
    expect(output).toContain('"invitations":1');
    expect(output).not.toContain("Song");
    expect(output).not.toContain("song.mp3");
    expect(existsSync(test.stateFile)).toBe(false);
    expect(readdirSync(test.backups)).toEqual(before);
    expect(readdirSync(test.data).sort()).toEqual(["backups", "wedding.sqlite"]);
  });

  it("runs the current verifier source from stdin in CommonJS mode like the VPS audit", () => {
    const test = fixture();
    const release = join(test.root, "release");
    mkdirSync(release);
    symlinkSync(join(process.cwd(), "node_modules"), join(release, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    writeFileSync(join(release, ".env"), [
      "SQLITE_PATH=../shared/data/wedding.sqlite",
      "SQLITE_BACKUP_DIRECTORY=../shared/data/backups",
      "MEDIA_UPLOAD_DIRECTORY=../shared/uploads",
      "",
    ].join("\n"));
    const env = Object.fromEntries(
      Object.entries(test.env).filter(([key]) => !["SQLITE_PATH", "SQLITE_BACKUP_DIRECTORY", "MEDIA_UPLOAD_DIRECTORY"].includes(key)),
    ) as NodeJS.ProcessEnv;

    const output = execFileSync(process.execPath, ["--env-file=.env", "--input-type=commonjs", "-", "audit"], {
      cwd: release,
      env,
      input: readFileSync(verifier),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    expect(output).toContain("audit OK");
    expect(existsSync(test.stateFile)).toBe(false);
    expect(readdirSync(test.backups)).toEqual([]);
  });

  it.each(["missing-db", "corrupt-db", "missing-music"] as const)("fails a read-only audit for %s", (failure) => {
    const test = fixture();
    if (failure === "missing-db") rmSync(test.databasePath);
    if (failure === "corrupt-db") writeFileSync(test.databasePath, "not a sqlite database");
    if (failure === "missing-music") rmSync(join(test.uploads, "song.mp3"));

    expect(() => run("audit", test.stateFile, test.env)).toThrow();
    expect(existsSync(test.stateFile)).toBe(false);
    expect(readdirSync(test.backups)).toEqual([]);
  });

  it.each(["missing", "escaped"] as const)("fails a read-only audit when backup directory is %s", (failure) => {
    const test = fixture();
    if (failure === "missing") rmSync(test.backups, { recursive: true });
    else {
      const outside = join(test.root, "outside-backups");
      mkdirSync(outside);
      rmSync(test.backups, { recursive: true });
      symlinkSync(outside, test.backups, "junction");
    }

    expect(() => run("audit", test.stateFile, test.env)).toThrow();
    expect(existsSync(test.stateFile)).toBe(false);
  });

  it("returns a nonzero process status when read-only audit invariants fail", () => {
    const test = fixture();
    rmSync(join(test.uploads, "song.mp3"));

    try {
      run("audit", test.stateFile, test.env);
      throw new Error("audit unexpectedly succeeded");
    } catch (error) {
      expect(error).toMatchObject({ status: 1 });
    }
  });

  it("does not expose music filenames or titles when an audit detects missing music", () => {
    const test = fixture();
    rmSync(join(test.uploads, "song.mp3"));

    try {
      run("audit", test.stateFile, test.env);
      throw new Error("audit unexpectedly succeeded");
    } catch (error) {
      expect(error).toMatchObject({ status: 1 });
      const diagnostic = String((error as NodeJS.ErrnoException & { stderr?: Buffer }).stderr ?? error);
      expect(diagnostic).toContain("music reference check did not pass");
      expect(diagnostic).not.toContain("song.mp3");
      expect(diagnostic).not.toContain("Song");
    }
  });
});
