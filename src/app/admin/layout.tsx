import type { ReactNode } from "react";

import { AdminThemeScope } from "@/components/admin-theme-scope";
import { getAppearanceSettings } from "@/lib/appearance-store";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const appearance = getAppearanceSettings();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";
  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "local";
  const shortBuildSha = buildSha === "local" ? "local" : buildSha.slice(0, 7);

  return (
    <AdminThemeScope themeId={appearance.themeId} fontId={appearance.fontId}>
      {children}
      <footer
        className="fixed bottom-3 right-3 z-50 rounded-full border px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[0.08em] shadow-sm backdrop-blur"
        data-build-sha={buildSha}
        style={{
          background: "var(--paper)",
          borderColor: "var(--admin-border-medium)",
          color: "var(--muted)",
        }}
        title={`Build ${buildSha}`}
      >
        v{appVersion} · {shortBuildSha}
      </footer>
    </AdminThemeScope>
  );
}
