// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MediaAsset } from "@/lib/media-store";
import { MediaCropEditor } from "./media-crop-editor";

const asset: MediaAsset = {
  id: 1,
  slot: "hero",
  src: "/uploads/hero.jpg",
  alt: "Ảnh cover",
  sortOrder: 0,
  active: true,
  focusX: 50,
  focusY: 50,
  zoom: 1,
  createdAt: "",
  updatedAt: "",
};

describe("MediaCropEditor", () => {
  afterEach(() => cleanup());

  it("saves the local range values only from Lưu căn chỉnh", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MediaCropEditor asset={asset} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Ngang"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Dọc"), { target: { value: "75" } });
    fireEvent.change(screen.getByLabelText("Thu phóng"), { target: { value: "1" } });
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Lưu căn chỉnh" }));

    expect(onSave).toHaveBeenCalledWith({ focusX: 25, focusY: 75, zoom: 1 });
  });

  it("does not save when cancelled and closes on Escape", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<MediaCropEditor asset={asset} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    cleanup();
    const secondClose = vi.fn();
    render(<MediaCropEditor asset={asset} onSave={onSave} onClose={secondClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(secondClose).toHaveBeenCalledTimes(1);
  });

  it("updates range values when the preview is dragged", () => {
    render(<MediaCropEditor asset={asset} onSave={vi.fn()} onClose={vi.fn()} />);
    const preview = screen.getByTestId("media-crop-preview");

    fireEvent.pointerDown(preview, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(preview, { clientX: 150, clientY: 125, pointerId: 1 });
    fireEvent.pointerUp(preview, { clientX: 150, clientY: 125, pointerId: 1 });

    expect(screen.getByLabelText("Ngang")).not.toHaveValue(50);
    expect(screen.getByLabelText("Dọc")).not.toHaveValue(50);
  });

  it("switches hero preview between mobile and desktop frames", async () => {
    const user = userEvent.setup();
    render(<MediaCropEditor asset={asset} onSave={vi.fn()} onClose={vi.fn()} />);

    const frame = screen.getByTestId("media-crop-preview-frame");
    expect(frame).toHaveClass("is-mobile");
    await user.click(screen.getByRole("button", { name: "Desktop" }));
    expect(frame).toHaveClass("is-desktop");
    expect(screen.getByRole("button", { name: "Desktop" })).toHaveAttribute("aria-pressed", "true");
  });
});
