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

  it("renders an uploaded image on its matching love-story milestone", () => {
    const content = defaultInvitationContent();
    content.story.milestones[0] = {
      ...content.story.milestones[0],
      title: "Ngày đầu gặp nhau",
      imageSrc: "/uploads/1788039145650-f2a49997-39dd-4e53-878c-3cb63437fefe.png",
    };

    render(<Invitation content={content} />);

    const image = screen.getByRole("img", { name: "Ảnh mốc Ngày đầu gặp nhau" });
    expect(new URL(image.getAttribute("src")!, "http://localhost").pathname).toBe(
      "/uploads/1788039145650-f2a49997-39dd-4e53-878c-3cb63437fefe.png",
    );
  });
});
