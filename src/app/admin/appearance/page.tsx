import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminAppearanceEditor } from "@/components/admin-appearance-editor";
import { AdminMusicEditor } from "@/components/admin-music-editor";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { getAppearanceSettings } from "@/lib/appearance-store";
import { getMusicSettings } from "@/lib/music-store";
import { listAdminInvitations } from "@/lib/sqlite-store";

export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");

  const previewInvitation = listAdminInvitations().find((invitation) => invitation.active);
  const previewUrl = previewInvitation ? `/moi/${encodeURIComponent(previewInvitation.code)}` : "/";

  return <>
    <AdminTabs active="appearance" />
    <AdminAppearanceEditor initialAppearance={getAppearanceSettings()} previewUrl={previewUrl} />
    <AdminMusicEditor initialMusic={getMusicSettings()} />
  </>;
}
