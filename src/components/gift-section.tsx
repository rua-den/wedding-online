"use client";

import { useState } from "react";
import Image from "next/image";
import type { InvitationContent } from "@/types/invitation-content";
import { SectionJumpButton } from "./section-jump-button";
import { scaledTextStyle, textScale } from "@/lib/invitation-typography";

export function GiftSection({ copy, nextTargetId, invitationCode, fontScales }: { copy: InvitationContent["gift"]; nextTargetId: string; invitationCode?: string; fontScales?: Record<string, number> }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/wishes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationCode, name, message }) });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "Không thể gửi lời chúc.");
      setName(""); setMessage(""); setStatus(copy.successMessage);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Không thể gửi lời chúc."); }
    finally { setBusy(false); }
  }
  return <section id="gui-tien-mung" className="gift-section section-shell" aria-labelledby="gift-title">
    <div className="section-heading"><p className="eyebrow"><span style={scaledTextStyle(textScale(fontScales, "gift.eyebrow"))}>{copy.eyebrow}</span></p><h2 id="gift-title"><span style={scaledTextStyle(textScale(fontScales, "gift.title"))}>{copy.title}</span></h2><p className="gift-intro"><span style={scaledTextStyle(textScale(fontScales, "gift.intro"))}>{copy.intro}</span></p></div>
    {copy.qrImageSrc ? <div className="gift-qr"><Image src={copy.qrImageSrc} alt={copy.qrAlt} width={512} height={512} unoptimized /></div> : null}
    <form className="gift-wish-form" onSubmit={submit}>
      <label><span style={scaledTextStyle(textScale(fontScales, "gift.nameLabel"))}>{copy.nameLabel}</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} maxLength={120} required disabled={busy} /></label>
      <label><span style={scaledTextStyle(textScale(fontScales, "gift.messageLabel"))}>{copy.messageLabel}</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy.messagePlaceholder} maxLength={1000} required disabled={busy} /></label>
      <button type="submit" disabled={busy}><span style={scaledTextStyle(textScale(fontScales, busy ? "gift.submittingLabel" : "gift.submitLabel"))}>{busy ? copy.submittingLabel : copy.submitLabel}</span></button>
      {status ? <p className="form-status" role="status"><span style={scaledTextStyle(textScale(fontScales, "gift.successMessage"))}>{status}</span></p> : null}
    </form>
    <SectionJumpButton targetId={nextTargetId} label={nextTargetId === "xac-nhan-tham-du" ? "xác nhận tham dự" : "lời cảm ơn"} />
  </section>;
}
