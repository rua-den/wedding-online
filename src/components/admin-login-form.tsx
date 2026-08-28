"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password") }) });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setMessage(body?.message ?? "Không thể đăng nhập. Vui lòng thử lại."); return;
      }
      router.replace("/admin"); router.refresh();
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); }
    finally { setPending(false); }
  }

  return <form className="admin-login-form" onSubmit={submit}>
    <label htmlFor="admin-password">Mật khẩu</label>
    <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
    <button type="submit" disabled={pending}>{pending ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    <p className="form-status form-status-error" aria-live="polite">{message}</p>
  </form>;
}

