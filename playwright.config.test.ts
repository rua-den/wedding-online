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

  it("starts the E2E server through the dotenv-safe wrapper", () => {
    const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
    expect(webServer?.command).toContain("node e2e/start-server.mjs");
    expect(webServer?.env).toHaveProperty("E2E_ADMIN_PASSWORD_HASH");
    expect(webServer?.env).not.toHaveProperty("ADMIN_PASSWORD_HASH");
  });
});
