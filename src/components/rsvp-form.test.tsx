// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { RsvpForm } from "./rsvp-form";

afterEach(() => {
  cleanup();
});

describe("RsvpForm", () => {
  it("submits an attending RSVP for the invitation limit and confirms success", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Cảm ơn bạn đã xác nhận tham dự!" }), { status: 200 }));

    render(<RsvpForm code="secure-code" guestName="Anh Minh & Chị Lan" maxGuests={2} fetcher={fetcher} />);
    fireEvent.click(screen.getByLabelText("Sẽ tham dự"));
    fireEvent.change(screen.getByLabelText("Số người tham dự"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Lời nhắn"), { target: { value: "Hẹn gặp hai bạn!" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi xác nhận" }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/rsvp/secure-code", expect.objectContaining({ method: "PUT" })));
    expect(await screen.findByText("Cảm ơn bạn đã xác nhận tham dự!")).toBeInTheDocument();
  });

  it("renders editable copy without changing the RSVP API payload", async () => {
    const copy = defaultInvitationContent().rsvp;
    copy.greetingPrefix = "Kính mời";
    copy.attendanceQuestion = "Bạn sẽ đến chung vui chứ?";
    copy.attendingLabel = "Có, mình sẽ đến";
    copy.declinedLabel = "Mình xin phép vắng mặt";
    copy.guestCountLabel = "Số khách đi cùng";
    copy.guestCountSuffix = "khách";
    copy.messageLabel = "Lời chúc";
    copy.messagePlaceholder = "Viết vài lời cho cô dâu chú rể";
    copy.submitLabel = "Xác nhận ngay";
    copy.successMessage = "Đã ghi nhận lời hồi đáp của bạn.";
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    render(<RsvpForm code="custom-code" guestName="Minh" maxGuests={2} copy={copy} fetcher={fetcher} />);
    expect(screen.getByText("Kính mời")).toBeInTheDocument();
    expect(screen.getByText("Bạn sẽ đến chung vui chứ?")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Có, mình sẽ đến"));
    fireEvent.change(screen.getByLabelText("Số khách đi cùng"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Lời chúc"), { target: { value: "Hẹn gặp nhé" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận ngay" }));

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ attendance: "attending", guestCount: 2, message: "Hẹn gặp nhé" });
    expect(await screen.findByText("Đã ghi nhận lời hồi đáp của bạn.")).toBeInTheDocument();
  });
});
