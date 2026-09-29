"use client";

import { useState } from "react";

import type { DatedInvitationEventScope, InvitationEventProfile, InvitationEventProfiles } from "@/lib/invitation-event-profile-store";
import type { InvitationContent } from "@/types/invitation-content";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type Draft = InvitationEventProfile;

function emptyDraft(scope: DatedInvitationEventScope, template: InvitationContent["event"]): Draft {
  return {
    ...template,
    scope,
    eyebrow: "",
    title: "",
    dateTime: "",
    dateLabel: scope === "oct11" ? "11/10/2026" : "31/10/2026",
    timeLabel: "",
    rsvpDeadline: "",
    venue: "",
    address: "",
    mapsUrl: "",
  };
}

function initialDraft(scope: DatedInvitationEventScope, profiles: InvitationEventProfiles, template: InvitationContent["event"]): Draft {
  return profiles[scope] ?? emptyDraft(scope, template);
}

async function responseMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? fallback;
}

export function AdminEventEditor({
  initialProfiles,
  template,
  fetcher,
}: {
  initialProfiles: InvitationEventProfiles;
  template: InvitationContent["event"];
  fetcher?: Fetcher;
}) {
  const request = fetcher ?? fetch;
  const [profiles, setProfiles] = useState(initialProfiles);
  const [drafts, setDrafts] = useState<Record<DatedInvitationEventScope, Draft>>({
    oct11: initialDraft("oct11", initialProfiles, template),
    oct31: initialDraft("oct31", initialProfiles, template),
  });
  const [busyScope, setBusyScope] = useState<DatedInvitationEventScope | null>(null);
  const [message, setMessage] = useState("");

  function update(scope: DatedInvitationEventScope, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [scope]: { ...current[scope], ...patch, scope } }));
  }

  async function save(scope: DatedInvitationEventScope) {
    setBusyScope(scope);
    setMessage("");
    try {
      const response = await request(`/api/admin/events/${scope}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(drafts[scope]),
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, `Không thể lưu sự kiện ${scope === "oct11" ? "11/10" : "31/10"}.`));
        return;
      }
      const body = await response.json() as { profile: InvitationEventProfile };
      setProfiles((current) => ({ ...current, [scope]: body.profile }));
      setDrafts((current) => ({ ...current, [scope]: body.profile }));
      setMessage(`Đã lưu sự kiện ${scope === "oct11" ? "11/10" : "31/10"}.`);
    } catch {
      setMessage("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setBusyScope(null);
    }
  }

  const field = (scope: DatedInvitationEventScope, label: string, key: keyof Draft, options?: { type?: string; maxLength?: number }) => (
    <label>
      {label}
      <input
        type={options?.type ?? "text"}
        value={String(drafts[scope][key] ?? "")}
        maxLength={options?.maxLength ?? 240}
        onChange={(event) => update(scope, { [key]: event.target.value } as Partial<Draft>)}
        required
      />
    </label>
  );

  return <main className="admin-shell">
    <header className="admin-header">
      <div>
        <p className="eyebrow">Ngày cưới</p>
        <h1>Cấu hình sự kiện</h1>
        <p>11/10 và 31/10 được lưu độc lập. Khách chỉ thấy ngày được gán trong danh sách khách mời.</p>
        <p>Ngày và giờ hiển thị trên thiệp được tự động lấy từ ngày giờ tổ chức để tránh nhập lệch thông tin.</p>
      </div>
    </header>

    {(["oct11", "oct31"] as const).map((scope) => {
      const label = scope === "oct11" ? "11/10/2026" : "31/10/2026";
      return <section className="admin-panel" key={scope}>
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">{profiles[scope] ? "Đã cấu hình" : "Chưa cấu hình"}</p>
            <h2>{label}</h2>
          </div>
        </div>
        <div className="admin-form-grid">
          {field(scope, "Eyebrow", "eyebrow", { maxLength: 100 })}
          {field(scope, "Tiêu đề", "title", { maxLength: 220 })}
          {field(scope, "Ngày giờ ISO", "dateTime", { maxLength: 80 })}
          {field(scope, "Hạn RSVP ISO", "rsvpDeadline", { maxLength: 80 })}
          {field(scope, "Tên địa điểm", "venue", { maxLength: 160 })}
          {field(scope, "Địa chỉ", "address", { maxLength: 240 })}
          {field(scope, "Google Maps URL", "mapsUrl", { type: "url", maxLength: 2048 })}
          <button className="admin-primary-button" type="button" disabled={busyScope !== null} onClick={() => void save(scope)}>
            {busyScope === scope ? "Đang lưu..." : `Lưu ${label}`}
          </button>
        </div>
      </section>;
    })}

    <p className="form-status admin-status" role="status" aria-live="polite">{message}</p>
  </main>;
}
