import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative } from "node:path";
import { Readable } from "node:stream";

import { audioUploadPath } from "@/lib/audio-upload";
import { mediaUploadDirectory, mediaUploadPath } from "@/lib/media-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
};

function notFoundResponse(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

function serverErrorResponse(): Response {
  return new Response("Unable to read upload", { status: 500, headers: { "Cache-Control": "no-store" } });
}

function isInsideRealDirectory(directory: string, target: string): boolean {
  const pathFromDirectory = relative(directory, target);
  return pathFromDirectory !== "" && !pathFromDirectory.startsWith("..") && !isAbsolute(pathFromDirectory);
}

type ByteRange = { start: number; end: number };
function parseByteRange(header: string | null, size: number): ByteRange | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return "invalid";
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) return "invalid";
  return { start, end: Math.min(end, size - 1) };
}

function streamBody(path: string, range?: ByteRange): BodyInit {
  const stream = range ? createReadStream(path, { start: range.start, end: range.end }) : createReadStream(path);
  return Readable.toWeb(stream) as unknown as BodyInit;
}

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }): Promise<Response> {
  const { filename } = await params;
  const uploadPath = mediaUploadPath(filename) ?? audioUploadPath(filename);
  if (!uploadPath) return notFoundResponse();
  const extension = extname(filename).toLowerCase();
  const contentType = contentTypes[extension];
  if (!contentType) return notFoundResponse();

  try {
    const directory = await realpath(mediaUploadDirectory());
    const target = await realpath(uploadPath);
    if (!isInsideRealDirectory(directory, target)) return notFoundResponse();
    const info = await stat(target);
    if (!info.isFile()) return notFoundResponse();

    const isAudio = extension === ".mp3";
    const range = isAudio ? parseByteRange(request.headers.get("range"), info.size) : null;
    if (range === "invalid") {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}`, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable" } });
    }

    const headers = new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentType,
      "Content-Length": String(range ? range.end - range.start + 1 : info.size),
    });
    if (isAudio) headers.set("Accept-Ranges", "bytes");
    if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);

    return new Response(streamBody(target, range ?? undefined), { status: range ? 206 : 200, headers });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return notFoundResponse();
    return serverErrorResponse();
  }
}
