"use client";

import { useMemo, useState } from "react";

import { wedding } from "@/config/wedding";
import type { AdminInvitation, AdminRsvp, AdminSummary } from "@/lib/sqlite-store";
import type { MediaAsset } from "@/lib/media-store";
import type { SiteSettings } from "@/lib/site-settings";
import { AdminMediaPanel } from "./admin-media-panel";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type AdminDashboardProps = {
  summary: AdminSummary;
  invitations: AdminInvitation[];
  rsvps: AdminRsvp[];
  siteUrl: string;
  media?: MediaAsset[];
  settings?: SiteSettings;
  fetcher?: Fetcher;
};

type EditableSettings = Pick<SiteSettings, "venue" | "address" | "dateLabel" | "timeLabel" | "mapsUrl">;

const fallbackSettings: EditableSettings = {
  venue: wedding.event.venue,
  address: wedding.event.address,
  dateLabel: wedding.event.dateLabel,
  timeLabel: wedding.event.timeLabel,
  mapsUrl: wedding.event.mapsUrl,
};

function editableSettings(settings?: SiteSettings): EditableSettings {
  return {
    venue: settings?.venue ?? fallbackSettings.venue,
    address: settings?.address ?? fallbackSettings.address,
    dateLabel: settings?.dateLabel ?? fallbackSettings.dateLabel,
    timeLabel: settings?.timeLabel ?? fallbackSettings.timeLabel,
    mapsUrl: settings?.mapsUrl ?? fallbackSettings.mapsUrl,
  };
}

const emptySummary: AdminSummary = {
  invitationCount: 0,
  respondedCount: 0,
  attendingCount: 0,
  declinedCount: 0,
  pendingCount: 0,
  confirmedGuestCount: 0,
};

async function responseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? fallback;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function attendanceLabel(attendance: AdminRsvp["attendance"]) {
  if (attendance === "attending") return "Tham dự";
  if (attendance === "declined") return "Không tham dự";
  return "Chưa phản hồi";
}

function invitationUrl(siteUrl: string, code: string) {
  return `${siteUrl.replace(/\/$/, "")}/moi/${encodeURIComponent(code)}`;
}

export function AdminDashboard({ summary: initialSummary, invitations: initialInvitations, rsvps: initialRsvps, siteUrl, media = [], settings, fetcher }: AdminDashboardProps) {
  const request = fetcher ?? fetch;
  const [summary, setSummary] = useState<AdminSummary>(initialSummary ?? emptySummary);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "attending" | "declined" | "pending">("");
  const [name, setName] = useState("");
  const [maxGuests, setMaxGuests] = useState("2");
  const [createdLink, setCreatedLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingMaxGuests, setEditingMaxGuests] = useState("2");
  const [settingsForm, setSettingsForm] = useState<EditableSettings>(() => editableSettings(settings));

  const visibleInvitations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return invitations;
    return invitations.filter((invitation) => `${invitation.name} ${invitation.code}`.toLocaleLowerCase().includes(normalized));
  }, [invitations, query]);

  const visibleRsvps = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return rsvps.filter((rsvp) => {
      const matchesQuery = !normalized || `${rsvp.name} ${rsvp.code}`.toLocaleLowerCase().includes(normalized);
      const matchesStatus = !status || (status === "pending" ? !rsvp.attendance : rsvp.attendance === status);
      return matchesQuery && matchesStatus;
    });
  }, [query, rsvps, status]);

  async function refresh(filters: { query?: string; status?: string } = { query, status }) {
    try {
      const params = new URLSearchParams();
      if (filters.query) params.set("q", filters.query);
      if (filters.status) params.set("status", filters.status);
      const response = await request(`/api/admin/rsvps?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { rsvps?: AdminRsvp[] };
      if (body.rsvps) setRsvps(body.rsvps);
    } catch {
      // Keep the already-rendered rows available when a refresh is interrupted.
    }
  }

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setCreatedLink("");
    try {
      const response = await request("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, maxGuests: Number(maxGuests) }),
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, "Không thể tạo thiệp mời."));
        return;
      }
      const body = (await response.json()) as { invitation: AdminInvitation; invitationUrl: string; summary?: AdminSummary };
      setInvitations((current) => [body.invitation, ...current]);
      if (body.summary) setSummary(body.summary);
      setCreatedLink(body.invitationUrl);
      setMessage(`Đã tạo link mời cho ${body.invitation.name}`);
      setName("");
    } catch {
      setMessage("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleInvitation(invitation: AdminInvitation) {
    setBusy(true);
    setMessage("");
    try {
      const response = await request("/api/admin/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: invitation.code, active: !invitation.active }),
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, "Không thể cập nhật thiệp mời."));
        return;
      }
      const body = (await response.json()) as { invitation: AdminInvitation; summary?: AdminSummary };
      setInvitations((current) => current.map((item) => item.code === invitation.code ? body.invitation : item));
      if (body.summary) setSummary(body.summary);
      setMessage(`${body.invitation.active ? "Đã bật" : "Đã tắt"} link mời cho ${body.invitation.name}`);
    } catch {
      setMessage("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitationLink(invitation: AdminInvitation) {
    const url = invitationUrl(siteUrl, invitation.code);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setMessage(`Đã sao chép link mời cho ${invitation.name}`);
    } catch {
      setMessage("Không thể sao chép link mời.");
    }
  }

  function startEditing(invitation: AdminInvitation) {
    setEditingCode(invitation.code);
    setEditingName(invitation.name);
    setEditingMaxGuests(String(invitation.maxGuests));
    setMessage("");
  }

  function cancelEditing() {
    setEditingCode(null);
    setEditingName("");
    setEditingMaxGuests("2");
  }

  async function saveInvitation(code: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await request("/api/admin/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: editingName, maxGuests: Number(editingMaxGuests) }),
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, "Không thể cập nhật thiệp mời."));
        return;
      }
      const body = (await response.json()) as { invitation: AdminInvitation; summary?: AdminSummary };
      setInvitations((current) => current.map((item) => item.code === code ? body.invitation : item));
      if (body.summary) setSummary(body.summary);
      setMessage(`Đã cập nhật ${body.invitation.name}`);
      cancelEditing();
    } catch {
      setMessage("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await request("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, "Không thể lưu thông tin địa điểm."));
        return;
      }
      const body = (await response.json()) as { settings?: SiteSettings };
      if (body.settings) setSettingsForm(editableSettings(body.settings));
      setMessage("Đã lưu thông tin địa điểm.");
    } catch {
      setMessage("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  function updateStatus(value: typeof status) {
    setStatus(value);
    void refresh({ query, status: value });
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Huy &amp; Nhi</p>
          <h1>Quản lý khách mời</h1>
          <p>Danh sách link mời và phản hồi RSVP được lưu an toàn trên SQLite.</p>
        </div>
        <form action="/api/admin/logout" method="post">
          <button className="admin-secondary-button" type="submit">Đăng xuất</button>
        </form>
      </header>

      <section className="admin-stat-grid" aria-label="Tổng quan RSVP">
        <article className="admin-stat"><span>Tổng link mời</span><strong>{summary.invitationCount}</strong></article>
        <article className="admin-stat"><span>Đã phản hồi</span><strong>{summary.respondedCount}</strong></article>
        <article className="admin-stat"><span>Tham dự</span><strong>{summary.attendingCount}</strong></article>
        <article className="admin-stat"><span>Không tham dự</span><strong>{summary.declinedCount}</strong></article>
        <article className="admin-stat"><span>Chưa phản hồi</span><strong>{summary.pendingCount}</strong></article>
        <article className="admin-stat"><span>Số khách xác nhận</span><strong>{summary.confirmedGuestCount}</strong></article>
      </section>

      <section className="admin-panel" aria-labelledby="settings-title">
        <div className="admin-panel-heading"><div><p className="eyebrow">Thông tin buổi lễ</p><h2 id="settings-title">Địa điểm &amp; thời gian</h2></div></div>
        <form className="admin-settings-grid" onSubmit={saveSettings}>
          <label>Tên địa điểm<input value={settingsForm.venue} onChange={(event) => setSettingsForm((current) => ({ ...current, venue: event.target.value }))} required maxLength={160} /></label>
          <label>Địa chỉ<input value={settingsForm.address} onChange={(event) => setSettingsForm((current) => ({ ...current, address: event.target.value }))} required maxLength={240} /></label>
          <label>Nhãn ngày tổ chức<input value={settingsForm.dateLabel} onChange={(event) => setSettingsForm((current) => ({ ...current, dateLabel: event.target.value }))} required maxLength={160} /></label>
          <label>Thời gian buổi lễ<input value={settingsForm.timeLabel} onChange={(event) => setSettingsForm((current) => ({ ...current, timeLabel: event.target.value }))} required maxLength={80} /></label>
          <label>Link Google Maps (HTTPS)<input type="url" value={settingsForm.mapsUrl} onChange={(event) => setSettingsForm((current) => ({ ...current, mapsUrl: event.target.value }))} required maxLength={2048} /></label>
          <button className="admin-primary-button" type="submit" disabled={busy}>Lưu thông tin địa điểm</button>
        </form>
      </section>

      <AdminMediaPanel initialAssets={media} request={request} />

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="eyebrow">Link riêng</p><h2>Tạo thiệp mời</h2></div></div>
        <form className="admin-form-grid" onSubmit={createInvitation}>
          <label>Tên khách mời<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} /></label>
          <label>Số khách tối đa<select value={maxGuests} onChange={(event) => setMaxGuests(event.target.value)}><option value="1">1 người</option><option value="2">2 người</option><option value="3">3 người</option><option value="4">4 người</option><option value="5">5 người</option></select></label>
          <button className="admin-primary-button" type="submit" disabled={busy}>Tạo link mời</button>
        </form>
        {createdLink ? <label className="admin-created-link">Link vừa tạo<input readOnly value={createdLink} onFocus={(event) => event.currentTarget.select()} /></label> : null}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="eyebrow">Danh sách</p><h2>Thiệp mời</h2></div><input className="admin-search" aria-label="Tìm kiếm khách mời" placeholder="Tìm tên hoặc mã…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Khách mời</th><th>Mã</th><th>Link mời</th><th>Tối đa</th><th>RSVP</th><th>Trạng thái</th><th /></tr></thead><tbody>
          {visibleInvitations.map((invitation) => <tr key={invitation.code}>
            {editingCode === invitation.code ? <>
              <td><label className="admin-inline-field"><span className="sr-only">Tên khách mời {invitation.code}</span><input aria-label={`Tên khách mời ${invitation.code}`} value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={160} /></label></td>
              <td><code>{invitation.code}</code></td>
              <td><div className="admin-invite-link"><a href={invitationUrl(siteUrl, invitation.code)}>{invitationUrl(siteUrl, invitation.code)}</a><div className="admin-actions"><button className="admin-text-button" type="button" disabled={busy} onClick={() => void copyInvitationLink(invitation)} aria-label={`Sao chép link cho ${invitation.name}`}>Sao chép</button><a className="admin-text-button" href={invitationUrl(siteUrl, invitation.code)} target="_blank" rel="noreferrer" aria-label={`Xem trước thiệp của ${invitation.name}`}>Xem trước</a></div></div></td>
              <td><label className="admin-inline-field"><span className="sr-only">Số khách tối đa {invitation.code}</span><select aria-label={`Số khách tối đa ${invitation.code}`} value={editingMaxGuests} onChange={(event) => setEditingMaxGuests(event.target.value)}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></label></td>
              <td>{invitation.guestCount ?? "—"}</td>
              <td><span className={`admin-badge ${invitation.active ? "is-active" : "is-inactive"}`}>{invitation.active ? "Đang bật" : "Đã tắt"}</span></td>
              <td><div className="admin-actions"><button className="admin-text-button" type="button" disabled={busy} onClick={() => void saveInvitation(invitation.code)}>Lưu</button><button className="admin-text-button" type="button" disabled={busy} onClick={cancelEditing}>Hủy</button></div></td>
            </> : <>
              <td>{invitation.name}</td><td><code>{invitation.code}</code></td><td><div className="admin-invite-link"><a href={invitationUrl(siteUrl, invitation.code)}>{invitationUrl(siteUrl, invitation.code)}</a><div className="admin-actions"><button className="admin-text-button" type="button" disabled={busy} onClick={() => void copyInvitationLink(invitation)} aria-label={`Sao chép link cho ${invitation.name}`}>Sao chép</button><a className="admin-text-button" href={invitationUrl(siteUrl, invitation.code)} target="_blank" rel="noreferrer" aria-label={`Xem trước thiệp của ${invitation.name}`}>Xem trước</a></div></div></td><td>{invitation.maxGuests}</td><td>{invitation.guestCount ?? "—"}</td><td><span className={`admin-badge ${invitation.active ? "is-active" : "is-inactive"}`}>{invitation.active ? "Đang bật" : "Đã tắt"}</span></td><td><div className="admin-actions"><button className="admin-text-button" type="button" disabled={busy} onClick={() => startEditing(invitation)}>Sửa</button><button className="admin-text-button" type="button" disabled={busy} onClick={() => void toggleInvitation(invitation)}>{invitation.active ? "Tắt link" : "Bật link"}</button></div></td>
            </>}
          </tr>)}
        </tbody></table></div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="eyebrow">Phản hồi</p><h2>RSVP</h2></div><a className="admin-secondary-button" href="/api/admin/export">Xuất CSV</a></div>
        <div className="admin-filter-row"><label>Tìm kiếm<input aria-label="Tìm RSVP" placeholder="Tìm tên hoặc mã…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Trạng thái RSVP<select aria-label="Trạng thái RSVP" value={status} onChange={(event) => updateStatus(event.target.value as typeof status)}><option value="">Tất cả</option><option value="attending">Tham dự</option><option value="declined">Không tham dự</option><option value="pending">Chưa phản hồi</option></select></label></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Khách mời</th><th>Trạng thái</th><th>Số khách</th><th>Lời nhắn</th><th>Cập nhật</th></tr></thead><tbody>
          {visibleRsvps.map((rsvp) => <tr key={rsvp.code}><td>{rsvp.name}<small><code>{rsvp.code}</code></small></td><td><span className="admin-badge">{attendanceLabel(rsvp.attendance)}</span></td><td>{rsvp.guestCount ?? "—"}</td><td>{rsvp.message || "—"}</td><td>{formatDate(rsvp.updatedAt)}</td></tr>)}
        </tbody></table></div>
      </section>

      <p className="form-status admin-status" role="status" aria-live="polite">{message}</p>
      <footer className="admin-footer"><span>Huy &amp; Nhi</span><a href={siteUrl}>Xem thiệp cưới</a></footer>
    </main>
  );
}
