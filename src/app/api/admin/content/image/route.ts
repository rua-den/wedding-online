import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { createUploadFilename, saveMediaFile } from "@/lib/media-upload";
import { resolveUploadExtension } from "@/lib/media-validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return noStoreJson({ message: "Vui lòng chọn một tệp hình ảnh." }, { status: 400 });
  }

  try {
    const extension = resolveUploadExtension(file.name, file.type);
    const saved = await saveMediaFile(file, createUploadFilename(file.name, extension));
    return noStoreJson({ src: saved.src }, { status: 201 });
  } catch (error) {
    return noStoreJson({ message: error instanceof Error ? error.message : "Không thể lưu ảnh mốc." }, { status: 400 });
  }
}
