import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { closeDatabaseForTests, getDatabase, initializeDatabase } from "../src/lib/sqlite";

const backupDirectory = resolve(process.env.SQLITE_BACKUP_DIRECTORY ?? "data/backups");
const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
const backupPath = join(backupDirectory, `wedding-${timestamp}.sqlite`);

await mkdir(backupDirectory, { recursive: true });
initializeDatabase();
const database = getDatabase();
database.pragma("wal_checkpoint(TRUNCATE)");
await database.backup(backupPath);
closeDatabaseForTests();
console.log(`Đã sao lưu SQLite: ${backupPath}`);

