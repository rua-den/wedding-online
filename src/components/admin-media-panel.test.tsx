// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import type { MediaAsset } from "@/lib/media-store";
import { AdminMediaPanel } from "./admin-media-panel";

const assets: MediaAsset[] = [
  { id: 1, slot: "hero", src: "/uploads/hero.jpg", alt: "Hero", sortOrder: 0, active: true, focusX: 20, focusY: 70, zoom: 1.5, createdAt: "", updatedAt: "" },
  { id: 2, slot: "groom", src: "/uploads/groom.jpg", alt: "Groom", sortOrder: 0, active: true, focusX: 50, focusY: 50, zoom: 1, createdAt: "", updatedAt: "" },
  { id: 3, slot: "bride", src: "/uploads/bride.jpg", alt: "Bride", sortOrder: 0, active: true, focusX: 50, focusY: 50, zoom: 1, createdAt: "", updatedAt: "" },
  { id: 4, slot: "story", src: "/uploads/story.jpg", alt: "Story", sortOrder: 0, active: true, focusX: 50, focusY: 50, zoom: 1, createdAt: "", updatedAt: "" },
  { id: 5, slot: "venue", src: "/uploads/venue.jpg", alt: "Venue", sortOrder: 0, active: true, focusX: 50, focusY: 50, zoom: 1, createdAt: "", updatedAt: "" },
  { id: 6, slot: "gallery", src: "/uploads/gallery.jpg", alt: "Gallery", sortOrder: 0, active: true, focusX: 50, focusY: 50, zoom: 1, createdAt: "", updatedAt: "" },
];

const assetsWithInactiveSingleton: MediaAsset[] = [
  ...assets,
  { id: 7, slot: "hero", src: "/uploads/old-hero.jpg", alt: "Ảnh cover cũ", sortOrder: 1, active: false, focusX: 35, focusY: 55, zoom: 1, createdAt: "", updatedAt: "" },
];

const assetsWithGalleryOrder: MediaAsset[] = [
  ...assets,
  { id: 7, slot: "gallery", src: "/uploads/gallery-two.jpg", alt: "Gallery two", sortOrder: 1, active: true, focusX: 50, focusY: 50, zoom: 1, createdAt: "", updatedAt: "" },
];

describe("AdminMediaPanel preview shapes", () => {
  afterEach(() => cleanup());

  it("exposes shared public shape classes and both hero viewport previews", () => {
    const { container } = render(<AdminMediaPanel initialAssets={assets} />);

    expect(container.querySelector(".media-frame-slot-hero.media-frame-hero-mobile")).toBeInTheDocument();
    expect(container.querySelector(".media-frame-slot-hero.media-frame-hero-desktop")).toBeInTheDocument();
    expect(container.querySelector(".media-frame-slot-portrait")).toBeInTheDocument();
    expect(container.querySelector(".media-frame-slot-story")).toBeInTheDocument();
    expect(container.querySelector(".media-frame-slot-venue")).toBeInTheDocument();
    expect(container.querySelector(".media-frame-slot-gallery")).toBeInTheDocument();
    expect(screen.getByText("Trang bìa · Mobile")).toBeInTheDocument();
    expect(screen.getByText("Trang bìa · Desktop")).toBeInTheDocument();
    expect(screen.getAllByText("Cô dâu & chú rể")).toHaveLength(2);
    expect(screen.getByText("Hành trình yêu thương")).toBeInTheDocument();
    expect(screen.getByText("Lễ thành hôn")).toBeInTheDocument();
    expect(screen.getByText("Những khoảnh khắc")).toBeInTheDocument();
  });

  it("exposes crop actions for active assets and opens the full invitation preview", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<AdminMediaPanel initialAssets={assets} request={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: "Căn khung" })).toHaveLength(6);
    await user.click(screen.getByRole("button", { name: "Xem trước toàn bộ thiệp" }));
    expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toHaveAttribute("src", "/?preview=0");
  });

  it("patches a crop and refreshes an already-open invitation preview", async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as { id: number; focusX: number; focusY: number; zoom: number };
        return new Response(JSON.stringify({ asset: { ...assets[0], focusX: body.focusX, focusY: body.focusY, zoom: body.zoom } }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<AdminMediaPanel initialAssets={assets} request={request} />);

    await user.click(screen.getByRole("button", { name: "Xem trước toàn bộ thiệp" }));
    await user.click(screen.getAllByRole("button", { name: "Căn khung" })[0]);
    fireEvent.change(screen.getByLabelText("Ngang"), { target: { value: "25" } });
    await user.click(screen.getByRole("button", { name: "Lưu căn chỉnh" }));

    await waitFor(() => expect(request).toHaveBeenCalledWith("/api/admin/media", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ id: 1, focusX: 25, focusY: 70, zoom: 1.5 }),
    })));
    await waitFor(() => expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toHaveAttribute("src", "/?preview=1"));
  });

  it("keeps the existing crop and shows a Vietnamese error when the PATCH fails", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ message: "Không thể cập nhật ảnh." }), { status: 500 }));
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<AdminMediaPanel initialAssets={assets} request={request} />);

    await user.click(screen.getAllByRole("button", { name: "Căn khung" })[0]);
    fireEvent.change(screen.getByLabelText("Ngang"), { target: { value: "25" } });
    await user.click(screen.getByRole("button", { name: "Lưu căn chỉnh" }));

    await waitFor(() => expect(screen.getByText("Không thể cập nhật ảnh.")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Ngang")).toHaveValue("25");
  });

  it("keeps only the crop dialog active above the full preview", async () => {
    const user = userEvent.setup();
    render(<AdminMediaPanel initialAssets={assets} request={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Xem trước toàn bộ thiệp" }));
    expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Căn khung" })[0]);

    expect(screen.queryByTitle("Xem trước toàn bộ thiệp")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Hero" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Hero" })).not.toBeInTheDocument();
    expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toBeInTheDocument();
  });

  it("restores the crop trigger after a failed save and panel rerenders", async () => {
    const user = userEvent.setup();
    const request = vi.fn(async () => new Response(JSON.stringify({ message: "Không thể cập nhật ảnh." }), { status: 500 }));
    render(<AdminMediaPanel initialAssets={assets} request={request} />);
    const trigger = screen.getAllByRole("button", { name: "Căn khung" })[0];

    await user.click(trigger);
    fireEvent.change(screen.getByLabelText("Ngang"), { target: { value: "25" } });
    await user.click(screen.getByRole("button", { name: "Lưu căn chỉnh" }));
    await waitFor(() => expect(screen.getByText("Không thể cập nhật ảnh.")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Hủy" }));

    expect(trigger).toHaveFocus();
  });

  it("restores the exact crop trigger and desktop mode after preview-to-crop editing", async () => {
    const user = userEvent.setup();
    render(<AdminMediaPanel initialAssets={assets} request={vi.fn()} />);
    const previewTrigger = screen.getByRole("button", { name: "Xem trước toàn bộ thiệp" });
    await user.click(previewTrigger);
    await user.click(screen.getByRole("button", { name: "Desktop" }));
    expect(screen.getByTestId("invitation-preview-device")).toHaveClass("is-desktop");

    const cropTrigger = screen.getAllByRole("button", { name: "Căn khung" })[0];
    await user.click(cropTrigger);
    expect(screen.queryByTitle("Xem trước toàn bộ thiệp")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toBeInTheDocument();
    expect(screen.getByTestId("invitation-preview-device")).toHaveClass("is-desktop");
    expect(cropTrigger).toHaveFocus();
  });

  it("keeps inactive singleton replacements visible with activate and delete actions", async () => {
    const user = userEvent.setup();
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return new Response(JSON.stringify({ asset: { ...assetsWithInactiveSingleton[6], active: true } }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    render(<AdminMediaPanel initialAssets={assetsWithInactiveSingleton} request={request} />);

    expect(screen.getByText("Ảnh đã thay")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ảnh cover cũ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kích hoạt.*Ảnh cover cũ/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xóa.*Ảnh cover cũ/i })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Hero" })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /Kích hoạt.*Ảnh cover cũ/i }));

    expect(request).toHaveBeenCalledWith("/api/admin/media", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ id: 7, active: true }),
    }));
    expect(screen.getByText("Đã kích hoạt ảnh.")).toBeInTheDocument();
  });

  it("calls the same reorder API from labelled before/after controls", async () => {
    const user = userEvent.setup();
    const request = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<AdminMediaPanel initialAssets={assetsWithGalleryOrder} request={request} />);

    const moveAfter = screen.getByRole("button", { name: /Đưa Gallery ra sau/i });
    expect(moveAfter).toBeEnabled();
    expect(screen.getByRole("button", { name: /Đưa Gallery lên trước/i })).toBeDisabled();
    await user.click(moveAfter);

    expect(request).toHaveBeenCalledWith("/api/admin/media/order", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ ids: [7, 6] }),
    }));
  });
});
