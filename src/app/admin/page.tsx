import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { listAdminMedia } from "@/lib/media-store";
import { getAdminSummary, listAdminInvitations, listAdminRsvps } from "@/lib/sqlite-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");

  const siteUrl = (process.env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return <>
    <AdminTabs active="dashboard" />
    <AdminDashboard
      summary={getAdminSummary()}
      invitations={listAdminInvitations()}
      rsvps={listAdminRsvps()}
      siteUrl={siteUrl}
      media={listAdminMedia()}
    />
  </>;
}
