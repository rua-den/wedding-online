export const ASSIGNABLE_INVITATION_EVENT_SCOPES = ["oct11", "oct31", "both"] as const;

export type AssignableInvitationEventScope = typeof ASSIGNABLE_INVITATION_EVENT_SCOPES[number];
export type InvitationEventScope = AssignableInvitationEventScope | "legacy";

export function normalizeInvitationEventScope(value: unknown): InvitationEventScope {
  return value === "oct11" || value === "oct31" || value === "both" ? value : "legacy";
}

export function invitationEventScopeLabel(scope: InvitationEventScope | undefined): string {
  if (scope === "oct11") return "11/10";
  if (scope === "oct31") return "31/10";
  if (scope === "both") return "11/10 + 31/10";
  return "Chưa phân loại";
}
