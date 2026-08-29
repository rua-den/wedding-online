export const MAX_MEDIA_ALT_LENGTH = 160;

export function validateMediaAlt(value: string): string {
  const alt = value.trim();
  if (alt.length > MAX_MEDIA_ALT_LENGTH) throw new Error("Mô tả ảnh quá dài.");
  return alt;
}
