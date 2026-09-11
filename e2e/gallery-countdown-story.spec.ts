import { expect, test } from "playwright/test";
import { login } from "./auth";

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

test("gallery stylesheet provides larger thumbnails and a near-full-screen lightbox", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await page.evaluate(() => {
    const scope = document.querySelector(".invitation-theme-scope");
    if (!scope) throw new Error("Invitation theme scope is missing.");

    const grid = document.createElement("div");
    grid.className = "gallery-grid e2e-gallery-fixture";
    const item = document.createElement("button");
    item.type = "button";
    item.className = "gallery-item";
    item.textContent = "fixture";
    grid.append(item, document.createElement("button"), document.createElement("button"));
    for (const button of Array.from(grid.querySelectorAll("button"))) {
      button.className = "gallery-item";
      button.type = "button";
    }
    scope.append(grid);

    const overlay = document.createElement("div");
    overlay.className = "gallery-lightbox e2e-lightbox-fixture";
    Object.assign(overlay.style, {
      alignItems: "center",
      display: "flex",
      inset: "0",
      justifyContent: "center",
      position: "fixed",
    });
    const frame = document.createElement("div");
    frame.className = "gallery-lightbox-frame-shell";
    overlay.append(frame);
    scope.append(overlay);
  });

  const thumbBox = await page.locator(".e2e-gallery-fixture .gallery-item").first().boundingBox();
  expect(thumbBox).not.toBeNull();
  expect(thumbBox!.width).toBeGreaterThanOrEqual(250);
  expect(thumbBox!.height).toBeGreaterThanOrEqual(300);

  const frameBox = await page.locator(".e2e-lightbox-fixture .gallery-lightbox-frame-shell").boundingBox();
  expect(frameBox).not.toBeNull();
  expect(frameBox!.width).toBeGreaterThanOrEqual(1000);
  expect(frameBox!.height).toBeGreaterThanOrEqual(650);
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
