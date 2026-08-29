import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { getInvitationContent, updateInvitationContent } from "@/lib/invitation-content-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  try {
    return noStoreJson({ content: getInvitationContent() });
  } catch {
    return noStoreJson({ message: "Không thể tải nội dung thiệp." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null);
  try {
    return noStoreJson({ content: updateInvitationContent(body) });
  } catch (error) {
    return noStoreJson({ message: error instanceof Error ? error.message : "Không thể lưu nội dung thiệp." }, { status: 400 });
  }
}
