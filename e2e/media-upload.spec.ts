import { expect, test } from "playwright/test";

import { login } from "./auth";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);

test("admin media upload stays renderable on the public invitation", async ({ page }) => {
  await login(page);
  await page.goto("/admin");

  const coverSlot = page.locator(".admin-media-slot").filter({ hasText: "Ảnh cover" });
  const input = coverSlot.locator('input[type="file"]');

  await input.setInputFiles({
    name: "e2e-cover.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(page.getByText(/Đã tải ảnh lên|Đã tự tối ưu ảnh/)).toBeVisible();

  const mediaResponse = await page.request.get("/api/admin/media");
  expect(mediaResponse.ok()).toBeTruthy();
  const body = await mediaResponse.json() as {
    assets: Array<{ id: number; slot: string; src: string; active: boolean }>;
  };
  const hero = body.assets.find((asset) => asset.slot === "hero" && asset.active);
  expect(hero).toBeTruthy();

  try {
    const rawResponse = await page.request.get(hero!.src);
    expect(rawResponse.ok()).toBeTruthy();
    expect(rawResponse.headers()["content-type"]).toBe("image/png");

    await page.goto("/");
    const image = page.getByRole("img", { name: "e2e-cover" });
    await expect(image).toBeVisible();

    const renderedSrc = await image.getAttribute("src");
    expect(renderedSrc).toBeTruthy();
    expect(renderedSrc).toContain("/_next/image");

    const renderedResponse = await page.request.get(renderedSrc!);
    expect(renderedResponse.ok()).toBeTruthy();
    expect(renderedResponse.headers()["content-type"]).toMatch(/^image\//);
  } finally {
    const deleted = await page.request.delete("/api/admin/media", {
      data: { id: hero!.id },
    });
    expect(deleted.ok()).toBeTruthy();
  }
});
