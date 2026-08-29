import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { createMediaAsset, listActiveMedia } from "@/lib/media-store";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { PUT } from "./route";

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-media-order-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
});
afterEach(() => { closeDatabaseForTests(); vi.unstubAllEnvs(); delete process.env.SQLITE_PATH; rmSync(directory, { recursive: true, force: true }); });

describe("PUT /api/admin/media/order", () => {
  it("reorders gallery assets for an authenticated admin", async () => {
    const first = createMediaAsset({ slot: "gallery", src: "/uploads/first.jpg" });
    const second = createMediaAsset({ slot: "gallery", src: "/uploads/second.jpg" });
    const response = await PUT(new Request("http://localhost/api/admin/media/order", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: `wedding_admin_session=${createAdminSession()}` },
      body: JSON.stringify({ ids: [second.id, first.id] }),
    }));
    expect(response.status).toBe(200);
    expect(listActiveMedia().map((asset) => asset.src)).toEqual(["/uploads/second.jpg", "/uploads/first.jpg"]);
  });

  it("rejects duplicate gallery IDs instead of reporting success", async () => {
    const first = createMediaAsset({ slot: "gallery", src: "/uploads/duplicate-first.jpg" });
    const second = createMediaAsset({ slot: "gallery", src: "/uploads/duplicate-second.jpg" });
    const response = await PUT(new Request("http://localhost/api/admin/media/order", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: `wedding_admin_session=${createAdminSession()}` },
      body: JSON.stringify({ ids: [first.id, first.id] }),
    }));

    expect(response.status).toBe(400);
    expect(listActiveMedia().map((asset) => asset.id)).toEqual([first.id, second.id]);
  });
});
