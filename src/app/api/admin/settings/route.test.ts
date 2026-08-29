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
  return new Request("http://localhost/api/admin/settings", { ...init, headers });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-site-settings-"));
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

const validSettings = {
  venue: "Sảnh Hoa",
  address: "12 Đường Mùa Xuân",
  dateLabel: "Thứ bảy, ngày 20 tháng 12 năm 2027",
  timeLabel: "18:00",
  mapsUrl: "https://www.google.com/maps?q=Sanh+Hoa",
};

describe("/api/admin/settings", () => {
  it("rejects unauthenticated reads and writes", async () => {
    expect((await GET(request({}, false))).status).toBe(401);
    expect((await PUT(request({ method: "PUT", body: JSON.stringify(validSettings) }, false))).status).toBe(401);
  });

  it("returns config fallbacks before saving and persists a validated override", async () => {
    const initial = await GET(request());
    expect(initial.status).toBe(200);
    await expect(initial.json()).resolves.toMatchObject({ settings: { venue: "The Garden Wedding Venue" } });

    const saved = await PUT(request({ method: "PUT", body: JSON.stringify(validSettings) }));
    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({ settings: validSettings });
    await expect((await GET(request())).json()).resolves.toMatchObject({ settings: validSettings });
  });

  it("returns a Vietnamese validation error for an unsafe maps URL", async () => {
    const response = await PUT(request({
      method: "PUT",
      body: JSON.stringify({ ...validSettings, mapsUrl: "https://example.com/not-maps" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: expect.stringContaining("Google Maps") });
  });
});
