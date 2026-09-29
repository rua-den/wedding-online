import { rejectUnlessAdmin } from "@/lib/admin-route";
import { toSafeCsv } from "@/lib/guest-csv";
import { getRsvpTargetExportRows } from "@/lib/rsvp-report-store";

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  try {
    const rows = getRsvpTargetExportRows().map((row) => ({
      code: row.code,
      name: row.guestName,
      eventScope: row.eventScope,
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
