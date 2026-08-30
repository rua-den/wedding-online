import type { CSSProperties, ReactNode } from "react";

import {
  defaultInvitationFontId,
  getInvitationFont,
  type InvitationFontId,
} from "@/config/invitation-fonts";
import {
  defaultInvitationThemeId,
  getInvitationTheme,
  themeCssVariables,
  type InvitationThemeId,
} from "@/config/invitation-themes";

export function InvitationThemeScope({
  children,
  themeId = defaultInvitationThemeId,
  fontId = defaultInvitationFontId,
}: {
  children: ReactNode;
  themeId?: InvitationThemeId;
  fontId?: InvitationFontId;
}) {
  const theme = getInvitationTheme(themeId);
  const font = getInvitationFont(fontId);
  return (
    <div
      className="invitation-theme-scope"
      data-invitation-theme={theme.id}
      data-invitation-font={font.id}
      style={{
        ...themeCssVariables(theme),
        "--invitation-font-display": font.cssFamily,
      } as CSSProperties}
    >
      {children}
    </div>
  );
}
