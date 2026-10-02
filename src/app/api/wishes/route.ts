import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { getTrustedProxyClientIp } from "@/lib/client-ip";
import { createGiftWish } from "@/lib/gift-wish-store";
const limiter = createRateLimiter({ maxRequests: 5, windowMs: 10 * 60 * 1000 });
const wishSchema = z.object({ invitationCode: z.string().trim().max(120).optional().nullable(), name: z.string().trim().min(1).max(120), message: z.string().trim().min(1).max(1000) });
export async function POST(request: Request) {
  if (!limiter.allow(getTrustedProxyClientIp(request))) return Response.json({ message: "Bạn đã gửi quá nhiều lời chúc. Vui lòng thử lại sau." }, { status: 429 });
  const parsed = wishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Vui lòng nhập tên và lời chúc hợp lệ." }, { status: 400 });
  try { createGiftWish(parsed.data); return Response.json({ message: "Đã gửi lời chúc." }, { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ message: "Không thể lưu lời chúc." }, { status: 500 }); }
}
