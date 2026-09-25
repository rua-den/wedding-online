import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminExistingMediaOptimizer } from "@/components/admin-existing-media-optimizer";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { listAdminMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function AdminMediaOptimizePage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");

  return <>
    <AdminTabs active="media-optimize" />
    <AdminExistingMediaOptimizer
      initialAssets={listAdminMedia()}
      initialMilestones={getInvitationContent().story.milestones}
    />
  </>;
}
