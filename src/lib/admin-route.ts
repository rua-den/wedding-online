import { requireAdmin } from "./admin-auth";

export const noStoreHeaders = { "Cache-Control": "no-store" };

export function rejectUnlessAdmin(request: Request): Response | null {
  if (requireAdmin(request)) return null;
  return Response.json({ message: "Bạn cần đăng nhập để tiếp tục." }, { status: 401, headers: noStoreHeaders });
}

export function noStoreJson(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

