import {
  defaultInvitationThemeId,
  isInvitationThemeId,
  type InvitationThemeId,
} from "@/config/invitation-themes";
import { getDatabase, initializeDatabase } from "./sqlite";

export type AppearanceSettings = {
  themeId: InvitationThemeId;
  invalidStoredThemeId?: string;
};

function database() {
  initializeDatabase();
  return getDatabase();
}

export function getAppearanceSettings(): AppearanceSettings {
  const row = database()
    .prepare("SELECT theme_id FROM appearance_settings WHERE id = 1")
    .get() as { theme_id?: string } | undefined;
  const storedThemeId = row?.theme_id?.trim();

  if (!storedThemeId) return { themeId: defaultInvitationThemeId };
  if (isInvitationThemeId(storedThemeId)) return { themeId: storedThemeId };
  return { themeId: defaultInvitationThemeId, invalidStoredThemeId: storedThemeId };
}

export function resolveAppearanceThemeId(previewTheme: unknown): InvitationThemeId {
  if (isInvitationThemeId(previewTheme)) return previewTheme;
  return getAppearanceSettings().themeId;
}

export function updateAppearanceSettings(input: { themeId: InvitationThemeId }): AppearanceSettings {
  if (!isInvitationThemeId(input.themeId)) throw new Error("Theme thiệp không hợp lệ.");

  database()
    .prepare(`
      INSERT INTO appearance_settings (id, theme_id, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        theme_id = excluded.theme_id,
        updated_at = excluded.updated_at
    `)
    .run(input.themeId, new Date().toISOString());

  return { themeId: input.themeId };
}
