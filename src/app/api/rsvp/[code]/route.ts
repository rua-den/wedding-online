import { z } from "zod";

import { getTrustedProxyClientIp } from "@/lib/client-ip";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { getInvitationEventProfiles } from "@/lib/invitation-event-profile-store";
import { submitInvitationRsvp } from "@/lib/invitation-rsvp-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { sqliteInvitationRsvpStore } from "@/lib/event-rsvp-store";

const rsvpSchema = z.object({
  eventScope: z.enum(["oct11", "oct31"]).optional(),
  attendance: z.enum(["attending", "declined"]),
  guestCount: z.number().int().min(0),
  message: z.string().max(500).default(""),
});

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 600_000 });

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!limiter.allow(getTrustedProxyClientIp(request))) {
    return Response.json({ message: "Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ít phút." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = rsvpSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Thông tin xác nhận chưa hợp lệ." }, { status: 400 });
  }

  const { code } = await params;
  const content = getInvitationContent();
  const result = await submitInvitationRsvp(code, parsed.data, {
    store: sqliteInvitationRsvpStore,
    eventProfiles: getInvitationEventProfiles(),
    legacyDeadline: new Date(content.event.rsvpDeadline),
    now: new Date(),
  });

  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status });
  }

  return Response.json({ message: content.rsvp.successMessage });
}
