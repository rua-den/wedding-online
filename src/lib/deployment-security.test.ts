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
});
