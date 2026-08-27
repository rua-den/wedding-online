"use client";

import { FormEvent, useState } from "react";

type Fetcher = typeof fetch;

type RsvpFormProps = {
  code: string;
  guestName: string;
  maxGuests: number;
  isClosed?: boolean;
  fetcher?: Fetcher;
};

export function RsvpForm({ code, guestName, maxGuests, isClosed = false, fetcher = fetch }: RsvpFormProps) {
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

      setStatus({ type: "success", message: body.message ?? "Cảm ơn bạn đã xác nhận tham dự!" });
    } catch {
      setStatus({ type: "error", message: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="rsvp-form" onSubmit={onSubmit}>
      <p className="rsvp-greeting">Thân mời <strong>{guestName}</strong></p>
      {isClosed ? <p className="form-status form-status-error">Đã hết hạn xác nhận tham dự.</p> : null}
      <fieldset disabled={isClosed || isSubmitting}>
        <legend>Bạn có thể tham dự cùng chúng mình không?</legend>
        <label><input checked={attendance === "attending"} name="attendance" onChange={() => setAttendance("attending")} type="radio" /> Sẽ tham dự</label>
        <label><input checked={attendance === "declined"} name="attendance" onChange={() => setAttendance("declined")} type="radio" /> Rất tiếc, không thể tham dự</label>
        <label htmlFor="guest-count">Số người tham dự</label>
        <select aria-label="Số người tham dự" disabled={attendance === "declined"} id="guest-count" onChange={(event) => setGuestCount(Number(event.target.value))} value={attendance === "declined" ? 0 : guestCount}>
          {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} người</option>)}
          {attendance === "declined" ? <option value={0}>0 người</option> : null}
        </select>
        <label htmlFor="rsvp-message">Lời nhắn</label>
        <textarea id="rsvp-message" maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder="Gửi lời chúc tới Huy & Nhi" value={message} />
        <button type="submit">{isSubmitting ? "Đang gửi..." : "Gửi xác nhận"}</button>
      </fieldset>
      {status.type !== "idle" ? <p className={`form-status form-status-${status.type}`} role="status">{status.message}</p> : null}
    </form>
  );
}
