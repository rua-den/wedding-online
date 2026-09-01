// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
    expect(scope.style.getPropertyValue("--admin-action-surface")).toBe("#c2a15b");
  });

  it("live previews a newly selected admin theme and font", () => {
    render(<AdminThemeScope themeId="ivory-gold" fontId="classic-serif"><span>Admin</span></AdminThemeScope>);
    const scope = screen.getByText("Admin").parentElement!;

    previewAdminAppearance({ themeId: "sage-garden", fontId: "playfair-display" });

    expect(scope).toHaveAttribute("data-admin-theme", "sage-garden");
    expect(scope).toHaveAttribute("data-admin-font", "playfair-display");
    expect(scope.style.getPropertyValue("--ivory")).toBe("#fbf8ef");
    expect(scope.style.getPropertyValue("--champagne-deep")).toBe("#66785f");
  });
});
