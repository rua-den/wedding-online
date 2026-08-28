import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { GET, PATCH, POST } from "./route";

let directory: string;
function request(path = "/api/admin/invitations", init: RequestInit = {}, authenticated = true) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (authenticated) headers.set("cookie", `wedding_admin_session=${createAdminSession()}`);
  return new Request(`http://localhost${path}`, { ...init, headers });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-invitations-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
});
afterEach(() => {
  closeDatabaseForTests(); vi.unstubAllEnvs(); delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("/api/admin/invitations", () => {
  it("rejects an unauthenticated invitation create before parsing the body", async () => {
    const response = await POST(request("/api/admin/invitations", { method: "POST", body: "not-json" }, false));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("creates, lists, edits and deactivates an invitation", async () => {
    const created = await POST(request("/api/admin/invitations", {
      method: "POST", body: JSON.stringify({ name: "Cô Lan", maxGuests: 2 }),
    }));
    expect(created.status).toBe(201);
    const createdBody = await created.json() as { invitation: { code: string }; invitationUrl: string };
    expect(createdBody.invitationUrl).toContain(`/moi/${createdBody.invitation.code}`);

    const changed = await PATCH(request("/api/admin/invitations", {
      method: "PATCH", body: JSON.stringify({ code: createdBody.invitation.code, name: "Cô Lan & Chú Minh", active: false }),
    }));
    expect(changed.status).toBe(200);
    await expect(changed.json()).resolves.toMatchObject({ invitation: { name: "Cô Lan & Chú Minh", active: false } });

    const listed = await GET(request("/api/admin/invitations?q=chú"));
    await expect(listed.json()).resolves.toMatchObject({ invitations: [{ code: createdBody.invitation.code }], summary: { invitationCount: 1 } });
  });

  it("returns 400 for malformed JSON", async () => {
    expect((await POST(request("/api/admin/invitations", { method: "POST", body: "{" }))).status).toBe(400);
  });
});

