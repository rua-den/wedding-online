"use client";

export function SectionJumpButton({ targetId, label }: { targetId: string; label: string }) {
  function jumpToSection() {
    const target = document.getElementById(targetId);
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <button
      type="button"
      className="section-jump-button"
      onClick={jumpToSection}
      aria-label={`Đi tới ${label}`}
      title={`Đi tới ${label}`}
    >
      <span aria-hidden="true">↓</span>
    </button>
  );
}
