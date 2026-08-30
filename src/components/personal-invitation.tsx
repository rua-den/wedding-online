"use client";

import { useEffect, useState } from "react";

import { defaultInvitationContent } from "@/config/invitation-content";
import type { PublicMediaAsset } from "@/lib/media-store";
import type { InvitationContent } from "@/types/invitation-content";
import { Invitation } from "./invitation";
import { OpenInvitationButton } from "./open-invitation-button";
import { RsvpForm } from "./rsvp-form";

type InvitationData = { guestName: string; maxGuests: number };
const invitationLoadError = "Không thể tải thiệp mời. Vui lòng thử lại sau.";

export function PersonalInvitation({ code, media = [], content }: { code: string; media?: PublicMediaAsset[]; content?: InvitationContent }) {
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState("");
  const copy = content ?? defaultInvitationContent();

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

  if (error) return <main className="guest-state"><h1>Thiệp mời không khả dụng</h1><p>{error}</p></main>;
  if (!invitation) return <main className="guest-state"><p>Đang mở thiệp mời...</p></main>;

  const isClosed = new Date() > new Date(copy.event.rsvpDeadline);

  return <>
    <section className="personal-cover personal-cover-full section-shell" aria-labelledby="personal-invitation-title">
      <div className="personal-cover-content">
        <p className="eyebrow">{copy.personal.eyebrow}</p>
        <h1 id="personal-invitation-title">{invitation.guestName}</h1>
        <p>{copy.personal.message}</p>
        <OpenInvitationButton label={copy.cover.scrollCue} targetId="thiep-cuoi" />
      </div>
    </section>
    <Invitation media={media} content={copy} />
    <section className="rsvp-section section-shell" aria-labelledby="rsvp-title">
      <div className="rsvp-card">
        <p className="eyebrow">{copy.rsvp.eyebrow}</p>
        <h2 id="rsvp-title">{copy.rsvp.title}</h2>
        <p>{copy.rsvp.intro} {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(copy.event.rsvpDeadline))}.</p>
        <RsvpForm code={code} guestName={invitation.guestName} isClosed={isClosed} maxGuests={invitation.maxGuests} copy={copy.rsvp} />
      </div>
    </section>
  </>;
}
