// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultInvitationContent } from "@/config/invitation-content";
import { GiftSection } from "./gift-section";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("GiftSection", () => {
  it("submits the invitation guest wish and clears the form on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "Đã gửi lời chúc." }), { status: 201 }));
    const copy = defaultInvitationContent().gift;
    render(<GiftSection copy={copy} nextTargetId="xac-nhan-tham-du" invitationCode="demo" />);
    fireEvent.change(screen.getByLabelText(copy.nameLabel), { target: { value: "Minh" } });
    fireEvent.change(screen.getByLabelText(copy.messageLabel), { target: { value: "Hẹn gặp nhé" } });
    fireEvent.click(screen.getByRole("button", { name: copy.submitLabel }));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith("/api/wishes", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse(String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body))).toEqual({ invitationCode: "demo", name: "Minh", message: "Hẹn gặp nhé" });
    await waitFor(() => expect(screen.getByLabelText(copy.nameLabel)).toHaveValue(""));
    expect(screen.getByText(copy.successMessage)).toBeInTheDocument();
  });

  it("keeps entered values when submission fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "Không thể lưu lời chúc." }), { status: 500 }));
    const copy = defaultInvitationContent().gift;
    render(<GiftSection copy={copy} nextTargetId="loi-cam-on" />);
    fireEvent.change(screen.getByLabelText(copy.nameLabel), { target: { value: "Lan" } });
    fireEvent.change(screen.getByLabelText(copy.messageLabel), { target: { value: "Mong ngày vui trọn vẹn" } });
    fireEvent.click(screen.getByRole("button", { name: copy.submitLabel }));
    await waitFor(() => expect(screen.getByText("Không thể lưu lời chúc.")).toBeInTheDocument());
    expect(screen.getByLabelText(copy.nameLabel)).toHaveValue("Lan");
    expect(screen.getByLabelText(copy.messageLabel)).toHaveValue("Mong ngày vui trọn vẹn");
  });

  it("renders the QR source exactly as provided without crop styling", () => {
    const copy = { ...defaultInvitationContent().gift, qrImageSrc: "/uploads/qr-original.png" };
    render(<GiftSection copy={copy} nextTargetId="xac-nhan-tham-du" />);
    const image = screen.getByRole("img", { name: copy.qrAlt });
    expect(image).toHaveAttribute("src", copy.qrImageSrc);
    expect(image).not.toHaveStyle({ objectFit: "cover" });
  });
});
