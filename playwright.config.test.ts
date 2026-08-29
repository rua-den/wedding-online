import { describe, expect, it } from "vitest";

import config from "./playwright.config";

describe("Playwright visual evidence configuration", () => {
  it("allows the crop parity flow enough time for its UI interactions", () => {
    expect(config.timeout).toBe(45_000);
  });

  it("captures a full-page screenshot for every test", () => {
    expect(config.use?.screenshot).toEqual({ mode: "on", fullPage: true });
  });

  it("stores raw screenshots and traces in the CI artifact directory", () => {
    expect(config.outputDir).toBe("test-results");
  });

  it("writes an HTML report without opening it automatically", () => {
    expect(config.reporter).toEqual([
      ["line"],
      ["html", { outputFolder: "playwright-report", open: "never" }],
    ]);
  });
});
