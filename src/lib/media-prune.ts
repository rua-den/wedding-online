import { readdir, stat, unlink } from "node:fs/promises";

import { audioUploadPath, isCanonicalAudioFilename } from "./audio-upload";
import { isCanonicalUploadFilename, mediaUploadDirectory, mediaUploadPath } from "./media-upload";
import { getDatabase, initializeDatabase } from "./sqlite";

export const DEFAULT_UPLOAD_PRUNE_GRACE_MS = 24 * 60 * 60 * 1000;

export type UploadPruneResult = {
  deleted: string[];
  retained: number;
  ignored: number;
};

function database() {
  initializeDatabase();
  return getDatabase();
}

function collectUploadStrings(value: unknown, target: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("/uploads/")) target.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUploadStrings(item, target));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectUploadStrings(item, target));
  }
}

export function referencedUploadSources(): Set<string> {
  const connection = database();
  const references = new Set<string>();

  const mediaRows = connection.prepare("SELECT src FROM media_assets").all() as Array<{ src?: string }>;
  mediaRows.forEach((row) => { if (row.src?.startsWith("/uploads/")) references.add(row.src); });

  const musicRow = connection.prepare("SELECT src FROM music_settings WHERE id = 1").get() as { src?: string | null } | undefined;
  if (musicRow?.src?.startsWith("/uploads/")) references.add(musicRow.src);

  const contentTable = connection.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'invitation_content'").get() as { name?: string } | undefined;
  if (contentTable) {
    const contentRow = connection.prepare("SELECT content_json FROM invitation_content WHERE id = 1").get() as { content_json?: string } | undefined;
    if (contentRow?.content_json) {
      try {
        collectUploadStrings(JSON.parse(contentRow.content_json), references);
      } catch {
        // Malformed content means we cannot prove which uploads it references.
        // Abort pruning rather than risk deleting user media.
        throw new Error("Không thể prune upload vì invitation_content đang có JSON không hợp lệ.");
      }
    }
  }

  return references;
}

function canonicalSource(filename: string): string | null {
  if (isCanonicalUploadFilename(filename) || isCanonicalAudioFilename(filename)) return `/uploads/${filename}`;
  return null;
}

function canonicalPath(filename: string): string | null {
  return mediaUploadPath(filename) ?? audioUploadPath(filename);
}

export async function pruneOrphanUploads(options: { graceMs?: number; nowMs?: number } = {}): Promise<UploadPruneResult> {
  const graceMs = options.graceMs ?? DEFAULT_UPLOAD_PRUNE_GRACE_MS;
  const nowMs = options.nowMs ?? Date.now();
  const references = referencedUploadSources();
  const deleted: string[] = [];
  let retained = 0;
  let ignored = 0;

  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(mediaUploadDirectory());
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return { deleted, retained, ignored };
    throw error;
  }

  for (const filename of entries) {
    const src = canonicalSource(filename);
    const path = canonicalPath(filename);
    if (!src || !path) {
      ignored += 1;
      continue;
    }
    if (references.has(src)) {
      retained += 1;
      continue;
    }

    try {
      const info = await stat(path);
      if (!info.isFile() || nowMs - info.mtimeMs < graceMs) {
        retained += 1;
        continue;
      }
      await unlink(path);
      deleted.push(src);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }

  return { deleted, retained, ignored };
}
