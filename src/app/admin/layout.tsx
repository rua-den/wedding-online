import type { ReactNode } from "react";

import { AdminThemeScope } from "@/components/admin-theme-scope";
import { getAppearanceSettings } from "@/lib/appearance-store";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const appearance = getAppearanceSettings();
  return <AdminThemeScope themeId={appearance.themeId} fontId={appearance.fontId}>{children}</AdminThemeScope>;
}
