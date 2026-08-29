import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDatabaseForTests, getDatabase, initializeDatabase } from "./sqlite";
import {
  createMediaAsset,
  deleteMediaAsset,
  listActiveMedia,
  listAdminMedia,
  reorderMediaAssets,
  toPublicMediaAsset,
  updateMediaAsset,
} from "./media-store";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "wedding-media-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});

describe("SQLite media repository", () => {
  it("migrates an existing media table with centered crop defaults", () => {
    const connection = getDatabase();
    connection.exec(`
      CREATE TABLE media_assets (
        id INTEGER PRIMARY KEY,
        slot TEXT NOT NULL,
        src TEXT NOT NULL UNIQUE,
        alt TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    connection.prepare(`
      INSERT INTO media_assets (slot, src, alt, sort_order, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("hero", "/uploads/legacy.jpg", "Legacy", 0, 1, "now", "now");
    closeDatabaseForTests();

    initializeDatabase();

    expect(listAdminMedia()).toMatchObject([{ src: "/uploads/legacy.jpg", focusX: 50, focusY: 50, zoom: 1 }]);
    expect(() => initializeDatabase()).not.toThrow();
  });

  it("adds centered crop defaults to existing media", () => {
    const created = createMediaAsset({ slot: "hero", src: "/uploads/hero.jpg" });
    expect(created).toMatchObject({ focusX: 50, focusY: 50, zoom: 1 });
  });

  it("clamps crop metadata before persistence", () => {
    const created = createMediaAsset({ slot: "hero", src: "/uploads/hero.jpg" });
    const updated = updateMediaAsset({ id: created.id, focusX: -12, focusY: 160, zoom: 9 });
    expect(updated).toMatchObject({ focusX: 0, focusY: 100, zoom: 3 });
  });

  it("keeps one active asset for singleton slots", () => {
    createMediaAsset({ slot: "hero", src: "/uploads/first.jpg", alt: "First" });
    createMediaAsset({ slot: "hero", src: "/uploads/second.jpg", alt: "Second" });

    expect(listActiveMedia().filter((asset) => asset.slot === "hero")).toEqual([
      expect.objectContaining({ src: "/uploads/second.jpg", active: true }),
    ]);
    expect(listAdminMedia().find((asset) => asset.src === "/uploads/first.jpg")).toEqual(
      expect.objectContaining({ active: false }),
    );
  });

  it("rolls back singleton deactivation when replacement insertion fails", () => {
    const original = createMediaAsset({ slot: "hero", src: "/uploads/original.jpg", alt: "Original" });

    expect(() => createMediaAsset({ slot: "hero", src: original.src, alt: "Replacement" })).toThrow();

    expect(listAdminMedia().find((asset) => asset.id === original.id)).toEqual(
      expect.objectContaining({ active: true, alt: "Original" }),
    );
  });

  it("rolls back the active asset when retained singleton activation fails", () => {
    const current = createMediaAsset({ slot: "hero", src: "/uploads/current.jpg", alt: "Current" });
    const retained = createMediaAsset({ slot: "hero", src: "/uploads/retained.jpg", alt: "Retained", active: false });
    getDatabase().exec(`
      CREATE TRIGGER fail_retained_activation
      BEFORE UPDATE OF active ON media_assets
      WHEN OLD.id = ${retained.id} AND NEW.active = 1
      BEGIN
        SELECT RAISE(ABORT, 'retained activation failed');
      END
    `);

    expect(() => updateMediaAsset({ id: retained.id, active: true })).toThrow("retained activation failed");

    expect(listAdminMedia().find((asset) => asset.id === current.id)).toEqual(expect.objectContaining({ active: true }));
    expect(listAdminMedia().find((asset) => asset.id === retained.id)).toEqual(expect.objectContaining({ active: false }));
  });

  it("orders gallery assets by sort order", () => {
    const first = createMediaAsset({ slot: "gallery", src: "/uploads/first.jpg", alt: "First" });
    const second = createMediaAsset({ slot: "gallery", src: "/uploads/second.jpg", alt: "Second" });

    reorderMediaAssets([second.id, first.id]);

    expect(listActiveMedia().filter((asset) => asset.slot === "gallery").map((asset) => asset.src)).toEqual([
      "/uploads/second.jpg",
      "/uploads/first.jpg",
    ]);
  });

  it("rejects incomplete or non-unique gallery orders without changing the order", () => {
    const first = createMediaAsset({ slot: "gallery", src: "/uploads/order-first.jpg" });
    const second = createMediaAsset({ slot: "gallery", src: "/uploads/order-second.jpg" });
    const hero = createMediaAsset({ slot: "hero", src: "/uploads/order-hero.jpg" });

    expect(() => reorderMediaAssets([first.id, first.id])).toThrow("Danh sách thứ tự ảnh không hợp lệ.");
    expect(() => reorderMediaAssets([first.id])).toThrow("Danh sách thứ tự ảnh không hợp lệ.");
    expect(() => reorderMediaAssets([second.id, hero.id])).toThrow("Danh sách thứ tự ảnh không hợp lệ.");
    expect(() => reorderMediaAssets([first.id, 99999])).toThrow("Danh sách thứ tự ảnh không hợp lệ.");

    expect(listActiveMedia().filter((asset) => asset.slot === "gallery").map((asset) => asset.id)).toEqual([first.id, second.id]);
  });

  it("deletes an asset and tolerates a repeated delete", () => {
    const asset = createMediaAsset({ slot: "gallery", src: "/uploads/photo.jpg", alt: "Photo" });

    expect(deleteMediaAsset(asset.id)).toBe(true);
    expect(deleteMediaAsset(asset.id)).toBe(false);
    expect(listActiveMedia()).toEqual([]);
  });

  it("maps media to a public DTO without database identifiers or timestamps", () => {
    const asset = createMediaAsset({ slot: "gallery", src: "/uploads/public.jpg", alt: "Public" });

    const publicAsset = toPublicMediaAsset(asset);

    expect(publicAsset).toEqual({
      slot: "gallery",
      src: "/uploads/public.jpg",
      alt: "Public",
      sortOrder: 0,
      active: true,
      focusX: 50,
      focusY: 50,
      zoom: 1,
    });
    expect("id" in publicAsset).toBe(false);
    expect("createdAt" in publicAsset).toBe(false);
    expect("updatedAt" in publicAsset).toBe(false);
  });
});
