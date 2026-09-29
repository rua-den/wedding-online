// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminDashboard } from "./admin-dashboard";

describe("AdminDashboard RSVP summary labels", () => {
  afterEach(cleanup);

  it("distinguishes invitation links from per-event RSVP counts", () => {
    render(<AdminDashboard
      summary={{ invitationCount: 1, respondedCount: 1, attendingCount: 1, declinedCount: 0, pendingCount: 1, confirmedGuestCount: 2 }}
      invitations={[]}
      rsvps={[]}
      siteUrl="http://localhost:3000"
    />);

    expect(screen.getByText("Tổng link mời")).toBeInTheDocument();
    expect(screen.getByText("Lượt đã phản hồi")).toBeInTheDocument();
    expect(screen.getByText("Lượt tham dự")).toBeInTheDocument();
    expect(screen.getByText("Lượt không tham dự")).toBeInTheDocument();
    expect(screen.getByText("Lượt chưa phản hồi")).toBeInTheDocument();
  });
});
