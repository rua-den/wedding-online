import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminContentEditor } from "@/components/admin-content-editor";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { getInvitationContent } from "@/lib/invitation-content-store";

export const dynamic = "force-dynamic";

export default async function AdminEditPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");

  return <>
    <AdminTabs active="edit" />
    <AdminContentEditor initialContent={getInvitationContent()} />
  </>;
}
