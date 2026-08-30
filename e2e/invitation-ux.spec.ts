import { mkdirSync } from "node:fs";

import { expect, test } from "playwright/test";

mkdirSync("visual-previews", { recursive: true });

for (const viewport of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  test(`public invitation scales sections to the ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const hero = page.locator("#thiep-cuoi");
    await expect(hero).toBeVisible();
    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(viewport.height - 2);
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 2);

    for (const selector of ["#ngay-chung-doi", ".couple-section", ".story-section", ".event-section", ".gallery-section"]) {
      const sectionBox = await page.locator(selector).boundingBox();
      expect(sectionBox, `${selector} should be measurable`).not.toBeNull();
      expect(sectionBox!.height, `${selector} should fill at least one viewport`).toBeGreaterThanOrEqual(viewport.height - 2);
    }

    const openButton = hero.locator(".open-invitation-button");
    const radius = await openButton.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));
    expect(radius).toBeGreaterThanOrEqual(20);

    if (viewport.name === "desktop") {
      await expect.poll(() => hero.locator("h1").evaluate((element) => getComputedStyle(element).flexDirection)).toBe("row");
    }

    await page.screenshot({ path: `visual-previews/home-${viewport.name}.png`, fullPage: false });

    await openButton.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const countdownSection = page.locator("#ngay-chung-doi");
    await expect(countdownSection).toBeInViewport();

    const countdownValues = countdownSection.locator(".countdown-part strong");
    await expect(countdownValues).toHaveCount(4);
    const values = await countdownValues.allTextContents();
    expect(values.join("")).not.toBe("00000000");
    expect(values.join(" ")).not.toContain("NaN");
    await page.screenshot({ path: `visual-previews/countdown-${viewport.name}.png`, fullPage: false });
  });
}

test("personal invitation opens from a full-screen guest cover into the wedding card", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/moi/demo");

  const cover = page.locator(".personal-cover-full");
  await expect(page.getByRole("heading", { name: "Khách mời thân yêu" })).toBeVisible();
  const box = await cover.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(842);

  await page.screenshot({ path: "visual-previews/personal-cover-mobile.png", fullPage: false });

  await cover.locator(".open-invitation-button").click();
  await expect(page.locator("#thiep-cuoi")).toBeInViewport();
  await page.screenshot({ path: "visual-previews/personal-open-mobile.png", fullPage: false });
});
