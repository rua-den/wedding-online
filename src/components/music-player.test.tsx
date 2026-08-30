// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OPEN_INVITATION_EVENT } from "@/lib/invitation-events";
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
  it("attempts autoplay and retries from the open-invitation user gesture", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("Autoplay blocked", "NotAllowedError"))
      .mockResolvedValue(undefined);

    render(<MusicPlayer settings={settings} />);

    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Phát Wedding song" })).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event(OPEN_INVITATION_EVENT)));
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  });
});
