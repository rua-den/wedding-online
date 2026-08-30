import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminSession } from "@/lib/admin-auth";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { GET, PUT } from "./route";

let directory: string;

function request(init: RequestInit = {}, authenticated = true) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (authenticated) headers.set("cookie", `wedding_admin_session=${createAdminSession()}`);
  return new Request("http://localhost/api/admin/appearance", { ...init, headers });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-appearance-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("/api/admin/appearance", () => {
  it("rejects unauthenticated reads and writes", async () => {
    expect((await GET(request({}, false))).status).toBe(401);
    expect((await PUT(request({ method: "PUT", body: JSON.stringify({ themeId: "sage-garden", fontId: "lora" }) }, false))).status).toBe(401);
  });

  it("returns defaults and persists theme plus font", async () => {
    await expect((await GET(request())).json()).resolves.toMatchObject({
      appearance: { themeId: "ivory-gold", fontId: "classic-serif" },
    });

    const saved = await PUT(request({
      method: "PUT",
      body: JSON.stringify({ themeId: "sage-garden", fontId: "cormorant-garamond" }),
    }));
    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({
      appearance: { themeId: "sage-garden", fontId: "cormorant-garamond" },
    });
    await expect((await GET(request())).json()).resolves.toMatchObject({
      appearance: { themeId: "sage-garden", fontId: "cormorant-garamond" },
    });
  });

  it("rejects unknown presets, missing fields and extra fields", async () => {
    expect((await PUT(request({ method: "PUT", body: JSON.stringify({ themeId: "rainbow", fontId: "lora" }) }))).status).toBe(400);
    expect((await PUT(request({ method: "PUT", body: JSON.stringify({ themeId: "ivory-gold", fontId: "comic-sans" }) }))).status).toBe(400);
    expect((await PUT(request({ method: "PUT", body: JSON.stringify({ themeId: "ivory-gold" }) }))).status).toBe(400);
    expect((await PUT(request({ method: "PUT", body: JSON.stringify({ themeId: "ivory-gold", fontId: "lora", css: "*{}" }) }))).status).toBe(400);
  });
});
