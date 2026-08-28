import { adminInvitationCreateSchema, adminInvitationListSchema, adminInvitationUpdateSchema } from "@/lib/admin-validation";
import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import {
  createAdminInvitation,
  getAdminSummary,
  InvitationCodeConflictError,
  InvitationNotFoundError,
  listAdminInvitations,
  updateAdminInvitation,
} from "@/lib/sqlite-store";

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const url = new URL(request.url);
  const parsed = adminInvitationListSchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) return noStoreJson({ message: "Bộ lọc không hợp lệ." }, { status: 400 });
  try {
    return noStoreJson({ invitations: listAdminInvitations(parsed.data.q), summary: getAdminSummary() });
  } catch {
    return noStoreJson({ message: "Không thể tải danh sách thiệp mời." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null);
  const parsed = adminInvitationCreateSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ message: "Thông tin thiệp mời chưa hợp lệ." }, { status: 400 });
  try {
    const invitation = createAdminInvitation(parsed.data);
    const siteUrl = (process.env.PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    return noStoreJson(
      { invitation, invitationUrl: `${siteUrl}/moi/${invitation.code}`, summary: getAdminSummary() },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InvitationCodeConflictError) return noStoreJson({ message: error.message }, { status: 409 });
    return noStoreJson({ message: "Không thể tạo thiệp mời." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null);
  const parsed = adminInvitationUpdateSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ message: "Thông tin cập nhật chưa hợp lệ." }, { status: 400 });
  try {
    return noStoreJson({ invitation: updateAdminInvitation(parsed.data), summary: getAdminSummary() });
  } catch (error) {
    if (error instanceof InvitationNotFoundError) return noStoreJson({ message: error.message }, { status: 404 });
    return noStoreJson({ message: "Không thể cập nhật thiệp mời." }, { status: 500 });
  }
}

