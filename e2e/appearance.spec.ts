import { expect, test } from "playwright/test";
import { login } from "./auth";

test("admin saves a Vietnamese wedding font and public invitation applies it", async ({ page }) => {
  await login(page);
  const initialResponse = await page.request.get("/api/admin/appearance");
  expect(initialResponse.ok()).toBeTruthy();
  const initial = (await initialResponse.json() as {
    appearance: { themeId: string; fontId: string };
  }).appearance;

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
