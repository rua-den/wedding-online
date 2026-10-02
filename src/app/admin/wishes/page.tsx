import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin-tabs";
import { AdminWishes } from "@/components/admin-wishes";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";
import { listGiftWishes } from "@/lib/gift-wish-store";
export const dynamic = "force-dynamic";
export default async function AdminWishesPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");
  return <><AdminTabs active="wishes" /><AdminWishes wishes={listGiftWishes()} /></>;
}
