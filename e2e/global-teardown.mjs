import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

export default async function globalTeardown() {
  const root = process.env.E2E_TEMP_ROOT;
  if (!root) return;

  const resolvedRoot = resolve(root);
  if (dirname(resolvedRoot) !== resolve(tmpdir())
    || !basename(resolvedRoot).startsWith("wedding-online-e2e-")) {
    return;
  }

  try {
    rmSync(resolvedRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // Playwright's web server may still hold the SQLite file on Windows.
  }
}
