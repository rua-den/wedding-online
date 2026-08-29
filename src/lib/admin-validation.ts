import { z } from "zod";

export const adminLoginSchema = z.object({ password: z.string().min(1).max(256) });
export const adminInvitationCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  maxGuests: z.number().int().min(1).max(20),
});
export const adminInvitationUpdateSchema = z.object({
  code: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(160).optional(),
  maxGuests: z.number().int().min(1).max(20).optional(),
  active: z.boolean().optional(),
}).refine((value) => value.name !== undefined || value.maxGuests !== undefined || value.active !== undefined);
export const adminInvitationDeleteSchema = z.object({
  code: z.string().trim().min(1).max(128),
});
export const adminInvitationListSchema = z.object({ q: z.string().max(160).default("") });
export const adminRsvpListSchema = z.object({
  q: z.string().max(160).default(""),
  status: z.enum(["attending", "declined", "pending"]).optional(),
});

