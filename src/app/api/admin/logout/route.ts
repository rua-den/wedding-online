import { serializeAdminCookie } from "@/lib/admin-auth";

export async function POST() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "Set-Cookie": serializeAdminCookie("", 0) } });
}

