"use client";

import { OPEN_INVITATION_EVENT } from "@/lib/invitation-events";

export function OpenInvitationButton({ label, targetId }: { label: string; targetId: string }) {
  function openInvitation() {
    window.dispatchEvent(new Event(OPEN_INVITATION_EVENT));
    const target = document.getElementById(targetId);
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  return <button type="button" className="open-invitation-button scroll-cue" onClick={openInvitation}>
    <span>{label}</span>
    <span aria-hidden="true" className="open-invitation-arrow">↓</span>
  </button>;
}
