import { describe, expect, it } from "vitest";

import { defaultInvitationThemeId, invitationThemes } from "./invitation-themes";

function channel(value: string): number {
  const normalized = Number.parseInt(value, 16) / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const r = channel(value.slice(0, 2));
  const g = channel(value.slice(2, 4));
  const b = channel(value.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("invitation theme presets", () => {
  it("keeps the current invitation palette as the exact default baseline", () => {
    const theme = invitationThemes.find((item) => item.id === defaultInvitationThemeId);
    expect(theme?.tokens).toMatchObject({
      canvas: "#fffaf0",
      paper: "#fffdf8",
      alternate: "#f4eadb",
      eventSurface: "#e9ddc5",
      ink: "#3e352c",
      muted: "#796d60",
      accent: "#dcc59b",
      accentStrong: "#a88458",
      botanical: "#899582",
      footerSurface: "#3e352c",
      actionSurface: "#3e352c",
      actionText: "#fff9ef",
    });
  });

  it.each(invitationThemes)("keeps key text/action pairs WCAG AA in $id", (theme) => {
    const { tokens } = theme;
    const pairs = [
      [tokens.ink, tokens.canvas],
      [tokens.ink, tokens.paper],
      [tokens.muted, tokens.paper],
      [tokens.inverseText, tokens.footerSurface],
      [tokens.actionText, tokens.actionSurface],
    ] as const;
    for (const [foreground, background] of pairs) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
