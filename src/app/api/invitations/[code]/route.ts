import { getInvitation } from "@/lib/invitation-service";
import { getInvitationStore } from "@/lib/runtime-store";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const result = await getInvitation(code, getInvitationStore(code));

    if (!result.ok) {
      return Response.json({ message: result.message }, { status: result.status });
    }

    return Response.json(result.invitation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ message: "Không thể tải thiệp mời. Vui lòng thử lại sau." }, { status: 500 });
  }
}
