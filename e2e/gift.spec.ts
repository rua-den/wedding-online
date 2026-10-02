import { mkdirSync } from "node:fs";
import { expect, test } from "playwright/test";
import { login } from "./auth";

const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("admin persists the original QR and guest wishes are readable", async ({ page }) => {
  const filename = "gift-qr-original.png";
  await login(page);
  await page.goto("/admin/edit");
  await page.getByRole("tab", { name: "Tiền mừng & lời chúc" }).click();
  await page.getByLabel("Tải mã QR").setInputFiles({ name: filename, mimeType: "image/png", buffer: onePixelPng });
  await expect(page.getByText("Đã tải mã QR. Bấm “Lưu nội dung” để áp dụng.")).toBeVisible();
  await page.getByRole("button", { name: "Lưu nội dung" }).click();
  await expect(page.getByText("Đã lưu nội dung thiệp.")).toBeVisible();

  await page.reload();
  await page.getByRole("tab", { name: "Tiền mừng & lời chúc" }).click();
  const adminQr = page.getByRole("img", { name: "Mã QR gửi tiền mừng" });
  await expect(adminQr).toBeVisible();
  const src = await adminQr.getAttribute("src");
  expect(src).toMatch(/^\/uploads\//);
  const uploaded = await page.request.get(src!);
  expect(await uploaded.body()).toEqual(onePixelPng);

  await page.goto("/moi/demo");
  const gift = page.locator("#gui-tien-mung");
  await expect(gift.getByRole("img", { name: "Mã QR gửi tiền mừng" })).toHaveAttribute("src", src!);
  await gift.getByLabel("Tên của bạn").fill("Khách E2E lời chúc");
  await gift.getByLabel("Lời chúc").fill("Chúc hai bạn trăm năm hạnh phúc!");
  await gift.getByRole("button", { name: "Gửi lời chúc" }).click();
  await expect(gift.getByText("Cảm ơn bạn đã gửi lời chúc!")).toBeVisible();

  await page.goto("/admin/wishes");
  await expect(page.getByText("Khách E2E lời chúc")).toBeVisible();
  await expect(page.getByText("Chúc hai bạn trăm năm hạnh phúc!")).toBeVisible();
});

test("guest gift section remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/moi/demo");
  const gift = page.locator("#gui-tien-mung");
  await expect(gift).toBeVisible();
  mkdirSync("visual-previews", { recursive: true });
  await gift.screenshot({ path: "visual-previews/gift-mobile.png" });
});

test("gift section follows the selected midnight palette", async ({ page }) => {
  await page.goto("/?previewTheme=midnight-gold");
  await expect(page.locator(".invitation-theme-scope")).toHaveAttribute("data-invitation-theme", "midnight-gold");
  const gift = page.locator("#gui-tien-mung");
  const palette = await gift.evaluate((element) => {
    const styles = getComputedStyle(element);
    const input = getComputedStyle(element.querySelector("input")!);
    const button = getComputedStyle(element.querySelector("button")!);
    const label = getComputedStyle(element.querySelector("label")!);
    return { section: styles.backgroundColor, input: input.backgroundColor, button: button.backgroundColor, text: styles.color, label: label.color };
  });
  expect(palette.section).toBe("rgb(34, 39, 51)");
  expect(palette.input).toBe("rgb(37, 42, 53)");
  expect(palette.button).toBe("rgb(194, 161, 91)");
  expect(palette.text).toBe("rgb(247, 241, 230)");
  expect(palette.label).toBe("rgb(199, 192, 180)");
});
