import { expect, test } from "playwright/test";

test("personalised invitation shows the guest and accepts an RSVP", async ({ page }) => {
  await page.goto("/moi/demo");
  await expect(page.getByRole("heading", { name: "Khách mời thân yêu" })).toBeVisible();
  await page.getByLabel("Sẽ tham dự").check();
  await page.getByLabel("Số người tham dự").selectOption("1");
  await page.getByLabel("Lời nhắn").fill("Hẹn gặp hai bạn!");
  await page.getByRole("button", { name: "Gửi xác nhận" }).click();
  await expect(page.getByText("Cảm ơn bạn đã xác nhận tham dự!")).toBeVisible();
});

test("an unknown invitation is shown as unavailable", async ({ page }) => {
  await page.goto("/moi/does-not-exist");
  await expect(page.getByRole("heading", { name: "Thiệp mời không khả dụng" })).toBeVisible();
});
