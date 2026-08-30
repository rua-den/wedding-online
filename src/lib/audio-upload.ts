import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { mediaUploadDirectory } from "./media-upload";
import { validateAudioFile } from "./audio-validation";

const audioFilenamePattern = /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.mp3$/i;

export function createAudioFilename(): string {
  return `${Date.now()}-${randomUUID()}.mp3`;
}

export function isCanonicalAudioFilename(filename: string): boolean {
  return audioFilenamePattern.test(filename);
}

export function canonicalAudioFilename(src: string): string | null {
  const prefix = "/uploads/";
  if (!src.startsWith(prefix)) return null;
  const filename = src.slice(prefix.length);
  return isCanonicalAudioFilename(filename) ? filename : null;
}

export function audioUploadPath(filename: string): string | null {
  if (!isCanonicalAudioFilename(filename)) return null;
  const directory = resolve(mediaUploadDirectory());
  const target = resolve(directory, filename);
  const pathFromDirectory = relative(directory, target);
  if (!pathFromDirectory || pathFromDirectory.startsWith("..") || isAbsolute(pathFromDirectory)) return null;
  return target;
}

export async function saveAudioFile(file: File): Promise<{ src: string; absolutePath: string }> {
  await validateAudioFile(file);
  const filename = createAudioFilename();
  const absolutePath = audioUploadPath(filename);
  if (!absolutePath) throw new Error("Đường dẫn tệp nhạc không hợp lệ.");
  await mkdir(mediaUploadDirectory(), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  return { src: `/uploads/${filename}`, absolutePath };
}

export async function removeAudioFile(src: string): Promise<void> {
  const filename = canonicalAudioFilename(src);
  if (!filename) return;
  const absolutePath = audioUploadPath(filename);
  if (!absolutePath) return;
  try {
    await unlink(absolutePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
