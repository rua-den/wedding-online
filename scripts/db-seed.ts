import { readFile } from "node:fs/promises";
import { parseGuestCsv } from "../src/lib/guest-csv";
import { createAdminInvitation } from "../src/lib/sqlite-store";
import { closeDatabaseForTests } from "../src/lib/sqlite";

const [inputPath] = process.argv.slice(2);
if (!inputPath) {
  console.error("Dùng: npm run db:seed -- data/guests.csv");
  process.exit(1);
}

try {
  const guests = parseGuestCsv(await readFile(inputPath, "utf8"));
  const siteUrl = (process.env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  for (const guest of guests) {
    const invitation = createAdminInvitation(guest);
    console.log(`${invitation.name}\t${siteUrl}/moi/${invitation.code}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Không thể nạp danh sách khách.");
  process.exitCode = 1;
} finally {
  closeDatabaseForTests();
}
