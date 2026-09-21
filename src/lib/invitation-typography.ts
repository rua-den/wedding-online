export const DEFAULT_TEXT_SCALE = 100;
export const MIN_TEXT_SCALE = 60;
export const MAX_TEXT_SCALE = 200;
export const TEXT_SCALE_STEP = 5;
export const INVITATION_DISPLAY_FONT_FAMILY = 'var(--invitation-font-display, Georgia, "Times New Roman", serif)';

export type TextScaleMap = Record<string, number>;

export function normalizeTextScale(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_TEXT_SCALE;
  return Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, numeric));
}

export function textScale(scales: TextScaleMap | undefined, key: string): number {
  return normalizeTextScale(scales?.[key]);
}

export function scaledTextStyle(scale: unknown): { fontFamily: string; fontSize: string } {
  return {
    fontFamily: INVITATION_DISPLAY_FONT_FAMILY,
    fontSize: `${normalizeTextScale(scale) / 100}em`,
  };
}
