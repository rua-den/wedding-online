import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const sqlitePackage = join(standalone, "node_modules", "better-sqlite3", "package.json");

if (!existsSync(sqlitePackage)) {
  throw new Error("Standalone output is missing better-sqlite3; production would fail after deployment.");
}

const tempRoot = mkdtempSync(join(tmpdir(), "wedding-standalone-"));
const release = join(tempRoot, "release");
const dataDirectory = join(tempRoot, "data");
const uploadsDirectory = join(tempRoot, "uploads");
const port = "3210";
let output = "";
let child;

function appendOutput(chunk) {
  output += chunk.toString();
  if (output.length > 20_000) output = output.slice(-20_000);
}

try {
  cpSync(standalone, release, { recursive: true });
  mkdirSync(join(release, ".next", "static"), { recursive: true });
  cpSync(join(root, ".next", "static"), join(release, ".next", "static"), { recursive: true });

  const publicDirectory = join(root, "public");
  if (existsSync(publicDirectory)) {
    mkdirSync(join(release, "public"), { recursive: true });
    cpSync(publicDirectory, join(release, "public"), { recursive: true });
    rmSync(join(release, "public", "uploads"), { recursive: true, force: true });
  }

  mkdirSync(dataDirectory, { recursive: true });
  mkdirSync(uploadsDirectory, { recursive: true });

  child = spawn(process.execPath, ["server.js"], {
    cwd: release,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: port,
      SQLITE_PATH: join(dataDirectory, "wedding.sqlite"),
      SQLITE_BACKUP_DIRECTORY: join(dataDirectory, "backups"),
      MEDIA_UPLOAD_DIRECTORY: uploadsDirectory,
      PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
      ADMIN_SESSION_SECRET: "standalone-smoke-session-secret-0000000000000000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);

  let healthy = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch {
      // The standalone server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!healthy) {
    throw new Error(`Isolated standalone smoke test failed.\n${output}`);
  }

  console.log("Isolated standalone smoke test passed.");
} finally {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  rmSync(tempRoot, { recursive: true, force: true });
}
