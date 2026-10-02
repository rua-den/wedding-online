import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
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

  it("requires CD_ENABLED before automatic production dispatch", () => {
    const autoDeploy = read(".github/workflows/auto-deploy.yml");
    expect(autoDeploy).toContain("vars.CD_ENABLED == 'true'");
    expect(autoDeploy).toContain("github.event.workflow_run.event == 'push'");
    expect(autoDeploy).toContain("-f deploy_to_vps=true");
  });

  it("guards persistent SQLite, uploads, and music around activation", () => {
    const workflow = read(".github/workflows/ci.yml");
    const verifier = read("deploy/verify-persistent-state.cjs");

    expect(workflow).toContain('node --env-file=.env verify-persistent-state.cjs "$mode" "$STATE_FILE"');
    expect(workflow).toContain('verify_persistent_state snapshot "$RELEASE"');
    expect(workflow).toContain('verify_persistent_state verify "$RELEASE"');
    expect(workflow).toContain("EXPECTED_SHARED_DATA");
    expect(workflow).toContain("EXPECTED_SHARED_UPLOADS");
    expect(verifier).toContain('db.pragma("integrity_check")');
    expect(verifier).toContain("snapshot.db.backup(backupPath)");
    expect(verifier).toContain("row count decreased across deploy");
    expect(verifier).toContain("persisted upload disappeared across deploy");
    expect(verifier).toContain("music file referenced by SQLite is missing");
  });

  it("limits production readiness audit to opted-in dispatch or the dedicated tag", () => {
    const workflow = read(".github/workflows/ci.yml");
    const dispatchInputs = workflow.split("  workflow_dispatch:")[1]?.split("\n\npermissions:")[0] ?? "";
    const auditJob = workflow.split("  production-readiness:")[1]?.split(/\n  [a-z0-9-]+:/)[0] ?? "";
    const remoteAudit = auditJob.split("<<'REMOTE_AUDIT'")[1]?.split("REMOTE_AUDIT")[0] ?? "";

    expect(dispatchInputs).toContain("verify_production:");
    expect(dispatchInputs).toContain("default: false");
    expect(auditJob).toContain("github.event_name == 'workflow_dispatch'");
    expect(auditJob).toContain("inputs.verify_production");
    expect(auditJob).toContain("!inputs.deploy_to_vps");
    expect(auditJob).not.toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("tags: [production-readiness/*]");
    expect(auditJob).toContain("github.event_name == 'push'");
    expect(auditJob).toContain("startsWith(github.ref, 'refs/tags/production-readiness/')");
    expect(auditJob).toContain("needs: e2e");
    expect(auditJob).toContain("environment: production");
    expect(auditJob).toContain("contents: read");
    expect(auditJob).toContain("vars.CD_ENABLED");
    expect(auditJob).toContain('[ "${CD_ENABLED:-}" = "true" ]');
    expect(auditJob).toContain("exit 1");
    expect(auditJob).toContain("StrictHostKeyChecking=yes");
    expect(auditJob).toContain("BatchMode=yes");
    expect(auditJob).toContain("node --env-file=.env --input-type=commonjs - audit");
    expect(auditJob).toContain("printf -v root_arg '%q' \"$VPS_APP_ROOT\"");
    expect(remoteAudit).not.toMatch(/(?:^|\n)\s*pm2\s+[a-z][\w-]*|[;|&($]\s*pm2\s+[a-z][\w-]*/m);
    expect(remoteAudit).not.toMatch(/\b(?:pm2\s+(?:save|reload|delete|start)|mkdir\s+-p|chmod\s|ln\s+-s|mv\s|cp\s|scp\s|tar\s+-x|sqlite3\s)/);
    const gateStep = auditJob.split("- name: Check automatic deployment gate")[1]?.split("- name:")[0] ?? "";
    expect(gateStep).not.toContain("secrets.");
    expect(workflow).toContain("github.ref == 'refs/heads/main' &&\n      ((github.event_name == 'push' && vars.CD_ENABLED == 'true') ||\n       (github.event_name == 'workflow_dispatch' && inputs.deploy_to_vps))");
    expect(read(".github/workflows/auto-deploy.yml")).toContain("vars.CD_ENABLED == 'true'");
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
});
