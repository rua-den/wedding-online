import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { listAdminMedia } from "@/lib/media-store";
import { getAdminRsvpSummary, listAdminInvitationsWithResponses, listAdminRsvpTargets } from "@/lib/rsvp-report-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");

  const siteUrl = (process.env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return <>
    <AdminTabs active="dashboard" />
    <AdminDashboard
      summary={getAdminRsvpSummary()}
      invitations={listAdminInvitationsWithResponses()}
      rsvps={listAdminRsvpTargets()}
      siteUrl={siteUrl}
      media={listAdminMedia()}
    />
  </>;
}
