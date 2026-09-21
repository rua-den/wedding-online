"use client";

import { FormEvent, useState } from "react";

import { defaultInvitationContent } from "@/config/invitation-content";
import {
  INVITATION_DISPLAY_FONT_FAMILY,
  scaledTextStyle,
  textScale,
} from "@/lib/invitation-typography";
import type { InvitationContent } from "@/types/invitation-content";

type Fetcher = typeof fetch;

type RsvpFormProps = {
  code: string;
  guestName: string;
  maxGuests: number;
  isClosed?: boolean;
  copy?: InvitationContent["rsvp"];
  fontScales?: Record<string, number>;
  fetcher?: Fetcher;
};

export function RsvpForm({ code, guestName, maxGuests, isClosed = false, copy, fontScales, fetcher = fetch }: RsvpFormProps) {
  const labels = copy ?? defaultInvitationContent().rsvp;
  const styleFor = (key: string) => scaledTextStyle(textScale(fontScales, key));
  const [attendance, setAttendance] = useState<"attending" | "declined">("attending");
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetcher(`/api/rsvp/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance, guestCount: attendance === "declined" ? 0 : guestCount, message }),
      });
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        setStatus({ type: "error", message: body.message ?? "Không thể gửi xác nhận. Vui lòng thử lại." });
        return;
      }

      setStatus({ type: "success", message: body.message ?? labels.successMessage });
    } catch {
      setStatus({ type: "error", message: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectFontSize = `${textScale(fontScales, "rsvp.guestCountSuffix") / 100}rem`;
  const messageFontSize = `${textScale(fontScales, "rsvp.messagePlaceholder") / 100}rem`;

  return (
    <form className="rsvp-form" onSubmit={onSubmit}>
      <p className="rsvp-greeting"><span style={styleFor("rsvp.greetingPrefix")}>{labels.greetingPrefix}</span> <strong>{guestName}</strong></p>
      {isClosed ? <p className="form-status form-status-error"><span style={styleFor("rsvp.closedMessage")}>{labels.closedMessage}</span></p> : null}
      <fieldset disabled={isClosed || isSubmitting}>
        <legend><span style={styleFor("rsvp.attendanceQuestion")}>{labels.attendanceQuestion}</span></legend>
        <label><input checked={attendance === "attending"} name="attendance" onChange={() => setAttendance("attending")} type="radio" /> <span style={styleFor("rsvp.attendingLabel")}>{labels.attendingLabel}</span></label>
        <label><input checked={attendance === "declined"} name="attendance" onChange={() => setAttendance("declined")} type="radio" /> <span style={styleFor("rsvp.declinedLabel")}>{labels.declinedLabel}</span></label>
        <label htmlFor="guest-count"><span style={styleFor("rsvp.guestCountLabel")}>{labels.guestCountLabel}</span></label>
        <select
          aria-label={labels.guestCountLabel}
          disabled={attendance === "declined"}
          id="guest-count"
          onChange={(event) => setGuestCount(Number(event.target.value))}
          style={{ fontFamily: INVITATION_DISPLAY_FONT_FAMILY, fontSize: selectFontSize }}
          value={attendance === "declined" ? 0 : guestCount}
        >
          {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {labels.guestCountSuffix}</option>)}
          {attendance === "declined" ? <option value={0}>0 {labels.guestCountSuffix}</option> : null}
        </select>
        <label htmlFor="rsvp-message"><span style={styleFor("rsvp.messageLabel")}>{labels.messageLabel}</span></label>
        <textarea
          aria-label={labels.messageLabel}
          id="rsvp-message"
          maxLength={500}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={labels.messagePlaceholder}
          style={{ fontFamily: INVITATION_DISPLAY_FONT_FAMILY, fontSize: messageFontSize }}
          value={message}
        />
        <button type="submit"><span style={styleFor(isSubmitting ? "rsvp.submittingLabel" : "rsvp.submitLabel")}>{isSubmitting ? labels.submittingLabel : labels.submitLabel}</span></button>
      </fieldset>
      {status.type !== "idle" ? <p className={`form-status form-status-${status.type}`} role="status">{status.type === "success" ? <span style={styleFor("rsvp.successMessage")}>{status.message}</span> : status.message}</p> : null}
    </form>
  );
}
