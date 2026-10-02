// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { AdminEventEditor } from "./admin-event-editor";

describe("AdminEventEditor", () => {
  afterEach(cleanup);

  it("does not clone global business data into unconfigured dated events", () => {
    const template = defaultInvitationContent().event;
    render(<AdminEventEditor initialProfiles={{ oct11: null, oct31: null }} template={template} />);

    for (const label of ["Eyebrow", "Tiêu đề", "Ngày giờ", "Hạn RSVP", "Tên địa điểm", "Địa chỉ", "Google Maps URL"]) {
      const fields = screen.getAllByLabelText(label) as HTMLInputElement[];
      expect(fields).toHaveLength(2);
      expect(fields.every((field) => field.value === "")).toBe(true);
    }

    expect(screen.queryByLabelText("Nhãn ngày")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Giờ hiển thị")).not.toBeInTheDocument();
    expect(screen.getByText(/Ngày và giờ hiển thị trên thiệp được tự động/)).toBeInTheDocument();
  });

  it("uses local datetime pickers while keeping the Vietnam offset in saved values", async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify({ profile: JSON.parse(String(init?.body)) }), { status: 200 }));
    const template = defaultInvitationContent().event;
    render(<AdminEventEditor initialProfiles={{ oct11: null, oct31: null }} template={template} fetcher={request} />);

    const dateFields = screen.getAllByLabelText("Ngày giờ") as HTMLInputElement[];
    const deadlineFields = screen.getAllByLabelText("Hạn RSVP") as HTMLInputElement[];
    expect(dateFields.every((field) => field.type === "datetime-local")).toBe(true);
    expect(deadlineFields.every((field) => field.type === "datetime-local")).toBe(true);
    fireEvent.change(dateFields[0]!, { target: { value: "2026-10-11T11:00" } });
    fireEvent.change(deadlineFields[0]!, { target: { value: "2026-10-10T23:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Lưu 11/10/2026" }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const saved = JSON.parse(String(request.mock.calls[0]![1]?.body)) as { dateTime: string; rsvpDeadline: string };
    expect(saved.dateTime).toBe("2026-10-11T11:00:00+07:00");
    expect(saved.rsvpDeadline).toBe("2026-10-10T23:00:00+07:00");
  });
});
