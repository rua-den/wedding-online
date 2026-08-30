import { z } from "zod";

import { getInvitationContent } from "@/lib/invitation-content-store";
import { submitRsvp } from "@/lib/invitation-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { sqliteInvitationStore } from "@/lib/sqlite-store";

const rsvpSchema = z.object({
  attendance: z.enum(["attending", "declined"]),
  guestCount: z.number().int().min(0),
  message: z.string().max(500).default(""),
});

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 600_000 });

function getClientIp(request: Request) {
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!limiter.allow(getClientIp(request))) {
    return Response.json({ message: "Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Thông tin xác nhận chưa hợp lệ." }, { status: 400 });
  }

  const { code } = await params;
  const content = getInvitationContent();
  const result = await submitRsvp(code, parsed.data, {
    store: sqliteInvitationStore,
    deadline: new Date(content.event.rsvpDeadline),
    now: new Date(),
  });

  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status });
  }

  return Response.json({ message: content.rsvp.successMessage });
}
