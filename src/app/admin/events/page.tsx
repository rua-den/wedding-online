import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminEventEditor } from "@/components/admin-event-editor";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { getInvitationEventProfiles } from "@/lib/invitation-event-profile-store";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");

  const content = getInvitationContent();
  return <>
    <AdminTabs active="events" />
    <AdminEventEditor initialProfiles={getInvitationEventProfiles()} template={content.event} />
  </>;
}
