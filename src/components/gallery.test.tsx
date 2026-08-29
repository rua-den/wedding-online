// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Gallery } from "./gallery";

const assets = [
  { id: 1, slot: "gallery" as const, src: "/uploads/one.jpg", alt: "Một", sortOrder: 0, active: true, focusX: 20, focusY: 70, zoom: 1.5, createdAt: "", updatedAt: "" },
  { id: 2, slot: "gallery" as const, src: "/uploads/two.jpg", alt: "Hai", sortOrder: 1, active: true, focusX: 50, focusY: 50, zoom: 1, createdAt: "", updatedAt: "" },
];

describe("Gallery", () => {
  afterEach(() => cleanup());

  it("renders an empty state when no images exist", () => {
    render(<Gallery assets={[]} />);
    expect(screen.getByText("Những khoảnh khắc của chúng mình sẽ được cập nhật tại đây.")).toBeInTheDocument();
  });

  it("opens a keyboard-accessible lightbox with next and close controls", () => {
    render(<Gallery assets={assets} />);
    expect(within(screen.getByRole("button", { name: "Một" })).getByRole("img")).toHaveStyle({
      objectPosition: "20% 70%",
      transform: "scale(1.5)",
    });
    fireEvent.click(screen.getByRole("button", { name: "Một" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByRole("img", { name: "Một" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ảnh tiếp theo" }));
    expect(within(screen.getByRole("dialog")).getByRole("img", { name: "Hai" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đóng ảnh" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("focuses the lightbox, traps Tab, and restores the exact opening trigger", () => {
    render(<Gallery assets={assets} />);
    const trigger = screen.getByRole("button", { name: "Một" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    const close = within(dialog).getByRole("button", { name: "Đóng ảnh" });
    const previous = within(dialog).getByRole("button", { name: "Ảnh trước" });
    const next = within(dialog).getByRole("button", { name: "Ảnh tiếp theo" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(previous).toHaveFocus();
    next.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(next).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
