import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Countdown } from "./countdown";

describe("Countdown server render", () => {
  afterEach(() => vi.useRealTimers());

  it("renders the actual remaining time instead of a 00 placeholder", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-29T22:58:57+07:00"));

    const markup = renderToStaticMarkup(<Countdown eventTime="2026-12-31T00:00:00+07:00" />);

    expect(markup).toContain("<strong>01</strong><span>Ngày</span>");
    expect(markup).toContain("<strong>01</strong><span>Giờ</span>");
    expect(markup).toContain("<strong>01</strong><span>Phút</span>");
    expect(markup).toContain("<strong>03</strong><span>Giây</span>");
  });
});
