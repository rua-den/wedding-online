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
