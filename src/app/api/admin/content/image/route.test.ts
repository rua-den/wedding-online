import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminSession } from "@/lib/admin-auth";
import { POST } from "./route";

let directory: string;

function uploadRequest(authenticated = true) {
  const form = new FormData();
  form.set("file", new File([Buffer.from("image-bytes")], "story.png", { type: "image/png" }));
  const headers = new Headers();
  if (authenticated) headers.set("cookie", `wedding_admin_session=${createAdminSession()}`);
  return new Request("http://localhost/api/admin/content/image", { method: "POST", body: form, headers });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "story-image-"));
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
  vi.stubEnv("MEDIA_UPLOAD_DIRECTORY", join(directory, "uploads"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("/api/admin/content/image", () => {
  it("rejects unauthenticated uploads", async () => {
    expect((await POST(uploadRequest(false))).status).toBe(401);
  });

  it("stores an authenticated milestone image in the shared upload directory", async () => {
    const response = await POST(uploadRequest());
    expect(response.status).toBe(201);
    const body = await response.json() as { src: string };
    expect(body.src).toMatch(/^\/uploads\/.+\.png$/);
    expect(existsSync(join(directory, "uploads", basename(body.src)))).toBe(true);
  });
});
