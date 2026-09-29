// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDashboard } from "./admin-dashboard";

const summary = {
  invitationCount: 1,
  respondedCount: 2,
  attendingCount: 1,
  declinedCount: 1,
  pendingCount: 0,
  confirmedGuestCount: 2,
};

const baseRsvp = {
  code: "both-guest",
  name: "Gia đình Minh",
  maxGuests: 2,
  active: true,
  guestCount: 2,
  message: "",
  createdAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AdminDashboard event RSVP rows", () => {
  it("renders both dates for one invitation without duplicate React keys", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<AdminDashboard
      summary={summary}
      invitations={[]}
      siteUrl="http://localhost:3000"
      rsvps={[
        { ...baseRsvp, name: "Gia đình Minh · 11/10", eventScope: "oct11", attendance: "attending" },
        { ...baseRsvp, name: "Gia đình Minh · 31/10", eventScope: "oct31", attendance: "declined", guestCount: 0 },
      ]}
    />);

    expect(screen.getByText("Gia đình Minh · 11/10")).toBeInTheDocument();
    expect(screen.getByText("Gia đình Minh · 31/10")).toBeInTheDocument();
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
  });
});
