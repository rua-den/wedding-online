import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { createAdminSession } from "@/lib/admin-auth";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { GET, PUT } from "./route";

let directory: string;

function request(init: RequestInit = {}, authenticated = true) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (authenticated) headers.set("cookie", `wedding_admin_session=${createAdminSession()}`);
  return new Request("http://localhost/api/admin/content", { ...init, headers });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-content-"));
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

describe("/api/admin/content", () => {
  it("rejects unauthenticated reads and writes", async () => {
    expect((await GET(request({}, false))).status).toBe(401);
    expect((await PUT(request({ method: "PUT", body: JSON.stringify(defaultInvitationContent()) }, false))).status).toBe(401);
  });

  it("returns defaults and persists section edits", async () => {
    const initial = await GET(request());
    expect(initial.status).toBe(200);
    await expect(initial.json()).resolves.toMatchObject({ content: { couple: { shortGroomName: "Huy" } } });

    const content = defaultInvitationContent();
    content.cover.message = "Lời mời đã sửa";
    content.event.venue = "Sảnh Editor";
    content.event.address = "88 Đường Editor";
    content.event.mapsUrl = "https://www.google.com/maps?q=Sanh+Editor";

    const saved = await PUT(request({ method: "PUT", body: JSON.stringify(content) }));
    expect(saved.status).toBe(200);
    await expect(saved.json()).resolves.toMatchObject({ content: { cover: { message: "Lời mời đã sửa" }, event: { venue: "Sảnh Editor" } } });
  });
});
