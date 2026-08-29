import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { MAX_MEDIA_BYTES } from "./media-validation";

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const generatedFilenamePattern = /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp|avif|gif)$/i;

export function mediaUploadDirectory(): string {
  return resolve(/* turbopackIgnore: true */ process.env.MEDIA_UPLOAD_DIRECTORY ?? join(process.cwd(), "public", "uploads"));
}

export function isInsideMediaUploadDirectory(filePath: string): boolean {
  const directory = mediaUploadDirectory();
  const target = resolve(filePath);
  const pathFromDirectory = relative(directory, target);
  return pathFromDirectory !== "" && !pathFromDirectory.startsWith("..") && !isAbsolute(pathFromDirectory);
}

export function createUploadFilename(originalName: string, extensionOverride?: string): string {
  const extension = (extensionOverride ?? extname(basename(originalName))).toLowerCase();
  return `${Date.now()}-${randomUUID()}${allowedExtensions.has(extension) ? extension : ".jpg"}`;
}

export function isCanonicalUploadFilename(filename: string): boolean {
  return generatedFilenamePattern.test(filename);
}

export function canonicalUploadFilename(src: string): string | null {
  const prefix = "/uploads/";
  if (!src.startsWith(prefix)) return null;
  const filename = src.slice(prefix.length);
  return isCanonicalUploadFilename(filename) ? filename : null;
}

export function mediaUploadPath(filename: string): string | null {
  if (!isCanonicalUploadFilename(filename)) return null;
  const absolutePath = resolve(mediaUploadDirectory(), filename);
  return isInsideMediaUploadDirectory(absolutePath) ? absolutePath : null;
}

export async function saveMediaFile(file: File, filename = createUploadFilename(file.name)): Promise<{ src: string; absolutePath: string }> {
  if (file.size > MAX_MEDIA_BYTES) throw new Error("Ảnh không được vượt quá 12 MB.");
  const directory = mediaUploadDirectory();
  await mkdir(directory, { recursive: true });
  const absolutePath = mediaUploadPath(filename);
  if (!absolutePath) throw new Error("Đường dẫn tệp không hợp lệ.");
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));
  return { src: `/uploads/${filename}`, absolutePath };
}

export async function removeMediaFile(src: string): Promise<void> {
  const filename = canonicalUploadFilename(src);
  if (!filename) return;
  const absolutePath = mediaUploadPath(filename);
  if (!absolutePath) return;
  try {
    await unlink(absolutePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
