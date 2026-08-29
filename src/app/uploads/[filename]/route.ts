import { readFile, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative } from "node:path";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await params;
  const uploadPath = mediaUploadPath(filename);
  if (!uploadPath) return notFoundResponse();

  try {
    const directory = await realpath(mediaUploadDirectory());
    const target = await realpath(uploadPath);
    if (!isInsideRealDirectory(directory, target)) return notFoundResponse();

    const bytes = await readFile(target);
    const contentType = contentTypes[extname(filename).toLowerCase()];
    if (!contentType) return notFoundResponse();
    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(bytes.byteLength),
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return notFoundResponse();
    return serverErrorResponse();
  }
}
