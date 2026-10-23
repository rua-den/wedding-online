import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminGuestGuideEditor } from "@/components/admin-guest-guide-editor";
import { AdminTabs } from "@/components/admin-tabs";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { getGuestGuide } from "@/lib/guest-guide-store";
export const dynamic = "force-dynamic";
export default async function GuestGuideAdminPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");
  return <><AdminTabs active="edit" /><AdminGuestGuideEditor initial={getGuestGuide()} /></>;
}
