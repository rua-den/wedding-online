"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

import { getInvitationFont, type InvitationFontId } from "@/config/invitation-fonts";
import { getInvitationTheme, type InvitationThemeId } from "@/config/invitation-themes";

export const ADMIN_APPEARANCE_PREVIEW_EVENT = "admin-appearance-preview";

type AdminAppearance = {
  themeId: InvitationThemeId;
  fontId: InvitationFontId;
};

type AdminAppearancePreviewEvent = CustomEvent<AdminAppearance>;

export function previewAdminAppearance(appearance: AdminAppearance) {
  window.dispatchEvent(new CustomEvent<AdminAppearance>(ADMIN_APPEARANCE_PREVIEW_EVENT, { detail: appearance }));
}

function adminThemeStyle({ themeId, fontId }: AdminAppearance): CSSProperties {
  const theme = getInvitationTheme(themeId);
  const font = getInvitationFont(fontId);
  const tokens = theme.tokens;

  return {
    "--ivory": tokens.canvas,
    "--paper": tokens.paper,
    "--champagne": tokens.accent,
    "--champagne-deep": tokens.accentStrong,
    "--ink": tokens.ink,
    "--muted": tokens.muted,
    "--sage": tokens.botanical,
    "--admin-alternate": tokens.alternate,
    "--admin-event-surface": tokens.eventSurface,
    "--admin-input-surface": tokens.inputSurface,
    "--admin-border-soft": tokens.borderSoft,
    "--admin-border-medium": tokens.borderMedium,
    "--admin-border-strong": tokens.borderStrong,
    "--admin-input-border": tokens.inputBorder,
    "--admin-action-surface": tokens.actionSurface,
    "--admin-action-text": tokens.actionText,
    "--admin-focus-ring": tokens.focusRing,
    "--admin-success-text": tokens.successText,
    "--admin-error-text": tokens.errorText,
    "--admin-font-display": font.cssFamily,
    background: tokens.canvas,
    color: tokens.ink,
    fontFamily: font.cssFamily,
  } as CSSProperties;
}

export function AdminThemeScope({
  children,
  themeId,
  fontId,
}: {
  children: ReactNode;
  themeId: InvitationThemeId;
  fontId: InvitationFontId;
}) {
  const [appearance, setAppearance] = useState<AdminAppearance>({ themeId, fontId });

  useEffect(() => {
    const onPreview = (event: Event) => {
      const detail = (event as AdminAppearancePreviewEvent).detail;
      if (detail) setAppearance(detail);
    };
    window.addEventListener(ADMIN_APPEARANCE_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(ADMIN_APPEARANCE_PREVIEW_EVENT, onPreview);
  }, []);

  useEffect(() => {
    setAppearance({ themeId, fontId });
  }, [fontId, themeId]);

  return <div
    className="admin-theme-scope"
    data-admin-theme={appearance.themeId}
    data-admin-font={appearance.fontId}
    style={adminThemeStyle(appearance)}
  >
    {children}
  </div>;
}
