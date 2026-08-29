import { expect, test } from "playwright/test";
import { login } from "./auth";

test("admin login gates the dashboard and creates a usable invitation", async ({ page }) => {
  await login(page);
  await page.getByLabel("Tên khách mời").fill("Cô Lan");
  await page.getByRole("button", { name: "Tạo link mời" }).click();
  await expect(page.getByText("Đã tạo link mời cho Cô Lan")).toBeVisible();
  await expect(page.locator(".admin-created-link input")).toHaveValue(/\/moi\//);
});

test("admin dashboard remains usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.locator(".admin-table-wrap").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quản lý khách mời" })).toBeVisible();
});

test("admin can deactivate an invitation and filter/export RSVP rows", async ({ page }) => {
  await login(page);
  await page.getByLabel("Tên khách mời").fill("Khách thử nghiệm");
  await page.getByRole("button", { name: "Tạo link mời" }).click();
  await expect(page.getByText("Đã tạo link mời cho Khách thử nghiệm")).toBeVisible();

  const createdRow = page.locator("tr", { hasText: "Khách thử nghiệm" });
  await createdRow.getByRole("button", { name: "Tắt link" }).click();
  await expect(createdRow.getByRole("button", { name: "Bật link" })).toBeVisible();

  await page.getByRole("combobox", { name: "Trạng thái RSVP" }).selectOption("pending");
  await expect(page.getByText("Chưa phản hồi").last()).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Xuất CSV" }).click();
  await expect((await download).suggestedFilename()).toBe("rsvp.csv");
});
