import { z } from "zod";
import { ASSIGNABLE_INVITATION_EVENT_SCOPES } from "./invitation-event-scope";

const invitationEventScopeSchema = z.enum(ASSIGNABLE_INVITATION_EVENT_SCOPES);

export const adminLoginSchema = z.object({ password: z.string().min(1).max(256) });
export const adminInvitationCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  maxGuests: z.number().int().min(1).max(20),
  eventScope: invitationEventScopeSchema,
});
export const adminInvitationUpdateSchema = z.object({
  code: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(160).optional(),
  maxGuests: z.number().int().min(1).max(20).optional(),
  active: z.boolean().optional(),
  eventScope: invitationEventScopeSchema.optional(),
}).refine((value) => value.name !== undefined || value.maxGuests !== undefined || value.active !== undefined || value.eventScope !== undefined);
export const adminInvitationDeleteSchema = z.object({
  code: z.string().trim().min(1).max(128),
});
export const adminInvitationListSchema = z.object({ q: z.string().max(160).default("") });
export const adminRsvpListSchema = z.object({
  q: z.string().max(160).default(""),
  status: z.enum(["attending", "declined", "pending"]).optional(),
});

