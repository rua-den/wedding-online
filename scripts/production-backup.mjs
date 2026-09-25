import BetterSqlite3 from "better-sqlite3";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [envPathArg, outputDirectoryArg] = process.argv.slice(2);
if (!envPathArg || !outputDirectoryArg) {
  throw new Error("Usage: node scripts/production-backup.mjs <env-file> <output-directory>");
}

const envPath = resolve(envPathArg);
const outputDirectory = resolve(outputDirectoryArg);
if (!existsSync(envPath)) throw new Error(`Production environment file is missing: ${envPath}`);

process.loadEnvFile(envPath);

const databasePath = resolve(process.env.SQLITE_PATH ?? "data/wedding.sqlite");
if (!existsSync(databasePath)) throw new Error(`Production SQLite database is missing: ${databasePath}`);

mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
chmodSync(outputDirectory, 0o700);

const backupPath = join(outputDirectory, "wedding.sqlite");
const database = new BetterSqlite3(databasePath);
try {
  database.pragma("foreign_keys = ON");
  database.pragma("wal_checkpoint(TRUNCATE)");
  await database.backup(backupPath);
} finally {
  database.close();
}

const backup = new BetterSqlite3(backupPath, { readonly: true, fileMustExist: true });
let integrity;
try {
  integrity = backup.pragma("integrity_check", { simple: true });
} finally {
  backup.close();
}
if (integrity !== "ok") throw new Error(`SQLite backup integrity check failed: ${String(integrity)}`);

chmodSync(backupPath, 0o600);

let revision = process.env.BACKUP_REVISION ?? "unknown";
try {
  const revisionFile = resolve("REVISION");
  if (existsSync(revisionFile)) revision = readFileSync(revisionFile, "utf8").trim() || revision;
} catch {
  // Revision metadata is useful but never more important than a valid backup.
}

const metadataPath = join(outputDirectory, "metadata.json");
writeFileSync(metadataPath, `${JSON.stringify({
  createdAt: new Date().toISOString(),
  revision,
  database: basename(databasePath),
  integrity: "ok",
}, null, 2)}\n`, { mode: 0o600 });
chmodSync(metadataPath, 0o600);

console.log(`Verified SQLite backup created at ${backupPath}`);
