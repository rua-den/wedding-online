// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { Invitation } from "./invitation";

describe("Invitation", () => {
  it("renders persisted event content instead of config defaults", () => {
    const content = defaultInvitationContent();
    content.event = {
      ...content.event,
      venue: "Sảnh Hoa",
      address: "12 Đường Mùa Xuân",
      dateLabel: "Thứ bảy, ngày 20 tháng 12 năm 2027",
      timeLabel: "18:00",
      mapsUrl: "https://www.google.com/maps?q=Sanh+Hoa",
    };

    render(<Invitation content={content} />);

    expect(screen.getByText("Sảnh Hoa")).toBeInTheDocument();
    expect(screen.getByText("12 Đường Mùa Xuân")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem chỉ đường/ })).toHaveAttribute("href", content.event.mapsUrl);
  });
});
