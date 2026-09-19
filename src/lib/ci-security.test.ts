import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("GitHub Actions supply-chain policy", () => {
  it("pins every external action invocation to an immutable full commit SHA", () => {
    const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s@]+)@([^\s#]+)/gm)];
    expect(uses.length).toBeGreaterThan(0);

    for (const [, action, ref] of uses) {
      expect(action).toMatch(/^actions\//);
      expect(ref).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("keeps repository permissions read-only by default", () => {
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).not.toContain("write-all");
    expect(workflow).not.toContain("id-token: write");
  });
});
