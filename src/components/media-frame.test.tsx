// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { MediaAsset } from "@/lib/media-store";
import { MediaFrame, mediaFrameStyle } from "./media-frame";

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

  it("renders a cover image using the persisted crop values", () => {
    render(<MediaFrame asset={{ ...asset, focusX: 20, focusY: 70, zoom: 1.5 }} />);

    expect(screen.getByRole("img")).toHaveStyle({
      objectPosition: "20% 70%",
      transform: "scale(1.5)",
    });
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
