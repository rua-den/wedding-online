import { expect, test } from "playwright/test";
import { login } from "./auth";

async function readAppearance(page: import("playwright/test").Page) {
  const response = await page.request.get("/api/admin/appearance");
  expect(response.ok()).toBeTruthy();
  return (await response.json() as {
    appearance: { themeId: string; fontId: string };
  }).appearance;
}

async function expectVisibleButtonsRounded(page: import("playwright/test").Page) {
  const buttons = page.locator("button:visible");
  expect(await buttons.count()).toBeGreaterThan(0);
  const radii = await buttons.evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)));
  expect(radii.every((radius) => radius >= 20)).toBeTruthy();
}

test("admin saves a Vietnamese wedding font and public invitation applies it", async ({ page }) => {
  await login(page);
  const initial = await readAppearance(page);

  try {
    await page.goto("/admin/appearance");
    await page.getByRole("radio", { name: /Cormorant Garamond/ }).click();
    await expect(page.getByText("Chưa lưu thay đổi")).toBeVisible();
    await page.getByRole("button", { name: "Lưu giao diện" }).click();
    await expect(page.getByText("Đã lưu giao diện thiệp.")).toBeVisible();

    await page.goto("/");
    const scope = page.locator(".invitation-theme-scope");
    await expect(scope).toHaveAttribute("data-invitation-font", "cormorant-garamond");
    await expect(scope).toHaveAttribute("style", /--font-cormorant-garamond/);
    await expect(page.getByText(/Huy/).first()).toBeVisible();
  } finally {
    const restored = await page.request.put("/api/admin/appearance", {
      data: { themeId: initial.themeId, fontId: initial.fontId },
    });
    expect(restored.ok()).toBeTruthy();
  }
});

test("midnight theme keeps text readable when switching to a custom font", async ({ page }) => {
  await login(page);
  await page.goto("/admin/appearance");

  const adminScope = page.locator(".admin-theme-scope");
  const adminHeading = page.getByRole("heading", { name: "Giao diện thiệp" });

  await page.getByRole("radio", { name: /Classic Serif/ }).click();
  const classicAdminFont = await adminHeading.evaluate((element) => getComputedStyle(element).fontFamily);

  await page.getByRole("radio", { name: /Midnight Gold/ }).click();
  await page.getByRole("radio", { name: /Cormorant Garamond/ }).click();

  await expect(adminScope).toHaveAttribute("data-admin-theme", "midnight-gold");
  await expect(adminScope).toHaveAttribute("data-admin-font", "cormorant-garamond");
  await expect(adminHeading).toBeVisible();
  await expect.poll(() => adminScope.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(247, 241, 230)");
  await expect.poll(() => adminScope.evaluate((element) => getComputedStyle(element).colorScheme)).toContain("dark");
  await expect.poll(() => adminHeading.evaluate((element) => getComputedStyle(element).fontFamily)).not.toBe(classicAdminFont);

  await page.goto("/?previewTheme=midnight-gold&previewFont=cormorant-garamond");
  const publicScope = page.locator(".invitation-theme-scope");
  const heroTitle = page.locator("#invitation-title");
  const countdownTitle = page.locator("#countdown-title");

  await expect(publicScope).toHaveAttribute("data-invitation-theme", "midnight-gold");
  await expect(publicScope).toHaveAttribute("data-invitation-font", "cormorant-garamond");
  await expect(heroTitle).toBeVisible();
  await expect.poll(() => publicScope.evaluate((element) => getComputedStyle(element).color)).toBe("rgb(247, 241, 230)");
  await expect.poll(() => publicScope.evaluate((element) => getComputedStyle(element).colorScheme)).toContain("dark");
  await expect.poll(() => heroTitle.evaluate((element) => getComputedStyle(element).fontFamily)).not.toBe(classicAdminFont);

  await countdownTitle.scrollIntoViewIfNeeded();
  await expect(countdownTitle).toBeVisible();
  await expect.poll(() => page.locator(".countdown-section").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(247, 241, 230)");
});

test("admin follows the selected invitation theme and every system button is rounded", async ({ page }) => {
  await login(page);
  const initial = await readAppearance(page);

  try {
    await page.goto("/admin/appearance");
    const adminScope = page.locator(".admin-theme-scope");
    await expect(adminScope).toHaveAttribute("data-admin-theme", initial.themeId);

    await page.getByRole("radio", { name: /Midnight Gold/ }).click();
    await expect(adminScope).toHaveAttribute("data-admin-theme", "midnight-gold");
    await expect.poll(() => adminScope.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(21, 24, 32)");
    await expectVisibleButtonsRounded(page);

    await page.getByRole("button", { name: "Lưu giao diện" }).click();
    await expect(page.getByText("Đã lưu giao diện thiệp.")).toBeVisible();

    await page.goto("/admin");
    await expect(page.locator(".admin-theme-scope")).toHaveAttribute("data-admin-theme", "midnight-gold");
    await expectVisibleButtonsRounded(page);

    await page.goto("/");
    await expect(page.locator(".invitation-theme-scope")).toHaveAttribute("data-invitation-theme", "midnight-gold");
    await expectVisibleButtonsRounded(page);
  } finally {
    const restored = await page.request.put("/api/admin/appearance", {
      data: { themeId: initial.themeId, fontId: initial.fontId },
    });
    expect(restored.ok()).toBeTruthy();
  }
});
