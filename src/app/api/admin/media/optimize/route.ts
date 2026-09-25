import { readFile, stat } from "node:fs/promises";

import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import {
  mediaAssetOptimizationSource,
  MediaSourceUnavailableError,
  replaceMediaAssetWithOptimizedFile,
} from "@/lib/media-optimization";
import { MediaNotFoundError } from "@/lib/media-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const id = parseId(new URL(request.url).searchParams.get("id"));
  if (!id) return noStoreJson({ message: "Mã ảnh không hợp lệ." }, { status: 400 });

  try {
    const source = mediaAssetOptimizationSource(id);
    const info = await stat(source.absolutePath);
    if (!info.isFile()) return noStoreJson({ message: "Không tìm thấy tệp ảnh." }, { status: 404 });
    const bytes = await readFile(source.absolutePath);
    return new Response(bytes, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": source.contentType,
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    if (error instanceof MediaNotFoundError || (error instanceof Error && "code" in error && error.code === "ENOENT")) {
      return noStoreJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }
    if (error instanceof MediaSourceUnavailableError) return noStoreJson({ message: error.message }, { status: 400 });
    return noStoreJson({ message: "Không thể đọc ảnh gốc để tối ưu." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const form = await request.formData().catch(() => null);
  const id = parseId(form?.get("id"));
  const file = form?.get("file");
  if (!id) return noStoreJson({ message: "Mã ảnh không hợp lệ." }, { status: 400 });
  if (!(file instanceof File)) return noStoreJson({ message: "Vui lòng chọn một tệp hình ảnh." }, { status: 400 });

  try {
    const asset = await replaceMediaAssetWithOptimizedFile(id, file);
    return noStoreJson({ asset });
  } catch (error) {
    if (error instanceof MediaNotFoundError) return noStoreJson({ message: error.message }, { status: 404 });
    if (error instanceof MediaSourceUnavailableError) return noStoreJson({ message: error.message }, { status: 400 });
    return noStoreJson({ message: error instanceof Error ? error.message : "Không thể thay ảnh bằng bản tối ưu." }, { status: 400 });
  }
}
