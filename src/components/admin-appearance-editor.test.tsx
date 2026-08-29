// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminAppearanceEditor } from "./admin-appearance-editor";

afterEach(() => cleanup());

describe("AdminAppearanceEditor", () => {
  it("keeps a selected theme pending until save", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ appearance: { themeId: "sage-garden" } }), { status: 200 }));

    render(<AdminAppearanceEditor initialAppearance={{ themeId: "ivory-gold" }} fetcher={fetcher} />);
    expect(screen.getByRole("button", { name: "Lưu giao diện" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /Sage Garden/ }));
    expect(screen.getByText("Chưa lưu thay đổi")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Lưu giao diện" }));
    expect(fetcher).toHaveBeenCalledWith("/api/admin/appearance", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ themeId: "sage-garden" }),
    }));
    expect(await screen.findByText("Đã lưu giao diện thiệp.")).toBeInTheDocument();
    expect(screen.getByText("Đã đồng bộ")).toBeInTheDocument();
  });

  it("previews an unsaved theme without calling the save API", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    render(<AdminAppearanceEditor initialAppearance={{ themeId: "ivory-gold" }} previewUrl="/moi/test-guest" fetcher={fetcher} />);

    await user.click(screen.getByRole("button", { name: "Xem trước Midnight Gold" }));

    const frame = screen.getByTitle("Xem trước toàn bộ thiệp");
    expect(frame.getAttribute("src")).toContain("/moi/test-guest?previewTheme=midnight-gold");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces a recoverable warning for a removed stored theme", () => {
    render(<AdminAppearanceEditor initialAppearance={{ themeId: "ivory-gold", invalidStoredThemeId: "removed-theme" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("removed-theme");
  });
});
