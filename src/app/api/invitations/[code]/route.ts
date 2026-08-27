import { getInvitation } from "@/lib/invitation-service";
import { googleSheetsStore } from "@/lib/sheets";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await getInvitation(code, googleSheetsStore);

  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status });
  }

  return Response.json(result.invitation, {
    headers: { "Cache-Control": "no-store" },
  });
}
