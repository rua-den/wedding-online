import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { listGiftWishes } from "@/lib/gift-wish-store";
export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request); if (rejected) return rejected;
  try { return noStoreJson({ wishes: listGiftWishes() }); } catch { return noStoreJson({ message: "Không thể tải lời chúc." }, { status: 500 }); }
}
