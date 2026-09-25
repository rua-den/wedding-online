import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("production deployment security", () => {
  it("keeps every production Next.js launch path bound to loopback", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    const legacyPm2 = read("ecosystem.config.cjs");
    const releasePm2 = read("deploy/ecosystem-release.cjs");
    const workflow = read(".github/workflows/ci.yml");
    const deployment = read("DEPLOYMENT.md");

    expect(packageJson.scripts?.start).toContain("127.0.0.1");
    expect(legacyPm2).toContain("127.0.0.1");
    expect(releasePm2).toContain("127.0.0.1");
    expect(workflow).toContain('HOSTNAME="127.0.0.1"');
    expect(deployment).toContain("HOSTNAME=127.0.0.1");

    for (const source of [legacyPm2, releasePm2, workflow, deployment]) {
      expect(source).not.toContain("HOSTNAME=0.0.0.0");
    }
  });

  it("keeps client identity headers under the local reverse proxy's control", () => {
    const nginx = read("deploy/nginx-wedding.conf");
    expect(nginx).toContain("proxy_pass http://127.0.0.1:3000");
    expect(nginx).toContain("proxy_set_header X-Real-IP $remote_addr");
    expect(nginx).toContain("proxy_set_header X-Forwarded-For $remote_addr");
    expect(nginx).not.toContain("$proxy_add_x_forwarded_for");
  });

  it("emits HSTS only for HTTPS at the production reverse proxy", () => {
    const nginx = read("deploy/nginx-wedding.conf");
    expect(nginx).toContain("map $scheme $wedding_hsts");
    expect(nginx).toContain('https "max-age=31536000"');
    expect(nginx).toContain("add_header Strict-Transport-Security $wedding_hsts always");
    expect(read("next.config.ts")).not.toContain("Strict-Transport-Security");
  });

  it("requires a verified persistent-data snapshot before auto deployment", () => {
    const autoDeploy = read(".github/workflows/auto-deploy.yml");
    const backupStep = autoDeploy.indexOf("Snapshot production before deploy");
    const dispatchStep = autoDeploy.indexOf("Dispatch tested main revision");

    expect(backupStep).toBeGreaterThan(0);
    expect(dispatchStep).toBeGreaterThan(backupStep);
    expect(autoDeploy).toContain("wal_checkpoint(TRUNCATE)");
    expect(autoDeploy).toContain("integrity_check");
    expect(autoDeploy).toContain("uploads.tgz");
    expect(autoDeploy).toContain("cancel-in-progress: false");
  });

  it("keeps scheduled offsite backups encrypted and optional", () => {
    const backupWorkflow = read(".github/workflows/backup-production.yml");
    expect(backupWorkflow).toContain("aes-256-cbc -pbkdf2 -salt");
    expect(backupWorkflow).toContain("BACKUP_ENCRYPTION_KEY");
    expect(backupWorkflow).toContain("retention-days: 30");
    expect(backupWorkflow).toContain("SQLite integrity check + uploads archive");
    expect(backupWorkflow).not.toContain("path: offsite-plain");
  });
});
