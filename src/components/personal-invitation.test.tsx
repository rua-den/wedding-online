// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import type { InvitationEventProfile, InvitationEventProfiles } from "@/lib/invitation-event-profile-store";
import { PersonalInvitation } from "./personal-invitation";

function profile(scope: "oct11" | "oct31"): InvitationEventProfile {
  const base = defaultInvitationContent().event;
  const day = scope === "oct11" ? "11" : "31";
  return {
    ...base,
    scope,
    title: `Tiệc riêng ngày ${day}`,
    dateTime: `2026-10-${day}T11:00:00+07:00`,
    dateLabel: `${day}/10/2026`,
    rsvpDeadline: `2026-10-${day}T10:00:00+07:00`,
    venue: `Sảnh ${day}`,
  };
}

const profiles: InvitationEventProfiles = { oct11: profile("oct11"), oct31: profile("oct31") };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PersonalInvitation", () => {
  it.each(["oct11", "oct31", "both", "legacy"] as const)("renders the shared gift section for %s invitations", async (eventScope) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ guestName: "Khách mời", maxGuests: 2, eventScope }), { status: 200 })));
    const scopeProfiles = eventScope === "legacy" ? { oct11: null, oct31: null } : profiles;
    render(<PersonalInvitation code="invite-code" eventProfiles={scopeProfiles} />);
    expect(await screen.findByRole("heading", { name: "Gửi tiền mừng" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gửi tiền mừng" }).closest("section")).toHaveAttribute("id", "gui-tien-mung");
  });

  it("shows a safe fallback when the invitation endpoint returns a non-JSON server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unexpected upstream error", { status: 500 })));
    render(<PersonalInvitation code="invite-code" eventProfiles={profiles} />);
    expect(await screen.findByText("Không thể tải thiệp mời. Vui lòng thử lại sau.")).toBeInTheDocument();
  });

  it("renders only 11/10 content and one dated RSVP form for an oct11 guest", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ guestName: "Cô Lan", maxGuests: 2, eventScope: "oct11" }), { status: 200 })));
    const { container } = render(<PersonalInvitation code="invite-code" eventProfiles={profiles} />);
    expect((await screen.findAllByText("Tiệc riêng ngày 11")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Tiệc riêng ngày 31")).not.toBeInTheDocument();
    expect(container.querySelectorAll('form[data-event-scope="oct11"]')).toHaveLength(1);
    expect(container.querySelectorAll('form[data-event-scope="oct31"]')).toHaveLength(0);
  });

  it("renders both event cards and two independent RSVP forms for a guest invited to both dates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ guestName: "Gia đình Minh", maxGuests: 4, eventScope: "both" }), { status: 200 })));
    const { container } = render(<PersonalInvitation code="invite-code" eventProfiles={profiles} />);
    expect((await screen.findAllByText("Tiệc riêng ngày 11")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Tiệc riêng ngày 31").length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll('form[data-event-scope="oct11"]')).toHaveLength(1);
    expect(container.querySelectorAll('form[data-event-scope="oct31"]')).toHaveLength(1);
  });

  it("fails closed instead of showing the wrong global event when an assigned event is unconfigured", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ guestName: "Anh Minh", maxGuests: 1, eventScope: "oct31" }), { status: 200 })));
    render(<PersonalInvitation code="invite-code" eventProfiles={{ oct11: profiles.oct11, oct31: null }} />);
    expect(await screen.findByText("Thông tin sự kiện 31/10 chưa được cấu hình.")).toBeInTheDocument();
    expect(screen.queryByText(defaultInvitationContent().event.title)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Gửi tiền mừng" })).not.toBeInTheDocument();
  });
});
