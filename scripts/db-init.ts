import { closeDatabaseForTests, initializeDatabase } from "../src/lib/sqlite";

initializeDatabase();
closeDatabaseForTests();
console.log(`Đã khởi tạo SQLite tại ${process.env.SQLITE_PATH ?? "data/wedding.sqlite"}.`);

