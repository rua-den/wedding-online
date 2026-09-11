import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { hashPassword } from "../src/lib/admin-auth";

const envPath = resolve(process.cwd(), ".env.local");
const providedPassword = process.argv[2];
const password = providedPassword ?? randomBytes(12).toString("base64url");

if (password.length < 10) {
  console.error("Mật khẩu admin phải có ít nhất 10 ký tự.");
  process.exit(1);
}

function upsertEnv(content: string, key: string, value: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content ? content.split(/\r?\n/) : [];
  const prefix = `${key}=`;
  const index = lines.findIndex((line) => line.startsWith(prefix));
  const next = `${key}=${value}`;

  if (index >= 0) lines[index] = next;
  else lines.push(next);

  while (lines.length && lines.at(-1) === "") lines.pop();
  return `${lines.join(eol)}${eol}`;
}

let envContent = "";
try {
  envContent = await readFile(envPath, "utf8");
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}

const hash = await hashPassword(password);
const envSafeHash = hash.replaceAll("$", "\\$");
const sessionSecret = randomBytes(48).toString("base64url");

envContent = upsertEnv(envContent, "ADMIN_PASSWORD_HASH", envSafeHash);
envContent = upsertEnv(envContent, "ADMIN_SESSION_SECRET", sessionSecret);
await writeFile(envPath, envContent, { encoding: "utf8", mode: 0o600 });

console.log(`Local admin credentials updated in ${envPath}`);
if (!providedPassword) console.log(`Generated admin password: ${password}`);
console.log("Restart `npm run dev`, then open /admin/login.");
