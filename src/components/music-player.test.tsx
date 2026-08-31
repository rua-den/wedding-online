// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MusicPlayer } from "./music-player";

const settings = {
  enabled: true,
  src: "/uploads/1788039000005-f2a49997-39dd-4e53-878c-3cb63437fefe.mp3",
  title: "Wedding song",
  loop: true,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MusicPlayer", () => {
  it("attempts autoplay immediately and retries when the audio becomes ready", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("Autoplay blocked", "NotAllowedError"))
      .mockResolvedValue(undefined);

    const { container } = render(<MusicPlayer settings={settings} />);
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio).toHaveAttribute("autoplay");
    expect(audio).toHaveAttribute("playsinline");

    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Phát Wedding song" })).toBeInTheDocument();

    fireEvent.canPlay(audio!);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  });

  it("retries blocked autoplay on the first interaction anywhere on the page", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("Autoplay blocked", "NotAllowedError"))
      .mockResolvedValue(undefined);

    render(<MusicPlayer settings={settings} />);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));

    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Tạm dừng Wedding song" })).toBeInTheDocument();
  });
});
