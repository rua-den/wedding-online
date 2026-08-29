import { defineConfig } from "playwright/test";
import { randomUUID, scryptSync } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.E2E_PORT ?? 4173);
const password = process.env.E2E_ADMIN_PASSWORD ?? "huy-nhi-e2e-password";
const salt = "00112233445566778899aabbccddeeff";
const digest = scryptSync(password, salt, 64).toString("hex");
const e2eTempRoot = process.env.E2E_TEMP_ROOT ?? join(tmpdir(), `wedding-online-e2e-${randomUUID()}`);
const databasePath = join(e2eTempRoot, "wedding.sqlite");
const uploadDirectoryPath = join(e2eTempRoot, "uploads");

process.env.E2E_ADMIN_PASSWORD = password;
process.env.E2E_TEMP_ROOT = e2eTempRoot;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.mjs",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: { mode: "on", fullPage: true },
  },
  webServer: {
    command: `npm run build && node e2e/seed.mjs && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      NODE_ENV: "production",
      SQLITE_PATH: databasePath,
      MEDIA_UPLOAD_DIRECTORY: uploadDirectoryPath,
      // This is a direct process environment value, not a .env file value, so "$" must stay unescaped.
      ADMIN_PASSWORD_HASH: "scrypt$" + salt + "$" + digest,
      ADMIN_SESSION_SECRET: "e2e-only-session-secret-0123456789012345",
      PUBLIC_SITE_URL: `http://localhost:${port}`,
      PORT: String(port),
    } as Record<string, string>,
  },
});
