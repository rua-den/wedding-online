// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RsvpForm } from "./rsvp-form";

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
});
