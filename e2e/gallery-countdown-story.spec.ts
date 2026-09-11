import { expect, test } from "playwright/test";
import { login } from "./auth";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function deleteMediaByAlt(page: import("playwright/test").Page, alt: string) {
  const response = await page.request.get("/api/admin/media");
  if (!response.ok()) return;
  const body = await response.json() as { assets?: Array<{ id: number; alt: string }> };
  const asset = body.assets?.find((candidate) => candidate.alt === alt);
  if (asset) await page.request.delete("/api/admin/media", { data: { id: asset.id } });
}

test("countdown presents a spinning Huy & Nhi vinyl before the timer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const section = page.locator("#ngay-chung-doi");
  const vinyl = section.locator(".vinyl-record");
  const countdown = section.locator(".countdown");
  await expect(vinyl).toBeVisible();
  await expect(vinyl).toContainText("Huy");
  await expect(vinyl).toContainText("Nhi");
  await expect(countdown).toBeVisible();

  const vinylBox = await vinyl.boundingBox();
  const countdownBox = await countdown.boundingBox();
  expect(vinylBox).not.toBeNull();
  expect(countdownBox).not.toBeNull();
  expect(vinylBox!.width).toBeGreaterThanOrEqual(250);
  expect(vinylBox!.y).toBeLessThan(countdownBox!.y);
  await expect.poll(() => vinyl.evaluate((element) => getComputedStyle(element).animationName)).toContain("wedding-vinyl-spin");
});

test("gallery uses larger thumbnails and a near-full-screen lightbox", async ({ page }) => {
  const alt = "feature-gallery-large";
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    await login(page);
    const input = page.locator('.admin-media-gallery-head input[type="file"]');
    await input.setInputFiles({ name: `${alt}.png`, mimeType: "image/png", buffer: onePixelPng });
    await expect(page.locator(".admin-media-thumb").filter({ hasText: "Những khoảnh khắc" }).last()).toBeVisible();

    await page.goto("/");
    const galleryItem = page.getByRole("button", { name: alt });
    await expect(galleryItem).toBeVisible();
    const thumbBox = await galleryItem.boundingBox();
    expect(thumbBox).not.toBeNull();
    expect(thumbBox!.width).toBeGreaterThanOrEqual(250);
    expect(thumbBox!.height).toBeGreaterThanOrEqual(300);

    await galleryItem.click();
    const lightbox = page.getByRole("dialog", { name: "Xem ảnh lớn" });
    const frame = lightbox.locator(".gallery-lightbox-frame-shell");
    await expect(frame).toBeVisible();
    const frameBox = await frame.boundingBox();
    expect(frameBox).not.toBeNull();
    expect(frameBox!.width).toBeGreaterThanOrEqual(1000);
    expect(frameBox!.height).toBeGreaterThanOrEqual(650);
  } finally {
    await deleteMediaByAlt(page, alt);
  }
});

test("story editor lets each milestone choose left center or right", async ({ page }) => {
  await login(page);
  await page.goto("/admin/edit");
  await page.getByRole("tab", { name: "Chuyện tình" }).click();

  const firstMilestone = page.locator("article").filter({ hasText: "Mốc 1" }).first();
  const position = firstMilestone.getByLabel("Vị trí ảnh");
  await expect(position).toHaveValue("center");
  await position.selectOption("left");
  await expect(position).toHaveValue("left");
  await position.selectOption("right");
  await expect(position).toHaveValue("right");
  await position.selectOption("center");
  await expect(position).toHaveValue("center");
});
