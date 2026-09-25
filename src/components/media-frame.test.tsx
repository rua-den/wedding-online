// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { MediaAsset } from "@/lib/media-store";
import { MediaFrame, mediaFrameSizes, mediaFrameStyle } from "./media-frame";

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

describe("MediaFrame", () => {
  afterEach(() => cleanup());

  it("converts persisted crop values into shared image styles", () => {
    expect(mediaFrameStyle({ ...asset, focusX: 20, focusY: 70, zoom: 1.5 })).toEqual({
      objectPosition: "20% 70%",
      transform: "scale(1.5)",
      transformOrigin: "20% 70%",
    });
  });

  it("uses slot-aware responsive size hints", () => {
    expect(mediaFrameSizes("hero")).toBe("100vw");
    expect(mediaFrameSizes("groom")).toContain("38vw");
    expect(mediaFrameSizes("gallery")).toContain("46vw");
  });

  it("renders a cover image through the Next image optimizer while preserving crop", () => {
    render(<MediaFrame asset={{ ...asset, focusX: 20, focusY: 70, zoom: 1.5 }} />);

    const image = screen.getByRole("img");
    expect(image).toHaveStyle({
      objectPosition: "20% 70%",
      transform: "scale(1.5)",
    });
    expect(image).toHaveAttribute("sizes", "100vw");
    const src = new URL(image.getAttribute("src")!, "http://localhost");
    expect(src.pathname).toBe("/_next/image");
    expect(src.searchParams.get("url")).toBe(asset.src);
    expect(image.getAttribute("srcset")).toContain("/_next/image");
  });

  it("renders a slot-specific fallback after an image load error", () => {
    render(<MediaFrame asset={asset} />);

    fireEvent.error(screen.getByRole("img", { name: "Ảnh cover" }));

    expect(screen.queryByRole("img", { name: "Ảnh cover" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ảnh cover không thể tải" })).toHaveClass(
      "media-frame-fallback",
      "media-frame-fallback-hero",
    );
  });

  it("uses initials as the portrait fallback when a couple image cannot load", () => {
    render(<MediaFrame asset={{ ...asset, slot: "groom", alt: "Chú rể" }} />);

    fireEvent.error(screen.getByRole("img", { name: "Chú rể" }));

    expect(screen.getByRole("img", { name: "Chú rể không thể tải" })).toHaveTextContent("H");
  });
});
