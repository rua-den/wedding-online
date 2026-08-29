import { getDatabase, initializeDatabase } from "./sqlite";
import { validateMediaAlt } from "./media-text";

export const mediaSlots = ["hero", "groom", "bride", "story", "venue", "gallery"] as const;
export type MediaSlot = (typeof mediaSlots)[number];

export type MediaAsset = {
  id: number;
  slot: MediaSlot;
  src: string;
  alt: string;
  sortOrder: number;
  active: boolean;
  focusX: number;
  focusY: number;
  zoom: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicMediaAsset = Pick<MediaAsset, "slot" | "src" | "alt" | "sortOrder" | "active" | "focusX" | "focusY" | "zoom">;

type MediaRow = {
  id: number;
  slot: MediaSlot;
  src: string;
  alt: string;
  sort_order: number;
  active: number;
  focus_x: number;
  focus_y: number;
  zoom: number;
  created_at: string;
  updated_at: string;
};

export class MediaNotFoundError extends Error {}
export class InvalidMediaSlotError extends Error {}
export class InvalidMediaOrderError extends Error {}

function database() {
  initializeDatabase();
  return getDatabase();
}

function assertSlot(slot: string): asserts slot is MediaSlot {
  if (!mediaSlots.includes(slot as MediaSlot)) throw new InvalidMediaSlotError("Vị trí ảnh không hợp lệ.");
}

function mapMedia(row: MediaRow): MediaAsset {
  return {
    id: Number(row.id),
    slot: row.slot,
    src: row.src,
    alt: row.alt,
    sortOrder: Number(row.sort_order),
    active: row.active === 1,
    focusX: Number(row.focus_x),
    focusY: Number(row.focus_y),
    zoom: Number(row.zoom),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPublicMediaAsset(asset: MediaAsset): PublicMediaAsset {
  return {
    slot: asset.slot,
    src: asset.src,
    alt: asset.alt,
    sortOrder: asset.sortOrder,
    active: asset.active,
    focusX: asset.focusX,
    focusY: asset.focusY,
    zoom: asset.zoom,
  };
}

function clampFinite(value: number | undefined, minimum: number, maximum: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function selectById(connection: ReturnType<typeof getDatabase>, id: number): MediaAsset | null {
  const row = connection.prepare(`
    SELECT id, slot, src, alt, sort_order, active, focus_x, focus_y, zoom, created_at, updated_at
    FROM media_assets WHERE id = ?
  `).get(id) as MediaRow | undefined;
  return row ? mapMedia(row) : null;
}

export function listActiveMedia(): MediaAsset[] {
  const rows = database().prepare(`
    SELECT id, slot, src, alt, sort_order, active, focus_x, focus_y, zoom, created_at, updated_at
    FROM media_assets WHERE active = 1
    ORDER BY slot, sort_order, id
  `).all() as MediaRow[];
  return rows.map(mapMedia);
}

export function listAdminMedia(): MediaAsset[] {
  const rows = database().prepare(`
    SELECT id, slot, src, alt, sort_order, active, focus_x, focus_y, zoom, created_at, updated_at
    FROM media_assets ORDER BY slot, sort_order, id
  `).all() as MediaRow[];
  return rows.map(mapMedia);
}

export function createMediaAsset(input: {
  slot: MediaSlot;
  src: string;
  alt?: string;
  active?: boolean;
}): MediaAsset {
  assertSlot(input.slot);
  const alt = validateMediaAlt(input.alt ?? "");
  const connection = database();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const now = new Date().toISOString();
    const active = input.active ?? true;
    const sortOrder = Number((connection.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM media_assets WHERE slot = ?").get(input.slot) as { max_order: number }).max_order) + 1;

    if (input.slot !== "gallery" && active) {
      connection.prepare("UPDATE media_assets SET active = 0, updated_at = ? WHERE slot = ? AND active = 1").run(now, input.slot);
    }

    const result = connection.prepare(`
      INSERT INTO media_assets (slot, src, alt, sort_order, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.slot, input.src.trim(), alt, sortOrder, Number(active), now, now) as { lastInsertRowid?: number | bigint };
    const created = selectById(connection, Number(result.lastInsertRowid));
    if (!created) throw new Error("Không thể đọc ảnh vừa tạo.");
    connection.exec("COMMIT");
    return created;
  } catch (error) {
    try {
      connection.exec("ROLLBACK");
    } catch {
      // Preserve the original write error when rollback itself cannot run.
    }
    throw error;
  }
}

export function updateMediaAsset(input: {
  id: number;
  slot?: MediaSlot;
  alt?: string;
  active?: boolean;
  focusX?: number;
  focusY?: number;
  zoom?: number;
}): MediaAsset {
  const connection = database();
  const current = selectById(connection, input.id);
  if (!current) throw new MediaNotFoundError("Không tìm thấy ảnh.");
  const slot = input.slot ?? current.slot;
  assertSlot(slot);
  const alt = input.alt === undefined ? current.alt : validateMediaAlt(input.alt);
  const now = new Date().toISOString();
  const focusX = clampFinite(input.focusX, 0, 100, current.focusX);
  const focusY = clampFinite(input.focusY, 0, 100, current.focusY);
  const zoom = clampFinite(input.zoom, 1, 3, current.zoom);
  connection.exec("BEGIN IMMEDIATE");
  try {
    if (slot !== "gallery" && (input.active ?? current.active)) {
      connection.prepare("UPDATE media_assets SET active = 0, updated_at = ? WHERE slot = ? AND id <> ? AND active = 1").run(now, slot, input.id);
    }
    connection.prepare(`
      UPDATE media_assets SET slot = ?, alt = ?, active = ?, focus_x = ?, focus_y = ?, zoom = ?, updated_at = ? WHERE id = ?
    `).run(slot, alt, Number(input.active ?? current.active), focusX, focusY, zoom, now, input.id);
    const updated = selectById(connection, input.id);
    if (!updated) throw new MediaNotFoundError("Không tìm thấy ảnh.");
    connection.exec("COMMIT");
    return updated;
  } catch (error) {
    try {
      connection.exec("ROLLBACK");
    } catch {
      // Preserve the original write error when rollback itself cannot run.
    }
    throw error;
  }
}

export function deleteMediaAsset(id: number): boolean {
  const result = database().prepare("DELETE FROM media_assets WHERE id = ?").run(id) as { changes?: number | bigint };
  return Number(result.changes ?? 0) > 0;
}

export function reorderMediaAssets(ids: number[]): void {
  const connection = database();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const galleryRows = connection.prepare("SELECT id FROM media_assets WHERE slot = 'gallery' ORDER BY sort_order, id").all() as Array<{ id: number }>;
    const galleryIds = galleryRows.map((row) => Number(row.id));
    const incomingIds = ids.map(Number);
    const galleryIdSet = new Set(galleryIds);
    const isCompleteUniqueSet = incomingIds.length === galleryIds.length
      && new Set(incomingIds).size === incomingIds.length
      && incomingIds.every((id) => Number.isInteger(id) && id > 0 && galleryIdSet.has(id));
    if (!isCompleteUniqueSet) throw new InvalidMediaOrderError("Danh sách thứ tự ảnh không hợp lệ.");

    const now = new Date().toISOString();
    const update = connection.prepare("UPDATE media_assets SET sort_order = ?, updated_at = ? WHERE id = ? AND slot = 'gallery'");
    incomingIds.forEach((id, index) => {
      const result = update.run(index, now, id) as { changes?: number | bigint };
      if (Number(result.changes ?? 0) !== 1) throw new InvalidMediaOrderError("Danh sách thứ tự ảnh không hợp lệ.");
    });
    const verified = connection.prepare("SELECT id, sort_order FROM media_assets WHERE slot = 'gallery' ORDER BY sort_order, id").all() as Array<{ id: number; sort_order: number }>;
    if (verified.length !== incomingIds.length || verified.some((row, index) => Number(row.id) !== incomingIds[index] || Number(row.sort_order) !== index)) {
      throw new InvalidMediaOrderError("Danh sách thứ tự ảnh không hợp lệ.");
    }
    connection.exec("COMMIT");
  } catch (error) {
    try {
      connection.exec("ROLLBACK");
    } catch {
      // Preserve the original write error when rollback itself cannot run.
    }
    throw error;
  }
}
