/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS deploy utility */
const fs = require("node:fs");
const path = require("node:path");
const BetterSqlite3 = require("better-sqlite3");

const TRACKED_TABLES = [
  "invitations",
  "rsvps",
  "event_rsvps",
  "media_assets",
  "site_settings",
  "appearance_settings",
  "music_settings",
  "invitation_content",
  "invitation_event_profiles",
  "gift_wishes",
];

function fail(message) {
  throw new Error(`[persistent-state] ${message}`);
}

function realpathExisting(target, label) {
  try {
    return fs.realpathSync(target);
  } catch {
    fail(`${label} does not exist: ${target}`);
  }
}

function isWithin(target, root) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function listFiles(root) {
  const files = [];
  const stack = [{ absolute: root, relative: "" }];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current.absolute, { withFileTypes: true })) {
      const absolute = path.join(current.absolute, entry.name);
      const relative = current.relative ? path.join(current.relative, entry.name) : entry.name;
      if (entry.isDirectory()) stack.push({ absolute, relative });
      else if (entry.isFile()) files.push(relative.split(path.sep).join("/"));
    }
  }
  return files.sort();
}

function tableExists(db, table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function tableCounts(db) {
  return Object.fromEntries(TRACKED_TABLES.map((table) => {
    if (!tableExists(db, table)) return [table, 0];
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    return [table, Number(row.count)];
  }));
}

function readMusic(db, uploadsRoot) {
  if (!tableExists(db, "music_settings")) return null;
  const row = db.prepare("SELECT enabled, src, title, loop FROM music_settings WHERE id = 1").get();
  if (!row) return null;
  const src = typeof row.src === "string" && row.src.trim() ? row.src.trim() : null;
  if (src) {
    const prefix = "/uploads/";
    if (!src.startsWith(prefix)) fail(`music src is not an uploads path: ${src}`);
    const filename = src.slice(prefix.length);
    if (!filename || filename.includes("/") || filename.includes("\\")) fail(`music src is not canonical: ${src}`);
    const musicPath = path.resolve(uploadsRoot, filename);
    if (!isWithin(musicPath, uploadsRoot)) fail(`music file escapes uploads directory: ${src}`);
    if (!fs.existsSync(musicPath) || !fs.statSync(musicPath).isFile()) fail(`music file referenced by SQLite is missing: ${src}`);
  }
  return {
    enabled: Number(row.enabled) === 1,
    src,
    title: String(row.title ?? ""),
    loop: Number(row.loop) !== 0,
  };
}

function inspect({ readonly = false } = {}) {
  const expectedData = realpathExisting(process.env.EXPECTED_SHARED_DATA, "EXPECTED_SHARED_DATA");
  const expectedUploads = realpathExisting(process.env.EXPECTED_SHARED_UPLOADS, "EXPECTED_SHARED_UPLOADS");
  const configuredDb = path.resolve(process.env.SQLITE_PATH || "data/wedding.sqlite");
  const configuredUploads = path.resolve(process.env.MEDIA_UPLOAD_DIRECTORY || path.join("public", "uploads"));
  const dbPath = realpathExisting(configuredDb, "SQLite database");
  const uploadsPath = realpathExisting(configuredUploads, "media upload directory");

  if (!isWithin(dbPath, expectedData)) fail(`SQLite database is outside shared data: ${dbPath}`);
  if (uploadsPath !== expectedUploads) fail(`uploads path does not resolve to shared uploads: ${uploadsPath}`);

  const db = new BetterSqlite3(dbPath, { readonly, fileMustExist: true });
  try {
    const integrityRows = db.pragma("integrity_check");
    const integrity = Array.isArray(integrityRows)
      ? integrityRows.map((row) => String(row.integrity_check ?? Object.values(row)[0])).join("\n")
      : String(integrityRows);
    if (integrity !== "ok") fail(`SQLite integrity_check failed: ${integrity}`);

    const uploadFiles = listFiles(uploadsPath);
    return {
      dbPath,
      uploadsPath,
      counts: tableCounts(db),
      uploadFiles,
      uploadFileCount: uploadFiles.length,
      music: readMusic(db, uploadsPath),
      db,
    };
  } catch (error) {
    db.close();
    throw error;
  }
}

function serializable(snapshot) {
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    releaseId: process.env.DEPLOY_RELEASE_ID || null,
    dbPath: snapshot.dbPath,
    uploadsPath: snapshot.uploadsPath,
    counts: snapshot.counts,
    uploadFiles: snapshot.uploadFiles,
    uploadFileCount: snapshot.uploadFileCount,
    music: snapshot.music,
  };
}

async function createBackup(snapshot) {
  const configuredBackupDirectory = path.resolve(process.env.SQLITE_BACKUP_DIRECTORY || "data/backups");
  fs.mkdirSync(configuredBackupDirectory, { recursive: true });
  const backupRoot = fs.realpathSync(configuredBackupDirectory);
  const expectedData = fs.realpathSync(process.env.EXPECTED_SHARED_DATA);
  if (!isWithin(backupRoot, expectedData)) fail(`backup directory is outside shared data: ${backupRoot}`);

  const release = (process.env.DEPLOY_RELEASE_ID || "unknown").replace(/[^0-9A-Za-z._-]/g, "_");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupRoot, `pre-deploy-${timestamp}-${release}.sqlite`);
  await snapshot.db.backup(backupPath);
  if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) fail("SQLite pre-deploy backup was not created");
  return backupPath;
}

function assertPreserved(before, after) {
  if (after.dbPath !== before.dbPath) fail(`SQLite realpath changed across deploy: ${before.dbPath} -> ${after.dbPath}`);
  if (after.uploadsPath !== before.uploadsPath) fail(`uploads realpath changed across deploy: ${before.uploadsPath} -> ${after.uploadsPath}`);

  for (const table of TRACKED_TABLES) {
    const previous = Number(before.counts?.[table] ?? 0);
    const current = Number(after.counts?.[table] ?? 0);
    if (current < previous) fail(`${table} row count decreased across deploy: ${previous} -> ${current}`);
  }

  const afterFiles = new Set(Array.isArray(after.uploadFiles) ? after.uploadFiles : []);
  for (const previousFile of Array.isArray(before.uploadFiles) ? before.uploadFiles : []) {
    if (!afterFiles.has(previousFile)) fail(`persisted upload disappeared across deploy: ${previousFile}`);
  }
  if (after.uploadFileCount < Number(before.uploadFileCount ?? 0)) {
    fail(`upload file count decreased across deploy: ${before.uploadFileCount} -> ${after.uploadFileCount}`);
  }

  if (before.music?.src && !after.music?.src) fail(`music configuration disappeared across deploy: ${before.music.src}`);
}

async function main() {
  const [mode, stateFile] = process.argv.slice(2);
  if (mode === "audit") {
    if (stateFile) fail("usage: node verify-persistent-state.cjs audit");
    let snapshot;
    try {
      snapshot = inspect({ readonly: true });
      const configuredBackupDirectory = path.resolve(process.env.SQLITE_BACKUP_DIRECTORY || "data/backups");
      const backupPath = realpathExisting(configuredBackupDirectory, "SQLite backup directory");
      const expectedData = realpathExisting(process.env.EXPECTED_SHARED_DATA, "EXPECTED_SHARED_DATA");
      if (!fs.statSync(backupPath).isDirectory()) fail("SQLite backup path is not a directory");
      if (!isWithin(backupPath, expectedData)) fail("backup directory is outside shared data");
      console.log(`[persistent-state] audit OK; paths=shared; backup=shared/data/${path.relative(expectedData, backupPath).split(path.sep).join("/")}; counts=${JSON.stringify(snapshot.counts)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const category = /music/i.test(message)
        ? "music reference"
        : /backup/i.test(message)
          ? "backup path"
          : /upload|media/i.test(message)
            ? "uploads path"
            : /sqlite|database|integrity/i.test(message)
              ? "SQLite state"
              : "shared path";
      fail(`audit failed; ${category} check did not pass`);
    } finally {
      snapshot?.db.close();
    }
    return;
  }
  if (!stateFile || !["snapshot", "verify"].includes(mode)) {
    fail("usage: node verify-persistent-state.cjs <snapshot|verify> <state-file>");
  }

  if (mode === "snapshot") {
    const snapshot = inspect();
    try {
      const backupPath = await createBackup(snapshot);
      const state = { ...serializable(snapshot), backupPath };
      fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
      console.log(`[persistent-state] snapshot OK; backup=${backupPath}`);
    } finally {
      snapshot.db.close();
    }
    return;
  }

  const before = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const after = inspect();
  try {
    assertPreserved(before, serializable(after));
    console.log("[persistent-state] verify OK; SQLite/uploads/music preserved");
  } finally {
    after.db.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
