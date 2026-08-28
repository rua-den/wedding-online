import { adminRsvpListSchema } from "@/lib/admin-validation";
import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { listAdminRsvps } from "@/lib/sqlite-store";

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const parsed = adminRsvpListSchema.safeParse({ q: url.searchParams.get("q") ?? "", status });
  if (!parsed.success) return noStoreJson({ message: "Bộ lọc RSVP không hợp lệ." }, { status: 400 });
  try {
    return noStoreJson({ rsvps: listAdminRsvps({ query: parsed.data.q, status: parsed.data.status }) });
  } catch {
    return noStoreJson({ message: "Không thể tải danh sách RSVP." }, { status: 500 });
  }
}

