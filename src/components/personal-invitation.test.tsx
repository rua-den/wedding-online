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
  it("shows a safe fallback when the invitation endpoint returns a non-JSON server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unexpected upstream error", { status: 500 })));
    render(<PersonalInvitation code="invite-code" eventProfiles={profiles} />);
    expect(await screen.findByText("Không thể tải thiệp mời. Vui lòng thử lại sau.")).toBeInTheDocument();
  });

  it("renders only 11/10 content for an oct11 guest", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ guestName: "Cô Lan", maxGuests: 2, eventScope: "oct11" }), { status: 200 })));
    render(<PersonalInvitation code="invite-code" eventProfiles={profiles} />);
    expect(await screen.findByText("Tiệc riêng ngày 11")).toBeInTheDocument();
    expect(screen.queryByText("Tiệc riêng ngày 31")).not.toBeInTheDocument();
  });

  it("renders both event cards for a guest invited to both dates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ guestName: "Gia đình Minh", maxGuests: 4, eventScope: "both" }), { status: 200 })));
    render(<PersonalInvitation code="invite-code" eventProfiles={profiles} />);
    expect(await screen.findByText("Tiệc riêng ngày 11")).toBeInTheDocument();
    expect(screen.getByText("Tiệc riêng ngày 31")).toBeInTheDocument();
  });

  it("fails closed instead of showing the wrong global event when an assigned event is unconfigured", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ guestName: "Anh Minh", maxGuests: 1, eventScope: "oct31" }), { status: 200 })));
    render(<PersonalInvitation code="invite-code" eventProfiles={{ oct11: profiles.oct11, oct31: null }} />);
    expect(await screen.findByText("Thông tin sự kiện 31/10 chưa được cấu hình.")).toBeInTheDocument();
    expect(screen.queryByText(defaultInvitationContent().event.title)).not.toBeInTheDocument();
  });
});
