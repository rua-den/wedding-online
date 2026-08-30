import {
  defaultInvitationFontId,
  isInvitationFontId,
  type InvitationFontId,
} from "@/config/invitation-fonts";
import {
  defaultInvitationThemeId,
  isInvitationThemeId,
  type InvitationThemeId,
} from "@/config/invitation-themes";
import { getDatabase, initializeDatabase } from "./sqlite";

export type AppearanceSettings = {
  themeId: InvitationThemeId;
  fontId: InvitationFontId;
  invalidStoredThemeId?: string;
  invalidStoredFontId?: string;
};

function database() {
  initializeDatabase();
  return getDatabase();
}

export function getAppearanceSettings(): AppearanceSettings {
  const row = database()
    .prepare("SELECT theme_id, font_id FROM appearance_settings WHERE id = 1")
    .get() as { theme_id?: string; font_id?: string } | undefined;
  const storedThemeId = row?.theme_id?.trim();
  const storedFontId = row?.font_id?.trim();

  const appearance: AppearanceSettings = {
    themeId: storedThemeId && isInvitationThemeId(storedThemeId) ? storedThemeId : defaultInvitationThemeId,
    fontId: storedFontId && isInvitationFontId(storedFontId) ? storedFontId : defaultInvitationFontId,
  };

  if (storedThemeId && !isInvitationThemeId(storedThemeId)) appearance.invalidStoredThemeId = storedThemeId;
  if (storedFontId && !isInvitationFontId(storedFontId)) appearance.invalidStoredFontId = storedFontId;
  return appearance;
}

export function resolveAppearanceSettings(input: {
  previewTheme?: unknown;
  previewFont?: unknown;
} = {}): AppearanceSettings {
  const persisted = getAppearanceSettings();
  return {
    themeId: isInvitationThemeId(input.previewTheme) ? input.previewTheme : persisted.themeId,
    fontId: isInvitationFontId(input.previewFont) ? input.previewFont : persisted.fontId,
  };
}

export function resolveAppearanceThemeId(previewTheme: unknown): InvitationThemeId {
  return resolveAppearanceSettings({ previewTheme }).themeId;
}

export function updateAppearanceSettings(input: {
  themeId: InvitationThemeId;
  fontId: InvitationFontId;
}): AppearanceSettings {
  if (!isInvitationThemeId(input.themeId)) throw new Error("Theme thiệp không hợp lệ.");
  if (!isInvitationFontId(input.fontId)) throw new Error("Font thiệp không hợp lệ.");

  database()
    .prepare(`
      INSERT INTO appearance_settings (id, theme_id, font_id, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        theme_id = excluded.theme_id,
        font_id = excluded.font_id,
        updated_at = excluded.updated_at
    `)
    .run(input.themeId, input.fontId, new Date().toISOString());

  return { themeId: input.themeId, fontId: input.fontId };
}
