// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InvitationPreviewDialog } from "./invitation-preview-dialog";

describe("InvitationPreviewDialog", () => {
  afterEach(() => cleanup());

  it("starts with the mobile invitation iframe and refreshes from refreshKey", () => {
    render(<InvitationPreviewDialog open onClose={vi.fn()} refreshKey={3} />);

    const iframe = screen.getByTitle("Xem trước toàn bộ thiệp");
    expect(iframe).toHaveAttribute("src", "/?preview=3");
    expect(iframe).toHaveAttribute("sandbox", "allow-same-origin allow-scripts allow-forms");
    expect(screen.getByTestId("invitation-preview-device")).toHaveClass("is-mobile");
    expect(screen.getByRole("link", { name: "Mở tab mới" })).toHaveAttribute("href", "/?preview=3");
  });

  it("switches the iframe to the desktop viewport", async () => {
    const user = userEvent.setup();
    render(<InvitationPreviewDialog open onClose={vi.fn()} refreshKey={3} />);

    await user.click(screen.getByRole("button", { name: "Desktop" }));

    expect(screen.getByTestId("invitation-preview-device")).toHaveClass("is-desktop");
    expect(screen.getByRole("button", { name: "Desktop" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toHaveStyle({ width: "1280px", height: "800px" });
  });

  it("supports a custom preview URL and closes on Escape", () => {
    const onClose = vi.fn();
    render(<InvitationPreviewDialog open onClose={onClose} refreshKey={2} previewUrl="/moi/ABC" />);

    expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toHaveAttribute("src", "/moi/ABC?preview=2");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(<InvitationPreviewDialog open={false} onClose={vi.fn()} refreshKey={0} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores the original trigger after a close callback changes during refresh", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open preview";
    document.body.appendChild(trigger);
    trigger.focus();
    const { rerender, unmount } = render(<InvitationPreviewDialog open onClose={() => undefined} refreshKey={1} />);

    rerender(<InvitationPreviewDialog open onClose={() => undefined} refreshKey={2} />);
    unmount();

    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
