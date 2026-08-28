import { defineConfig } from "playwright/test";
import { scryptSync } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.E2E_PORT ?? 4173);
const password = process.env.E2E_ADMIN_PASSWORD ?? "huy-nhi-e2e-password";
const salt = "00112233445566778899aabbccddeeff";
const digest = scryptSync(password, salt, 64).toString("hex");
const databasePath = join(tmpdir(), `wedding-online-e2e-${process.pid}.sqlite`);

process.env.E2E_ADMIN_PASSWORD = password;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && node e2e/seed.mjs && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      NODE_ENV: "production",
      SQLITE_PATH: databasePath,
      ADMIN_PASSWORD_HASH: `scrypt$${salt}$${digest}`,
      ADMIN_SESSION_SECRET: "e2e-only-session-secret-0123456789012345",
      PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
      PORT: String(port),
    } as Record<string, string>,
  },
});
