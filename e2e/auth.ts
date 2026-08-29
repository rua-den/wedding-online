import { expect, type Page } from "playwright/test";

const password = process.env.E2E_ADMIN_PASSWORD ?? "huy-nhi-e2e-password";

export async function login(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
