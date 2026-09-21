// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminThemeScope, previewAdminAppearance } from "./admin-theme-scope";

afterEach(() => cleanup());

describe("AdminThemeScope", () => {
  it("maps persisted invitation appearance onto admin tokens", () => {
    render(<AdminThemeScope themeId="midnight-gold" fontId="lora"><button>Save</button></AdminThemeScope>);
    const scope = screen.getByText("Save").parentElement!;
    expect(scope).toHaveAttribute("data-admin-theme", "midnight-gold");
    expect(scope).toHaveAttribute("data-admin-font", "lora");
    expect(scope.style.getPropertyValue("--ivory")).toBe("#151820");
    expect(scope.style.getPropertyValue("--paper")).toBe("#1d212b");
    expect(scope.style.getPropertyValue("--ink")).toBe("#f7f1e6");
    expect(scope.style.getPropertyValue("--admin-action-surface")).toBe("#c2a15b");
    expect(scope.style.colorScheme).toBe("dark");
    expect(scope.style.fontFamily).toContain("--font-lora");
  });

  it("live previews a newly selected admin theme and font", async () => {
    render(<AdminThemeScope themeId="ivory-gold" fontId="classic-serif"><span>Admin</span></AdminThemeScope>);
    const scope = screen.getByText("Admin").parentElement!;

    previewAdminAppearance({ themeId: "midnight-gold", fontId: "playfair-display" });

    await waitFor(() => expect(scope).toHaveAttribute("data-admin-theme", "midnight-gold"));
    expect(scope).toHaveAttribute("data-admin-font", "playfair-display");
    expect(scope.style.getPropertyValue("--ivory")).toBe("#151820");
    expect(scope.style.getPropertyValue("--champagne-deep")).toBe("#d4b56d");
    expect(scope.style.getPropertyValue("--ink")).toBe("#f7f1e6");
    expect(scope.style.colorScheme).toBe("dark");
    expect(scope.style.fontFamily).toContain("--font-playfair-display");
  });
});
