import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import {
  replaceStoryMilestoneWithOptimizedFile,
  StoryImageNotFoundError,
  StoryImageSourceUnavailableError,
  storyMilestoneOptimizationSource,
} from "@/lib/story-image-optimization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseIndex(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const index = Number(value);
  return Number.isSafeInteger(index) ? index : null;
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Không thể tối ưu ảnh mốc chuyện tình.";
  const status = error instanceof StoryImageNotFoundError ? 404 : 400;
  return noStoreJson({ message }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const index = parseIndex(new URL(request.url).searchParams.get("index"));
  if (index === null) return noStoreJson({ message: "Mốc chuyện tình không hợp lệ." }, { status: 400 });

  try {
    const source = storyMilestoneOptimizationSource(index);
    const info = await stat(source.absolutePath);
    if (!info.isFile()) throw new StoryImageSourceUnavailableError("Không tìm thấy tệp ảnh mốc chuyện tình.");
    const body = Readable.toWeb(createReadStream(source.absolutePath)) as unknown as BodyInit;
    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": source.contentType,
        "Content-Length": String(info.size),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const form = await request.formData().catch(() => null);
  const index = parseIndex(form?.get("index")?.toString() ?? null);
  const file = form?.get("file");
  if (index === null || !(file instanceof File)) {
    return noStoreJson({ message: "Ảnh hoặc mốc chuyện tình chưa hợp lệ." }, { status: 400 });
  }

  try {
    const milestone = await replaceStoryMilestoneWithOptimizedFile(index, file);
    return noStoreJson({ milestone, src: milestone.imageSrc });
  } catch (error) {
    return errorResponse(error);
  }
}
