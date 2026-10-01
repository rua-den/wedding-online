import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflowDirectory = ".github/workflows";
const workflows = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .map((name) => ({ name, content: readFileSync(join(workflowDirectory, name), "utf8") }));
const ciWorkflow = workflows.find((workflow) => workflow.name === "ci.yml")?.content ?? "";

describe("GitHub Actions supply-chain policy", () => {
  it("pins every external action invocation to an immutable full commit SHA", () => {
    const uses = workflows.flatMap(({ name, content }) =>
      [...content.matchAll(/^\s*uses:\s*([^\s@]+)@([^\s#]+)/gm)].map((match) => ({ name, action: match[1], ref: match[2] })),
    );
    expect(uses.length).toBeGreaterThan(0);

    for (const { action, ref } of uses) {
      expect(action).toMatch(/^actions\//);
      expect(ref).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("keeps the main CI repository permissions read-only by default", () => {
    expect(ciWorkflow).toContain("permissions:\n  contents: read");
    expect(ciWorkflow).not.toContain("write-all");
    expect(ciWorkflow).not.toContain("id-token: write");
  });

  it("does not expose production secrets to every step in the deploy job", () => {
    const deployJob = ciWorkflow.split("  deploy-production:")[1];
    expect(deployJob).toBeTruthy();
    const deployJobHeader = deployJob!.split("\n    steps:")[0];
    expect(deployJobHeader).not.toContain("secrets.");
  });
});
