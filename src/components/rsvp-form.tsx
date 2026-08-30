"use client";

import { FormEvent, useState } from "react";

import { defaultInvitationContent } from "@/config/invitation-content";
import type { InvitationContent } from "@/types/invitation-content";

type Fetcher = typeof fetch;

type RsvpFormProps = {
  code: string;
  guestName: string;
  maxGuests: number;
  isClosed?: boolean;
  copy?: InvitationContent["rsvp"];
  fetcher?: Fetcher;
};

export function RsvpForm({ code, guestName, maxGuests, isClosed = false, copy, fetcher = fetch }: RsvpFormProps) {
  const labels = copy ?? defaultInvitationContent().rsvp;
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

  return (
    <form className="rsvp-form" onSubmit={onSubmit}>
      <p className="rsvp-greeting">{labels.greetingPrefix} <strong>{guestName}</strong></p>
      {isClosed ? <p className="form-status form-status-error">{labels.closedMessage}</p> : null}
      <fieldset disabled={isClosed || isSubmitting}>
        <legend>{labels.attendanceQuestion}</legend>
        <label><input checked={attendance === "attending"} name="attendance" onChange={() => setAttendance("attending")} type="radio" /> {labels.attendingLabel}</label>
        <label><input checked={attendance === "declined"} name="attendance" onChange={() => setAttendance("declined")} type="radio" /> {labels.declinedLabel}</label>
        <label htmlFor="guest-count">{labels.guestCountLabel}</label>
        <select aria-label={labels.guestCountLabel} disabled={attendance === "declined"} id="guest-count" onChange={(event) => setGuestCount(Number(event.target.value))} value={attendance === "declined" ? 0 : guestCount}>
          {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {labels.guestCountSuffix}</option>)}
          {attendance === "declined" ? <option value={0}>0 {labels.guestCountSuffix}</option> : null}
        </select>
        <label htmlFor="rsvp-message">{labels.messageLabel}</label>
        <textarea aria-label={labels.messageLabel} id="rsvp-message" maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder={labels.messagePlaceholder} value={message} />
        <button type="submit">{isSubmitting ? labels.submittingLabel : labels.submitLabel}</button>
      </fieldset>
      {status.type !== "idle" ? <p className={`form-status form-status-${status.type}`} role="status">{status.message}</p> : null}
    </form>
  );
}
