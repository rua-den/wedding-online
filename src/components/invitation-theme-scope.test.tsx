import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InvitationThemeScope } from "./invitation-theme-scope";

describe("InvitationThemeScope", () => {
  it("combines the midnight palette with a selected display font", () => {
    const html = renderToStaticMarkup(
      <InvitationThemeScope themeId="midnight-gold" fontId="cormorant-garamond">
        <p>Thiệp cưới</p>
      </InvitationThemeScope>,
    );

    expect(html).toContain('data-invitation-theme="midnight-gold"');
    expect(html).toContain('data-invitation-font="cormorant-garamond"');
    expect(html).toContain('--invitation-ink:#f7f1e6');
    expect(html).toContain('--invitation-font-display:var(--font-cormorant-garamond)');
    expect(html).toContain('color-scheme:dark');
  });
});
