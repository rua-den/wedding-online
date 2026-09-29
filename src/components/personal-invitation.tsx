"use client";

import { useEffect, useState } from "react";

import { defaultInvitationContent } from "@/config/invitation-content";
import { resolveInvitationEvents } from "@/lib/invitation-event-resolver";
import type { InvitationEventProfiles } from "@/lib/invitation-event-profile-store";
import type { InvitationEventScope } from "@/lib/invitation-event-scope";
import type { PublicMediaAsset } from "@/lib/media-store";
import { scaledTextStyle, textScale } from "@/lib/invitation-typography";
import type { InvitationContent } from "@/types/invitation-content";
import { Invitation } from "./invitation";
import { InvitationFooter } from "./invitation-footer";
import { OpenInvitationButton } from "./open-invitation-button";
import { RsvpForm } from "./rsvp-form";
import { SectionJumpButton } from "./section-jump-button";

type InvitationData = { guestName: string; maxGuests: number; eventScope: InvitationEventScope };
const invitationLoadError = "Không thể tải thiệp mời. Vui lòng thử lại sau.";
const emptyEventProfiles: InvitationEventProfiles = { oct11: null, oct31: null };

export function PersonalInvitation({
  code,
  media = [],
  content,
  eventProfiles = emptyEventProfiles,
}: {
  code: string;
  media?: PublicMediaAsset[];
  content?: InvitationContent;
  eventProfiles?: InvitationEventProfiles;
}) {
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState("");
  const copy = content ?? defaultInvitationContent();
  const styleFor = (key: string) => scaledTextStyle(textScale(copy.fontScales, key));

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

  const resolved = resolveInvitationEvents(invitation.eventScope, eventProfiles, copy.event);
  if (!resolved.ok) return <main className="guest-state"><h1>Thiệp mời chưa sẵn sàng</h1><p>{resolved.message}</p></main>;

  const personalizedCopy: InvitationContent = { ...copy, event: resolved.primary };
  const isClosed = new Date() > new Date(resolved.primary.rsvpDeadline);

  return <>
    <section className="personal-cover personal-cover-full section-shell" aria-labelledby="personal-invitation-title">
      <div className="personal-cover-content">
        <p className="eyebrow"><span style={styleFor("personal.eyebrow")}>{copy.personal.eyebrow}</span></p>
        <h1 id="personal-invitation-title">{invitation.guestName}</h1>
        <p><span style={styleFor("personal.message")}>{copy.personal.message}</span></p>
        <OpenInvitationButton label={copy.cover.scrollCue} targetId="thiep-cuoi" fontScale={textScale(copy.fontScales, "cover.scrollCue")} />
      </div>
    </section>
    <Invitation media={media} content={personalizedCopy} events={resolved.events} nextAfterGalleryTargetId="xac-nhan-tham-du" showFooter={false} />
    <section id="xac-nhan-tham-du" className="rsvp-section section-shell" aria-labelledby="rsvp-title">
      <div className="rsvp-card">
        <p className="eyebrow"><span style={styleFor("rsvp.eyebrow")}>{copy.rsvp.eyebrow}</span></p>
        <h2 id="rsvp-title"><span style={styleFor("rsvp.title")}>{copy.rsvp.title}</span></h2>
        <p><span style={styleFor("rsvp.intro")}>{copy.rsvp.intro} {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(resolved.primary.rsvpDeadline))}.</span></p>
        <RsvpForm code={code} guestName={invitation.guestName} isClosed={isClosed} maxGuests={invitation.maxGuests} copy={copy.rsvp} fontScales={copy.fontScales} />
      </div>
      <SectionJumpButton targetId="loi-cam-on" label="lời cảm ơn" />
    </section>
    <InvitationFooter title={copy.footer.title} message={copy.footer.message} titleScale={textScale(copy.fontScales, "footer.title")} messageScale={textScale(copy.fontScales, "footer.message")} />
  </>;
}
