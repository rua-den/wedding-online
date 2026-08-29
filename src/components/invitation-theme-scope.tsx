import type { CSSProperties, ReactNode } from "react";

import {
  defaultInvitationThemeId,
  getInvitationTheme,
  themeCssVariables,
  type InvitationThemeId,
} from "@/config/invitation-themes";

export function InvitationThemeScope({
  children,
  themeId = defaultInvitationThemeId,
}: {
  children: ReactNode;
  themeId?: InvitationThemeId;
}) {
  const theme = getInvitationTheme(themeId);
  return (
    <div
      className="invitation-theme-scope"
      data-invitation-theme={theme.id}
      style={themeCssVariables(theme) as CSSProperties}
    >
      {children}
    </div>
  );
}
