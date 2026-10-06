// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import type { MediaAsset } from "@/lib/media-store";
import { AdminContentEditor } from "./admin-content-editor";

afterEach(() => cleanup());

describe("AdminContentEditor font size controls", () => {
  it("persists a per-field font scale with the edited copy", async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const content = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ content }), { status: 200 });
    });
    render(<AdminContentEditor initialContent={defaultInvitationContent()} fetcher={request} />);

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(10);
    fireEvent.change(sliders[0], { target: { value: "150" } });
    expect(screen.getByText("150%")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    const [, init] = request.mock.calls[0]!;
    const saved = JSON.parse(String(init?.body)) as { fontScales: Record<string, number> };
    expect(saved.fontScales["couple.groom"]).toBe(150);
  });

  it("adds size controls only to display copy, not technical event fields", async () => {
    render(<AdminContentEditor initialContent={defaultInvitationContent()} fetcher={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Lễ cưới" }));

    expect(screen.getAllByRole("slider")).toHaveLength(9);
    expect(screen.getByText("Ngày giờ (dùng countdown)")).toBeInTheDocument();
    expect(screen.getByText("Google Maps URL")).toBeInTheDocument();
  });

  it("keeps gallery image management in the Gallery tab", async () => {
    const galleryAsset: MediaAsset = {
      id: 99,
      slot: "gallery",
      src: "/uploads/gallery-admin.jpg",
      alt: "Ảnh cưới gallery",
      sortOrder: 0,
      active: true,
      focusX: 50,
      focusY: 50,
      zoom: 1,
      createdAt: "",
      updatedAt: "",
    };
    render(<AdminContentEditor initialContent={defaultInvitationContent()} initialMedia={[galleryAsset]} fetcher={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Gallery" }));

    expect(screen.getByRole("heading", { name: "Ảnh gallery" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ảnh cưới gallery" })).toBeInTheDocument();
    expect(screen.getByText("+ Thêm ảnh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Căn khung" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument();
  });

  it("renders technical event times as local datetime pickers", async () => {
    render(<AdminContentEditor initialContent={defaultInvitationContent()} fetcher={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Lễ cưới" }));

    const dateTime = screen.getByLabelText("Ngày giờ (dùng countdown)") as HTMLInputElement;
    const deadline = screen.getByLabelText("Hạn RSVP") as HTMLInputElement;
    expect(dateTime.type).toBe("datetime-local");
    expect(deadline.type).toBe("datetime-local");
    expect(dateTime.value).toBe("2027-12-19T10:30");
  });
});
