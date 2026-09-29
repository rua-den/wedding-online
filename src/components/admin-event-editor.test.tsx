// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { AdminEventEditor } from "./admin-event-editor";

describe("AdminEventEditor", () => {
  afterEach(cleanup);

  it("does not clone global business data into unconfigured dated events", () => {
    const template = defaultInvitationContent().event;
    render(<AdminEventEditor initialProfiles={{ oct11: null, oct31: null }} template={template} />);

    for (const label of ["Eyebrow", "Tiêu đề", "Ngày giờ ISO", "Hạn RSVP ISO", "Tên địa điểm", "Địa chỉ", "Google Maps URL"]) {
      const fields = screen.getAllByLabelText(label) as HTMLInputElement[];
      expect(fields).toHaveLength(2);
      expect(fields.every((field) => field.value === "")).toBe(true);
    }

    expect(screen.queryByLabelText("Nhãn ngày")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Giờ hiển thị")).not.toBeInTheDocument();
    expect(screen.getByText(/Ngày và giờ hiển thị trên thiệp được tự động/)).toBeInTheDocument();
  });
});
