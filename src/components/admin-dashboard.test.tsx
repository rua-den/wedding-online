// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminInvitation, AdminRsvp, AdminSummary } from "@/lib/sqlite-store";
import { AdminDashboard } from "./admin-dashboard";

const summary: AdminSummary = {
  invitationCount: 2,
  respondedCount: 1,
  attendingCount: 1,
  declinedCount: 0,
  pendingCount: 1,
  confirmedGuestCount: 2,
};

const invitations: AdminInvitation[] = [
  { code: "lan-abc", name: "Cô Lan", maxGuests: 2, active: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", attendance: "attending", guestCount: 2, rsvpUpdatedAt: "2026-01-02T00:00:00.000Z" },
  { code: "minh-xyz", name: "Anh Minh", maxGuests: 1, active: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", attendance: null, guestCount: null, rsvpUpdatedAt: null },
];

const rsvps: AdminRsvp[] = [
  { code: "lan-abc", name: "Cô Lan", maxGuests: 2, active: true, attendance: "attending", guestCount: 2, message: "Hẹn gặp hai bạn!", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
  { code: "minh-xyz", name: "Anh Minh", maxGuests: 1, active: true, attendance: null, guestCount: null, message: "", createdAt: null, updatedAt: null },
];

function fixture(overrides: Partial<React.ComponentProps<typeof AdminDashboard>> = {}) {
  return { summary, invitations, rsvps, siteUrl: "http://localhost:3000", ...overrides };
}

describe("AdminDashboard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not duplicate venue/date editing from the content editor", () => {
    render(<AdminDashboard {...fixture()} />);
    expect(screen.queryByRole("heading", { name: "Địa điểm & thời gian" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lưu thông tin địa điểm" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quản lý khách mời" })).toBeInTheDocument();
  });

  it("creates an invitation then renders its copyable link", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ invitation: { ...invitations[0], name: "Cô Lan mới", code: "co-lan-moi" }, invitationUrl: "http://localhost:3000/moi/co-lan-moi", summary }), { status: 201 }));
    render(<AdminDashboard {...fixture({ fetcher })} />);
    await user.type(screen.getByLabelText("Tên khách mời"), "Cô Lan mới");
    await user.click(screen.getByRole("button", { name: "Tạo link mời" }));
    expect(await screen.findByText("Đã tạo link mời cho Cô Lan mới")).toBeInTheDocument();
    expect(screen.getByDisplayValue("http://localhost:3000/moi/co-lan-moi")).toBeInTheDocument();
  });

  it("filters invitation links by lifecycle and RSVP state", async () => {
    const user = userEvent.setup();
    const disabledInvitation: AdminInvitation = { ...invitations[1], code: "test-disabled", name: "Khách đã tắt", active: false };
    render(<AdminDashboard {...fixture({ invitations: [...invitations, disabledInvitation] })} />);
    const filter = screen.getByRole("combobox", { name: "Lọc thiệp mời" });
    await user.selectOptions(filter, "disabled");
    expect(screen.getByRole("link", { name: "http://localhost:3000/moi/test-disabled" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "http://localhost:3000/moi/lan-abc" })).not.toBeInTheDocument();
    await user.selectOptions(filter, "responded");
    expect(screen.getByRole("link", { name: "http://localhost:3000/moi/lan-abc" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "http://localhost:3000/moi/minh-xyz" })).not.toBeInTheDocument();
  });

  it("filters RSVP rows to pending guests", async () => {
    const user = userEvent.setup();
    render(<AdminDashboard {...fixture()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Trạng thái RSVP" }), "pending");
    expect((await screen.findAllByText("Chưa phản hồi")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Hẹn gặp hai bạn!")).not.toBeInTheDocument();
  });

  it("toggles an invitation active state through the protected API", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ invitation: { ...invitations[0], active: false }, summary }), { status: 200 }));
    render(<AdminDashboard {...fixture({ fetcher })} />);
    await user.click(screen.getAllByRole("button", { name: "Tắt link" })[0]);
    expect(await screen.findByRole("button", { name: "Bật link" })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/invitations", expect.objectContaining({ method: "PATCH" }));
  });

  it("deletes an invitation after an RSVP-aware confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);
    const updatedSummary = { ...summary, invitationCount: 1, respondedCount: 0, attendingCount: 0, confirmedGuestCount: 0 };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ deleted: { code: "lan-abc", name: "Cô Lan", hadRsvp: true }, summary: updatedSummary }), { status: 200 }));
    render(<AdminDashboard {...fixture({ fetcher })} />);
    await user.click(screen.getByRole("button", { name: "Xóa link của Cô Lan" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("RSVP"));
    expect(fetcher).toHaveBeenCalledWith("/api/admin/invitations", expect.objectContaining({ method: "DELETE" }));
    expect(await screen.findByText("Đã xoá link mời của Cô Lan.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "http://localhost:3000/moi/lan-abc" })).not.toBeInTheDocument();
  });

  it("edits an invitation name and guest limit", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ invitation: { ...invitations[0], name: "Cô Lan thân mến", maxGuests: 3 }, summary }), { status: 200 }));
    render(<AdminDashboard {...fixture({ fetcher })} />);
    await user.click(screen.getAllByRole("button", { name: "Sửa" })[0]);
    const nameInput = screen.getByLabelText("Tên khách mời lan-abc");
    await user.clear(nameInput);
    await user.type(nameInput, "Cô Lan thân mến");
    await user.selectOptions(screen.getByLabelText("Số khách tối đa lan-abc"), "3");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("Cô Lan thân mến")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/invitations", expect.objectContaining({ method: "PATCH" }));
  });

  it("shows and copies the personalized URL for each invitation", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<AdminDashboard {...fixture()} />);
    const invitationUrl = "http://localhost:3000/moi/lan-abc";
    expect(screen.getByRole("link", { name: invitationUrl })).toHaveAttribute("href", invitationUrl);
    await user.click(screen.getByRole("button", { name: "Sao chép link cho Cô Lan" }));
    expect(writeText).toHaveBeenCalledWith(invitationUrl);
    expect(await screen.findByText("Đã sao chép link mời cho Cô Lan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem trước thiệp của Cô Lan" })).toHaveAttribute("href", invitationUrl);
  });

  it("announces mutation errors and exposes mobile table scrolling", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Không thể tạo thiệp mời." }), { status: 500 }));
    render(<AdminDashboard {...fixture({ fetcher })} />);
    await user.type(screen.getByLabelText("Tên khách mời"), "Lỗi");
    await user.click(screen.getByRole("button", { name: "Tạo link mời" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Không thể tạo thiệp mời."));
    expect(document.querySelector(".admin-table-wrap")).toBeInTheDocument();
  });
});
