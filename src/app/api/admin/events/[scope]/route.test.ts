import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminSession } from "@/lib/admin-auth";
import { defaultInvitationContent } from "@/config/invitation-content";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { PUT } from "./route";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-events-"));
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

function request(body: unknown, authenticated = true) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authenticated) headers.set("cookie", `wedding_admin_session=${createAdminSession()}`);
  return new Request("http://localhost/api/admin/events/oct11", { method: "PUT", headers, body: JSON.stringify(body) });
}

function profile() {
  return {
    ...defaultInvitationContent().event,
    scope: "oct11" as const,
    dateTime: "2026-10-11T11:00:00+07:00",
    dateLabel: "11/10/2026",
    rsvpDeadline: "2026-10-10T23:00:00+07:00",
    venue: "Sảnh 11",
  };
}

describe("PUT /api/admin/events/[scope]", () => {
  it("rejects unauthenticated writes", async () => {
    const response = await PUT(request(profile(), false), { params: Promise.resolve({ scope: "oct11" }) });
    expect(response.status).toBe(401);
  });

  it("saves a valid dated event profile", async () => {
    const response = await PUT(request(profile()), { params: Promise.resolve({ scope: "oct11" }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ profile: { scope: "oct11", venue: "Sảnh 11", dateLabel: "11/10/2026" } });
  });

  it("rejects unknown event scopes", async () => {
    const response = await PUT(request(profile()), { params: Promise.resolve({ scope: "oct99" }) });
    expect(response.status).toBe(404);
  });

  it("rejects a date that does not match the route scope", async () => {
    const response = await PUT(request({ ...profile(), dateTime: "2026-10-31T11:00:00+07:00" }), { params: Promise.resolve({ scope: "oct11" }) });
    expect(response.status).toBe(400);
  });
});
