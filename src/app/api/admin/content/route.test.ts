import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { createAdminSession } from "@/lib/admin-auth";
import { closeDatabaseForTests } from "@/lib/sqlite";
import { createMediaAsset } from "@/lib/media-store";
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
  process.env.MEDIA_UPLOAD_DIRECTORY = join(directory, "uploads");
  mkdirSync(process.env.MEDIA_UPLOAD_DIRECTORY, { recursive: true });
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  delete process.env.MEDIA_UPLOAD_DIRECTORY;
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

  it("removes a replaced QR upload while retaining the new one", async () => {
    const oldQr = "/uploads/1788039145650-f2a49997-39dd-4e53-878c-3cb63437fefe.png";
    const newQr = "/uploads/1788039145651-f2a49997-39dd-4e53-878c-3cb63437fefe.png";
    writeFileSync(join(directory, "uploads", oldQr.slice("/uploads/".length)), "old");
    writeFileSync(join(directory, "uploads", newQr.slice("/uploads/".length)), "new");
    const first = defaultInvitationContent(); first.gift.qrImageSrc = oldQr;
    expect((await PUT(request({ method: "PUT", body: JSON.stringify(first) }))).status).toBe(200);
    const second = defaultInvitationContent(); second.gift.qrImageSrc = newQr;
    expect((await PUT(request({ method: "PUT", body: JSON.stringify(second) }))).status).toBe(200);
    expect(existsSync(join(directory, "uploads", oldQr.slice("/uploads/".length)))).toBe(false);
    expect(existsSync(join(directory, "uploads", newQr.slice("/uploads/".length)))).toBe(true);
  });

  it("retains a QR upload still referenced by a media asset", async () => {
    const sharedQr = "/uploads/1788039145652-f2a49997-39dd-4e53-878c-3cb63437fefe.png";
    const replacement = "/uploads/1788039145653-f2a49997-39dd-4e53-878c-3cb63437fefe.png";
    writeFileSync(join(directory, "uploads", sharedQr.slice("/uploads/".length)), "shared");
    writeFileSync(join(directory, "uploads", replacement.slice("/uploads/".length)), "replacement");
    const first = defaultInvitationContent(); first.gift.qrImageSrc = sharedQr;
    await PUT(request({ method: "PUT", body: JSON.stringify(first) }));
    createMediaAsset({ slot: "gallery", src: sharedQr, alt: "QR" });
    const second = defaultInvitationContent(); second.gift.qrImageSrc = replacement;
    expect((await PUT(request({ method: "PUT", body: JSON.stringify(second) }))).status).toBe(200);
    expect(existsSync(join(directory, "uploads", sharedQr.slice("/uploads/".length)))).toBe(true);
  });
});
