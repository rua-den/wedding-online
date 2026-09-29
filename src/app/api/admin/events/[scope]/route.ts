import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { updateInvitationEventProfile, type DatedInvitationEventScope } from "@/lib/invitation-event-profile-store";

export const dynamic = "force-dynamic";

function eventScope(value: string): DatedInvitationEventScope | null {
  return value === "oct11" || value === "oct31" ? value : null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ scope: string }> }) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const { scope: rawScope } = await params;
  const scope = eventScope(rawScope);
  if (!scope) return noStoreJson({ message: "Sự kiện không hợp lệ." }, { status: 404 });

  const body = await request.json().catch(() => null);
  try {
    return noStoreJson({ profile: updateInvitationEventProfile(scope, body) });
  } catch (error) {
    return noStoreJson({ message: error instanceof Error ? error.message : "Không thể lưu sự kiện." }, { status: 400 });
  }
}
