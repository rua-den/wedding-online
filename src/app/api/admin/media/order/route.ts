import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { InvalidMediaOrderError, reorderMediaAssets } from "@/lib/media-store";

export async function PUT(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  if (!Array.isArray(body?.ids) || body.ids.some((id) => !Number.isInteger(Number(id)) || Number(id) < 1)) {
    return noStoreJson({ message: "Danh sách thứ tự ảnh không hợp lệ." }, { status: 400 });
  }
  try {
    reorderMediaAssets(body.ids.map(Number));
    return noStoreJson({ ok: true });
  } catch (error) {
    if (error instanceof InvalidMediaOrderError) return noStoreJson({ message: error.message }, { status: 400 });
    return noStoreJson({ message: "Không thể sắp xếp ảnh." }, { status: 500 });
  }
}
