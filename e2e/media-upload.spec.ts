import { expect, test } from "playwright/test";

import { login } from "./auth";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);

type MediaAssetSnapshot = {
  id: number;
  slot: string;
  src: string;
  active: boolean;
  sortOrder?: number;
  focusX?: number;
  focusY?: number;
  zoom?: number;
};

async function readMedia(page: import("playwright/test").Page): Promise<MediaAssetSnapshot[]> {
  const response = await page.request.get("/api/admin/media");
  expect(response.ok()).toBeTruthy();
  return (await response.json() as { assets: MediaAssetSnapshot[] }).assets;
}

test("admin media upload stays renderable on the public invitation", async ({ page }) => {
  await login(page);
  const originalAssets = await readMedia(page);
  const originalHero = originalAssets.find((asset) => asset.slot === "hero" && asset.active);
  await page.goto("/admin");

  const coverSlot = page.locator(".admin-media-slot").filter({ hasText: "Ảnh cover" });
  const input = coverSlot.locator('input[type="file"]');

  await input.setInputFiles({
    name: "e2e-cover.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(page.getByText(/Đã tải ảnh lên|Đã tự tối ưu ảnh/)).toBeVisible();

  const assets = await readMedia(page);
  const hero = assets.find((asset) => asset.slot === "hero" && asset.active);
  expect(hero).toBeTruthy();
  expect(hero!.id).not.toBe(originalHero?.id);

  try {
    const rawResponse = await page.request.get(hero!.src);
    expect(rawResponse.ok()).toBeTruthy();
    expect(rawResponse.headers()["content-type"]).toBe("image/png");

    await page.goto("/");
    const image = page.getByRole("img", { name: "e2e-cover" });
    await expect(image).toBeVisible();

    const renderedSrc = await image.getAttribute("src");
    expect(renderedSrc).toBeTruthy();
    expect(new URL(renderedSrc!, page.url()).pathname).toBe(hero!.src);

    const renderedResponse = await page.request.get(renderedSrc!);
    expect(renderedResponse.ok()).toBeTruthy();
    expect(renderedResponse.headers()["content-type"]).toMatch(/^image\//);
  } finally {
    const deleted = await page.request.delete("/api/admin/media", {
      data: { id: hero!.id },
    });
    expect(deleted.ok()).toBeTruthy();
    if (originalHero) {
      const restored = await page.request.patch("/api/admin/media", {
        data: { id: originalHero.id, active: true },
      });
      expect(restored.ok()).toBeTruthy();
    }
  }
});

test("existing media optimization replaces the file without changing media identity or crop", async ({ page }) => {
  await login(page);

  const createdResponse = await page.request.post("/api/admin/media", {
    multipart: {
      slot: "gallery",
      alt: "e2e-optimize-gallery",
      file: {
        name: "e2e-optimize-gallery.png",
        mimeType: "image/png",
        buffer: onePixelPng,
      },
    },
  });
  expect(createdResponse.ok()).toBeTruthy();
  const created = (await createdResponse.json() as { asset: MediaAssetSnapshot }).asset;

  try {
    const croppedResponse = await page.request.patch("/api/admin/media", {
      data: { id: created.id, focusX: 23, focusY: 71, zoom: 1.4 },
    });
    expect(croppedResponse.ok()).toBeTruthy();
    const before = (await croppedResponse.json() as { asset: MediaAssetSnapshot }).asset;

    const sourceResponse = await page.request.get(`/api/admin/media/optimize?id=${created.id}`);
    expect(sourceResponse.ok()).toBeTruthy();
    expect(sourceResponse.headers()["content-type"]).toBe("image/png");

    const replacementResponse = await page.request.post("/api/admin/media/optimize", {
      multipart: {
        id: String(created.id),
        file: {
          name: "e2e-optimized.webp",
          mimeType: "image/webp",
          buffer: Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA", "base64"),
        },
      },
    });
    expect(replacementResponse.ok()).toBeTruthy();
    const after = (await replacementResponse.json() as { asset: MediaAssetSnapshot }).asset;

    expect(after.id).toBe(before.id);
    expect(after.sortOrder).toBe(before.sortOrder);
    expect(after.focusX).toBe(23);
    expect(after.focusY).toBe(71);
    expect(after.zoom).toBe(1.4);
    expect(after.src).not.toBe(before.src);

    const publicResponse = await page.request.get(after.src);
    expect(publicResponse.ok()).toBeTruthy();
    expect(publicResponse.headers()["content-type"]).toBe("image/webp");
  } finally {
    const deleted = await page.request.delete("/api/admin/media", { data: { id: created.id } });
    expect(deleted.ok()).toBeTruthy();
  }
});
