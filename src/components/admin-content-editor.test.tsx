// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { AdminContentEditor } from "./admin-content-editor";

afterEach(() => cleanup());

describe("AdminContentEditor font size controls", () => {
  it("persists a per-field font scale with the edited copy", async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const content = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ content }), { status: 200 });
    });
    render(<AdminContentEditor initialContent={defaultInvitationContent()} fetcher={request} />);

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(10);
    fireEvent.change(sliders[0], { target: { value: "150" } });
    expect(screen.getByText("150%")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Lưu nội dung" }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    const [, init] = request.mock.calls[0]!;
    const saved = JSON.parse(String(init?.body)) as { fontScales: Record<string, number> };
    expect(saved.fontScales["couple.groom"]).toBe(150);
  });

  it("adds size controls only to display copy, not technical event fields", async () => {
    render(<AdminContentEditor initialContent={defaultInvitationContent()} fetcher={vi.fn()} />);
    await userEvent.click(screen.getByRole("tab", { name: "Lễ cưới" }));

    expect(screen.getAllByRole("slider")).toHaveLength(9);
    expect(screen.getByText("Ngày giờ ISO (dùng countdown)")).toBeInTheDocument();
    expect(screen.getByText("Google Maps URL")).toBeInTheDocument();
  });
});
