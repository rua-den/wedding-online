import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Countdown } from "./countdown";

describe("Countdown server render", () => {
  it("renders a stable placeholder before the browser calculates the remaining time", () => {
    const markup = renderToStaticMarkup(<Countdown eventTime="2099-12-31T00:00:00+07:00" />);

    expect(markup.match(/<strong>00<\/strong>/g)).toHaveLength(4);
  });
});
