export type InvitationThemeId =
  | "ivory-gold"
  | "blush-rose"
  | "sage-garden"
  | "burgundy-cream"
  | "midnight-gold";

export type InvitationThemeTokens = {
  canvas: string;
  paper: string;
  alternate: string;
  eventSurface: string;
  ink: string;
  muted: string;
  accent: string;
  accentStrong: string;
  botanical: string;
  inverseText: string;
  footerMuted: string;
  inputSurface: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  heroOverlay: string;
  heroText: string;
  groomPortraitStart: string;
  groomPortraitEnd: string;
  bridePortraitStart: string;
  bridePortraitEnd: string;
  borderSoft: string;
  borderMedium: string;
  borderStrong: string;
  inputBorder: string;
  heroOrnament: string;
  portraitLine: string;
  portraitSymbol: string;
  portraitInset: string;
  actionSurface: string;
  actionText: string;
  footerSurface: string;
  focusRing: string;
};

export type InvitationThemeDefinition = {
  id: InvitationThemeId;
  name: string;
  description: string;
  swatches: readonly string[];
  tokens: InvitationThemeTokens;
};

const defineTheme = (theme: InvitationThemeDefinition) => theme;

export const invitationThemes = [
  defineTheme({
    id: "ivory-gold",
    name: "Ivory Gold",
    description: "Thiết kế nguyên bản: ivory ấm, champagne và nâu mực.",
    swatches: ["#fffaf0", "#f4eadb", "#dcc59b", "#a88458", "#3e352c"],
    tokens: {
      canvas: "#fffaf0",
      paper: "#fffdf8",
      alternate: "#f4eadb",
      eventSurface: "#e9ddc5",
      ink: "#3e352c",
      muted: "#796d60",
      accent: "#dcc59b",
      accentStrong: "#a88458",
      botanical: "#899582",
      inverseText: "#fff9ef",
      footerMuted: "#e8dccb",
      inputSurface: "#fffdf8",
      heroStart: "#fffdf6",
      heroMid: "#f7ecd9",
      heroEnd: "#ecddc2",
      heroOverlay: "transparent",
      heroText: "#3e352c",
      groomPortraitStart: "#d3c09e",
      groomPortraitEnd: "#f4e6cf",
      bridePortraitStart: "#ead8d0",
      bridePortraitEnd: "#fff0dd",
      borderSoft: "rgba(168,132,88,.35)",
      borderMedium: "rgba(168,132,88,.45)",
      borderStrong: "rgba(168,132,88,.55)",
      inputBorder: "rgba(168,132,88,.65)",
      heroOrnament: "rgba(137,149,130,.55)",
      portraitLine: "rgba(62,53,44,.28)",
      portraitSymbol: "rgba(62,53,44,.6)",
      portraitInset: "rgba(255,255,255,.38)",
      actionSurface: "#3e352c",
      actionText: "#fff9ef",
      footerSurface: "#3e352c",
      focusRing: "#a88458",
    },
  }),
  defineTheme({
    id: "blush-rose",
    name: "Blush Rose",
    description: "Hồng phấn dịu, dusty rose và chữ nâu ấm dễ đọc.",
    swatches: ["#fff7f6", "#f8e8e6", "#d8a9ad", "#8f5965", "#3f3030"],
    tokens: {
      canvas: "#fff7f6",
      paper: "#fffdfc",
      alternate: "#f8e8e6",
      eventSurface: "#f2dddc",
      ink: "#3f3030",
      muted: "#735f60",
      accent: "#d8a9ad",
      accentStrong: "#8f5965",
      botanical: "#9b8d83",
      inverseText: "#fff8f7",
      footerMuted: "#e7d2d2",
      inputSurface: "#fffdfc",
      heroStart: "#fffafa",
      heroMid: "#f9e9e7",
      heroEnd: "#efd8d7",
      heroOverlay: "rgba(63,48,48,.08)",
      heroText: "#3f3030",
      groomPortraitStart: "#d9b8ad",
      groomPortraitEnd: "#f5ded8",
      bridePortraitStart: "#e8c9cf",
      bridePortraitEnd: "#fff0ee",
      borderSoft: "rgba(143,89,101,.28)",
      borderMedium: "rgba(143,89,101,.4)",
      borderStrong: "rgba(143,89,101,.55)",
      inputBorder: "rgba(143,89,101,.64)",
      heroOrnament: "rgba(155,141,131,.55)",
      portraitLine: "rgba(63,48,48,.25)",
      portraitSymbol: "rgba(63,48,48,.58)",
      portraitInset: "rgba(255,255,255,.42)",
      actionSurface: "#7f4b58",
      actionText: "#fffaf9",
      footerSurface: "#4a3034",
      focusRing: "#8f5965",
    },
  }),
  defineTheme({
    id: "sage-garden",
    name: "Sage Garden",
    description: "Kem sáng, sage trầm và sắc olive mang cảm giác botanical.",
    swatches: ["#fbf8ef", "#edf0e3", "#a8b39a", "#66785f", "#343a31"],
    tokens: {
      canvas: "#fbf8ef",
      paper: "#fffdf7",
      alternate: "#edf0e3",
      eventSurface: "#e2e8d8",
      ink: "#343a31",
      muted: "#657063",
      accent: "#a8b39a",
      accentStrong: "#66785f",
      botanical: "#74836c",
      inverseText: "#fbfff9",
      footerMuted: "#d9e1d5",
      inputSurface: "#fffdf7",
      heroStart: "#fffdf6",
      heroMid: "#eef1e5",
      heroEnd: "#dfe6d5",
      heroOverlay: "rgba(52,58,49,.08)",
      heroText: "#343a31",
      groomPortraitStart: "#bfc6aa",
      groomPortraitEnd: "#ebe8d7",
      bridePortraitStart: "#d8d8bd",
      bridePortraitEnd: "#f7f2df",
      borderSoft: "rgba(102,120,95,.28)",
      borderMedium: "rgba(102,120,95,.4)",
      borderStrong: "rgba(102,120,95,.55)",
      inputBorder: "rgba(102,120,95,.68)",
      heroOrnament: "rgba(116,131,108,.58)",
      portraitLine: "rgba(52,58,49,.25)",
      portraitSymbol: "rgba(52,58,49,.58)",
      portraitInset: "rgba(255,255,255,.4)",
      actionSurface: "#556b55",
      actionText: "#ffffff",
      footerSurface: "#354238",
      focusRing: "#66785f",
    },
  }),
  defineTheme({
    id: "burgundy-cream",
    name: "Burgundy Cream",
    description: "Kem thanh lịch với burgundy làm điểm nhấn sang và rõ nét.",
    swatches: ["#fff9f0", "#f3e8dc", "#cda9a2", "#7a2638", "#3d3031"],
    tokens: {
      canvas: "#fff9f0",
      paper: "#fffdf8",
      alternate: "#f3e8dc",
      eventSurface: "#ead9cf",
      ink: "#3d3031",
      muted: "#746062",
      accent: "#cda9a2",
      accentStrong: "#7a2638",
      botanical: "#8b8b72",
      inverseText: "#fff9f2",
      footerMuted: "#ead8d4",
      inputSurface: "#fffdf8",
      heroStart: "#fffdf7",
      heroMid: "#f6e8df",
      heroEnd: "#ead5ce",
      heroOverlay: "rgba(61,48,49,.08)",
      heroText: "#3d3031",
      groomPortraitStart: "#c9ae9d",
      groomPortraitEnd: "#f1dfd0",
      bridePortraitStart: "#d9b8b1",
      bridePortraitEnd: "#f9e8dc",
      borderSoft: "rgba(122,38,56,.25)",
      borderMedium: "rgba(122,38,56,.38)",
      borderStrong: "rgba(122,38,56,.52)",
      inputBorder: "rgba(122,38,56,.64)",
      heroOrnament: "rgba(139,139,114,.55)",
      portraitLine: "rgba(61,48,49,.25)",
      portraitSymbol: "rgba(61,48,49,.58)",
      portraitInset: "rgba(255,255,255,.4)",
      actionSurface: "#7a2638",
      actionText: "#fffaf5",
      footerSurface: "#561f2b",
      focusRing: "#8b3044",
    },
  }),
  defineTheme({
    id: "midnight-gold",
    name: "Midnight Gold",
    description: "Navy than tối, vàng ấm và chữ sáng cho không khí buổi tối.",
    swatches: ["#151820", "#222733", "#c2a15b", "#8f7441", "#f7f1e6"],
    tokens: {
      canvas: "#151820",
      paper: "#1d212b",
      alternate: "#222733",
      eventSurface: "#292a31",
      ink: "#f7f1e6",
      muted: "#c7c0b4",
      accent: "#c2a15b",
      accentStrong: "#d4b56d",
      botanical: "#8f9a82",
      inverseText: "#fff8e8",
      footerMuted: "#bcb5a8",
      inputSurface: "#252a35",
      heroStart: "#1c2029",
      heroMid: "#171b24",
      heroEnd: "#10131a",
      heroOverlay: "rgba(8,10,15,.38)",
      heroText: "#fff8e8",
      groomPortraitStart: "#4b4c46",
      groomPortraitEnd: "#2b3035",
      bridePortraitStart: "#51484a",
      bridePortraitEnd: "#2e3038",
      borderSoft: "rgba(194,161,91,.28)",
      borderMedium: "rgba(194,161,91,.4)",
      borderStrong: "rgba(194,161,91,.58)",
      inputBorder: "rgba(194,161,91,.7)",
      heroOrnament: "rgba(143,154,130,.6)",
      portraitLine: "rgba(247,241,230,.28)",
      portraitSymbol: "rgba(247,241,230,.62)",
      portraitInset: "rgba(255,255,255,.08)",
      actionSurface: "#c2a15b",
      actionText: "#161820",
      footerSurface: "#0f1218",
      focusRing: "#e0c27c",
    },
  }),
] as const satisfies readonly InvitationThemeDefinition[];

export const defaultInvitationThemeId: InvitationThemeId = "ivory-gold";

const invitationThemeIds = new Set<string>(invitationThemes.map((theme) => theme.id));

export function isInvitationThemeId(value: unknown): value is InvitationThemeId {
  return typeof value === "string" && invitationThemeIds.has(value);
}

export function getInvitationTheme(id: InvitationThemeId): InvitationThemeDefinition {
  return invitationThemes.find((theme) => theme.id === id) ?? invitationThemes[0];
}

export function themeCssVariables(theme: InvitationThemeDefinition): Record<string, string> {
  const t = theme.tokens;
  return {
    "--invitation-canvas": t.canvas,
    "--invitation-paper": t.paper,
    "--invitation-alternate": t.alternate,
    "--invitation-event-surface": t.eventSurface,
    "--invitation-ink": t.ink,
    "--invitation-muted": t.muted,
    "--invitation-accent": t.accent,
    "--invitation-accent-strong": t.accentStrong,
    "--invitation-botanical": t.botanical,
    "--invitation-inverse-text": t.inverseText,
    "--invitation-footer-muted": t.footerMuted,
    "--invitation-input-surface": t.inputSurface,
    "--invitation-hero-start": t.heroStart,
    "--invitation-hero-mid": t.heroMid,
    "--invitation-hero-end": t.heroEnd,
    "--invitation-hero-overlay": t.heroOverlay,
    "--invitation-hero-text": t.heroText,
    "--invitation-groom-start": t.groomPortraitStart,
    "--invitation-groom-end": t.groomPortraitEnd,
    "--invitation-bride-start": t.bridePortraitStart,
    "--invitation-bride-end": t.bridePortraitEnd,
    "--invitation-border-soft": t.borderSoft,
    "--invitation-border-medium": t.borderMedium,
    "--invitation-border-strong": t.borderStrong,
    "--invitation-input-border": t.inputBorder,
    "--invitation-hero-ornament": t.heroOrnament,
    "--invitation-portrait-line": t.portraitLine,
    "--invitation-portrait-symbol": t.portraitSymbol,
    "--invitation-portrait-inset": t.portraitInset,
    "--invitation-action-surface": t.actionSurface,
    "--invitation-action-text": t.actionText,
    "--invitation-footer-surface": t.footerSurface,
    "--invitation-focus-ring": t.focusRing,
    "--ivory": t.canvas,
    "--paper": t.paper,
    "--champagne": t.accent,
    "--champagne-deep": t.accentStrong,
    "--ink": t.ink,
    "--muted": t.muted,
    "--sage": t.botanical,
  };
}
