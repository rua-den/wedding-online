import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminContentEditor } from "@/components/admin-content-editor";
import Link from "next/link";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { listAdminMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function AdminEditPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");

  return <>
    <AdminTabs active="edit" />
    <p style={{ margin: "16px 24px" }}><Link href="/admin/guest-guide">Chỉnh Agenda &amp; sơ đồ khu tiệc →</Link></p>
    <AdminContentEditor initialContent={getInvitationContent()} initialMedia={listAdminMedia()} />
  </>;
}
