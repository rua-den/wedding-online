"use client";

import { useEffect, useState } from "react";

import { wedding } from "@/config/wedding";

import { Invitation } from "./invitation";
import { RsvpForm } from "./rsvp-form";

type InvitationData = { guestName: string; maxGuests: number };
const invitationLoadError = "Không thể tải thiệp mời. Vui lòng thử lại sau.";

export function PersonalInvitation({ code }: { code: string }) {
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invitations/${code}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as (InvitationData & { message?: string }) | null;
        if (!response.ok) throw new Error(body?.message ?? invitationLoadError);
        if (!body) throw new Error(invitationLoadError);
        setInvitation(body);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [code]);

  if (error) {
    return <main className="guest-state"><h1>Thiệp mời không khả dụng</h1><p>{error}</p></main>;
  }

  if (!invitation) {
    return <main className="guest-state"><p>Đang mở thiệp mời...</p></main>;
  }

  const isClosed = new Date() > new Date(wedding.event.rsvpDeadline);

  return <>
    <section className="personal-cover section-shell">
      <p className="eyebrow">Thiệp mời dành riêng cho</p>
      <h1>{invitation.guestName}</h1>
      <p>Huy &amp; Nhi rất hân hạnh được đón tiếp bạn trong ngày vui của chúng mình.</p>
    </section>
    <Invitation />
    <section className="rsvp-section section-shell" aria-labelledby="rsvp-title">
      <div className="rsvp-card">
        <p className="eyebrow">Xác nhận tham dự</p>
        <h2 id="rsvp-title">Chúng mình mong được gặp bạn</h2>
        <p>Vui lòng phản hồi trước ngày {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(wedding.event.rsvpDeadline))}.</p>
        <RsvpForm code={code} guestName={invitation.guestName} isClosed={isClosed} maxGuests={invitation.maxGuests} />
      </div>
    </section>
  </>;
}
