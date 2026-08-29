import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { createMediaAsset, deleteMediaAsset, listAdminMedia, MediaNotFoundError, updateMediaAsset } from "@/lib/media-store";
import { createUploadFilename, removeMediaFile, saveMediaFile } from "@/lib/media-upload";
import { resolveUploadExtension, validateMediaAlt, validateMediaUpload } from "@/lib/media-validation";

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  try {
    return noStoreJson({ assets: listAdminMedia() });
  } catch {
    return noStoreJson({ message: "Không thể tải danh sách ảnh." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return noStoreJson({ message: "Vui lòng chọn một tệp hình ảnh." }, { status: 400 });
  let checked: ReturnType<typeof validateMediaUpload>;
  try {
    checked = validateMediaUpload({
      slot: String(form?.get("slot") ?? ""),
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      alt: String(form?.get("alt") ?? ""),
    });
  } catch (error) {
    return noStoreJson({ message: error instanceof Error ? error.message : "Tệp hình ảnh không hợp lệ." }, { status: 400 });
  }

  let saved: Awaited<ReturnType<typeof saveMediaFile>> | undefined;
  try {
    saved = await saveMediaFile(file, createUploadFilename(file.name, resolveUploadExtension(file.name, file.type)));
    const asset = createMediaAsset({ slot: checked.slot, src: saved.src, alt: checked.alt });
    return noStoreJson({ asset }, { status: 201 });
  } catch {
    if (saved) {
      try {
        await removeMediaFile(saved.src);
      } catch {
        // Keep the original API error and avoid leaking filesystem details.
      }
    }
    return noStoreJson({ message: "Không thể lưu ảnh lúc này." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null) as {
    id?: unknown;
    slot?: unknown;
    alt?: unknown;
    active?: unknown;
    focusX?: unknown;
    focusY?: unknown;
    zoom?: unknown;
  } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1) return noStoreJson({ message: "Mã ảnh không hợp lệ." }, { status: 400 });
  try {
    const alt = typeof body?.alt === "string" ? validateMediaAlt(body.alt) : undefined;
    const asset = updateMediaAsset({
      id,
      slot: typeof body?.slot === "string" ? body.slot as never : undefined,
      alt,
      active: typeof body?.active === "boolean" ? body.active : undefined,
      focusX: typeof body?.focusX === "number" ? body.focusX : undefined,
      focusY: typeof body?.focusY === "number" ? body.focusY : undefined,
      zoom: typeof body?.zoom === "number" ? body.zoom : undefined,
    });
    return noStoreJson({ asset });
  } catch (error) {
    if (error instanceof MediaNotFoundError) return noStoreJson({ message: error.message }, { status: 404 });
    return noStoreJson({ message: error instanceof Error ? error.message : "Không thể cập nhật ảnh." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id < 1) return noStoreJson({ message: "Mã ảnh không hợp lệ." }, { status: 400 });
  const asset = listAdminMedia().find((item) => item.id === id);
  if (!asset) return noStoreJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
  try {
    await removeMediaFile(asset.src);
  } catch {
    return noStoreJson({ message: "Không thể xóa tệp ảnh lúc này." }, { status: 500 });
  }
  deleteMediaAsset(id);
  return noStoreJson({ ok: true });
}
