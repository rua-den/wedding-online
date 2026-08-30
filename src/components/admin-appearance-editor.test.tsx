// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminAppearanceEditor } from "./admin-appearance-editor";

afterEach(() => cleanup());

describe("AdminAppearanceEditor", () => {
  it("keeps theme and font selections pending until save", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      appearance: { themeId: "sage-garden", fontId: "lora" },
    }), { status: 200 }));

    render(<AdminAppearanceEditor initialAppearance={{ themeId: "ivory-gold", fontId: "classic-serif" }} fetcher={fetcher} />);
    expect(screen.getByRole("button", { name: "Lưu giao diện" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /Sage Garden/ }));
    await user.click(screen.getByRole("radio", { name: /Lora/ }));
    expect(screen.getByText("Chưa lưu thay đổi")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Lưu giao diện" }));
    expect(fetcher).toHaveBeenCalledWith("/api/admin/appearance", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ themeId: "sage-garden", fontId: "lora" }),
    }));
    expect(await screen.findByText("Đã lưu giao diện thiệp.")).toBeInTheDocument();
    expect(screen.getByText("Đã đồng bộ")).toBeInTheDocument();
  });

  it("previews unsaved theme and font without calling the save API", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    render(<AdminAppearanceEditor
      initialAppearance={{ themeId: "ivory-gold", fontId: "classic-serif" }}
      previewUrl="/moi/test-guest"
      fetcher={fetcher}
    />);

    await user.click(screen.getByRole("button", { name: "Xem trước Midnight Gold" }));
    await user.click(screen.getByRole("button", { name: "Xem trước Cormorant Garamond" }));

    const frame = screen.getByTitle("Xem trước toàn bộ thiệp");
    expect(frame.getAttribute("src")).toContain("previewTheme=midnight-gold");
    expect(frame.getAttribute("src")).toContain("previewFont=cormorant-garamond");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows Vietnamese sample text for wedding fonts", () => {
    render(<AdminAppearanceEditor initialAppearance={{ themeId: "ivory-gold", fontId: "classic-serif" }} fetcher={vi.fn()} />);
    expect(screen.getAllByText(/Ước hẹn ngày cưới/)).toHaveLength(5);
    expect(screen.getByRole("radio", { name: /Playfair Display/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Noto Serif Display/ })).toBeInTheDocument();
  });

  it("lets an admin repair removed stored appearance presets by saving fallbacks", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      appearance: { themeId: "ivory-gold", fontId: "classic-serif" },
    }), { status: 200 }));
    render(<AdminAppearanceEditor
      initialAppearance={{
        themeId: "ivory-gold",
        fontId: "classic-serif",
        invalidStoredThemeId: "removed-theme",
        invalidStoredFontId: "removed-font",
      }}
      fetcher={fetcher}
    />);

    expect(screen.getByRole("alert")).toHaveTextContent("removed-theme");
    expect(screen.getByRole("alert")).toHaveTextContent("removed-font");
    expect(screen.getByRole("button", { name: "Lưu giao diện" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Lưu giao diện" }));
    expect(fetcher).toHaveBeenCalledWith("/api/admin/appearance", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ themeId: "ivory-gold", fontId: "classic-serif" }),
    }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await screen.findByText("Đã lưu giao diện thiệp.")).toBeInTheDocument();
  });
});
