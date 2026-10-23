import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { getGuestGuide, updateGuestGuide } from "@/lib/guest-guide-store";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request); if (rejected) return rejected;
  return noStoreJson({ guide: getGuestGuide() });
}
export async function PUT(request: Request) {
  const rejected = rejectUnlessAdmin(request); if (rejected) return rejected;
  try { return noStoreJson({ guide: updateGuestGuide(await request.json()) }); }
  catch (error) { return noStoreJson({ message: error instanceof Error ? error.message : "Nội dung không hợp lệ." }, { status: 400 }); }
}
