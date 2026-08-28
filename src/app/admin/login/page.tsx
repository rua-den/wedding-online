import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { adminSessionCookie, verifyAdminSession } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const token = (await cookies()).get(adminSessionCookie.name)?.value;
  if (verifyAdminSession(token)) redirect("/admin");
  return <main className="admin-login-shell"><section className="admin-login-card">
    <p className="eyebrow">Huy &amp; Nhi</p><h1>Quản lý thiệp mời</h1>
    <p>Đăng nhập để quản lý danh sách khách và phản hồi RSVP.</p><AdminLoginForm />
  </section></main>;
}

