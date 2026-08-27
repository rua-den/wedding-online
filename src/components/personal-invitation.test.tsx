// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PersonalInvitation } from "./personal-invitation";

afterEach(() => vi.unstubAllGlobals());

describe("PersonalInvitation", () => {
  it("shows a safe fallback when the invitation endpoint returns a non-JSON server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unexpected upstream error", { status: 500 })));

    render(<PersonalInvitation code="invite-code" />);

    expect(await screen.findByText("Không thể tải thiệp mời. Vui lòng thử lại sau.")).toBeInTheDocument();
  });
});
