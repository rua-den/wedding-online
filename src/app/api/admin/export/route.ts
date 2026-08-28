import { rejectUnlessAdmin } from "@/lib/admin-route";
import { toSafeCsv } from "@/lib/guest-csv";
import { getRsvpExportRows } from "@/lib/sqlite-store";

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  try {
    const rows = getRsvpExportRows().map((row) => ({
      code: row.code,
      name: row.name,
      maxGuests: row.maxGuests,
      active: row.active,
      attendance: row.attendance ?? "pending",
      guestCount: row.guestCount ?? "",
      message: row.message,
      createdAt: row.createdAt ?? "",
      updatedAt: row.updatedAt ?? "",
    }));
    return new Response(`\uFEFF${toSafeCsv(rows)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rsvp.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ message: "Không thể xuất dữ liệu RSVP." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

