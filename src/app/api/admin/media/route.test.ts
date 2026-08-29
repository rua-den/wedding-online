import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { createMediaAsset, listAdminMedia } from "@/lib/media-store";
import { createUploadFilename } from "@/lib/media-upload";
import * as mediaStore from "@/lib/media-store";
import * as mediaUpload from "@/lib/media-upload";
import { GET, POST, PATCH, DELETE } from "./route";

let directory: string;
function headers(authenticated = true) {
  const result = new Headers();
  if (authenticated) result.set("cookie", `wedding_admin_session=${createAdminSession()}`);
  return result;
}
function imageRequest(file = new File(["image"], "photo.jpg", { type: "image/jpeg" }), authenticated = true) {
  const form = new FormData();
  form.set("file", file);
  form.set("slot", "gallery");
  form.set("alt", "Ảnh cưới");
  return new Request("http://localhost/api/admin/media", { method: "POST", headers: headers(authenticated), body: form });
}

function jsonRequest(method: "PATCH" | "DELETE", body: unknown) {
  return new Request("http://localhost/api/admin/media", {
    method,
    headers: new Headers([...headers(), ["content-type", "application/json"]]),
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "admin-media-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  process.env.MEDIA_UPLOAD_DIRECTORY = join(directory, "uploads");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
});
afterEach(() => {
  vi.restoreAllMocks(); closeDatabaseForTests(); vi.unstubAllEnvs(); delete process.env.SQLITE_PATH; delete process.env.MEDIA_UPLOAD_DIRECTORY;
  rmSync(directory, { recursive: true, force: true });
});

describe("/api/admin/media", () => {
  it("rejects unauthenticated upload", async () => expect((await POST(imageRequest(undefined, false))).status).toBe(401));
  it("uploads an image and lists metadata", async () => {
    const response = await POST(imageRequest());
    expect(response.status).toBe(201);
    const created = await response.json() as { asset: { id: number; src: string; slot: string } };
    expect(created.asset).toMatchObject({ slot: "gallery", src: expect.stringMatching(/^\/uploads\/.+\.jpg$/) });
    expect((await GET(new Request("http://localhost/api/admin/media", { headers: headers() }))).status).toBe(200);
  });
  it("rejects a non-image upload", async () => {
    const response = await POST(imageRequest(new File(["pdf"], "file.pdf", { type: "application/pdf" })));
    expect(response.status).toBe(400);
  });
  it("updates and deletes an uploaded asset", async () => {
    const created = await (await POST(imageRequest())).json() as { asset: { id: number } };
    const updated = await PATCH(jsonRequest("PATCH", { id: created.asset.id, alt: "Ảnh mới", slot: "hero" }));
    expect(updated.status).toBe(200);
    const updatedBody = await updated.json();
    expect(updatedBody).toMatchObject({ asset: { slot: "hero", alt: "Ảnh mới" } });
    const deleted = await DELETE(jsonRequest("DELETE", { id: created.asset.id }));
    expect(deleted.status).toBe(200);
  });

  it("updates crop metadata", async () => {
    const created = await (await POST(imageRequest())).json() as { asset: { id: number } };
    const response = await PATCH(jsonRequest("PATCH", { id: created.asset.id, focusX: 24, focusY: 72, zoom: 1.6 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ asset: { focusX: 24, focusY: 72, zoom: 1.6 } });
  });

  it("rejects an overlong PATCH alt and keeps the existing value", async () => {
    const created = await (await POST(imageRequest())).json() as { asset: { id: number } };
    const response = await PATCH(jsonRequest("PATCH", { id: created.asset.id, alt: "x".repeat(161) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: "Mô tả ảnh quá dài." });
    expect(listAdminMedia().find((asset) => asset.id === created.asset.id)?.alt).toBe("Ảnh cưới");
  });

  it("keeps a Vietnamese JSON error when database failure cleanup also fails", async () => {
    vi.spyOn(mediaStore, "createMediaAsset").mockImplementation(() => { throw new Error("database unavailable"); });
    vi.spyOn(mediaUpload, "removeMediaFile").mockRejectedValue(new Error("cleanup unavailable"));

    const response = await POST(imageRequest());

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ message: "Không thể lưu ảnh lúc này." });
  });

  it("does not unlink a retained non-generated upload source", async () => {
    const uploadDirectory = join(directory, "uploads");
    const retainedPath = join(uploadDirectory, "hero.jpg");
    mkdirSync(uploadDirectory, { recursive: true });
    writeFileSync(retainedPath, "retained");
    const asset = createMediaAsset({ slot: "gallery", src: "/uploads/hero.jpg", alt: "Retained" });

    const response = await DELETE(jsonRequest("DELETE", { id: asset.id }));

    expect(response.status).toBe(200);
    expect(existsSync(retainedPath)).toBe(true);
  });

  it("surfaces unlink failures and keeps metadata when the owned path cannot be removed", async () => {
    const filename = createUploadFilename("photo.jpg");
    const asset = createMediaAsset({ slot: "gallery", src: `/uploads/${filename}`, alt: "Blocked" });
    mkdirSync(join(directory, "uploads", filename), { recursive: true });

    const response = await DELETE(jsonRequest("DELETE", { id: asset.id }));

    expect(response.status).toBe(500);
    expect(listAdminMedia().find((candidate) => candidate.id === asset.id)).toBeDefined();
  });
});
