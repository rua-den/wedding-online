// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SiteSettings } from "@/lib/site-settings";
import { Invitation } from "./invitation";

const settings: SiteSettings = {
  venue: "Sảnh Hoa",
  address: "12 Đường Mùa Xuân",
  dateLabel: "Thứ bảy, ngày 20 tháng 12 năm 2027",
  timeLabel: "18:00",
  mapsUrl: "https://www.google.com/maps?q=Sanh+Hoa",
  venueImage: null,
};

describe("Invitation", () => {
  it("renders the persisted venue settings instead of config defaults", () => {
    render(<Invitation settings={settings} />);

    expect(screen.getByText("Sảnh Hoa")).toBeInTheDocument();
    expect(screen.getByText("12 Đường Mùa Xuân")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Xem chỉ đường/ })).toHaveAttribute("href", settings.mapsUrl);
  });
});
