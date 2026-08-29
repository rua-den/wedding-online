import { expect, test, type Page } from "playwright/test";
import { login } from "./auth";
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function mediaSlot(page: Page, label: string) {
  return page.locator(".admin-media-slot").filter({ hasText: label }).first();
}

type MediaAssetSnapshot = { id: number; slot: string; active: boolean; alt: string };

function mediaAlt(slot: "hero" | "gallery", suffix: string) {
  return `task-11-${slot}-${suffix}`;
}

async function uploadMedia(page: Page, slot: "hero" | "gallery", suffix: string) {
  const filename = `${mediaAlt(slot, suffix)}.png`;
  const input = slot === "hero"
    ? mediaSlot(page, "Ảnh cover").locator('input[type="file"]')
    : page.locator('.admin-media-gallery-head input[type="file"]');
  await input.setInputFiles({ name: filename, mimeType: "image/png", buffer: onePixelPng });

  if (slot === "hero") {
    await expect(mediaSlot(page, "Ảnh cover").getByRole("button", { name: "Căn khung" })).toBeVisible();
  } else {
    await expect(page.locator(".admin-media-thumb").filter({ hasText: "Những khoảnh khắc" }).last()).toBeVisible();
  }
}

async function deleteMediaByAlt(page: Page, alt: string) {
  const response = await page.request.get("/api/admin/media");
  if (!response.ok()) return;
  const body = await response.json() as { assets?: Array<{ id: number; alt: string }> };
  const asset = body.assets?.find((candidate) => candidate.alt === alt);
  if (asset) await page.request.delete("/api/admin/media", { data: { id: asset.id } });
}

async function activeMedia(page: Page, slot: string) {
  const response = await page.request.get("/api/admin/media");
  if (!response.ok()) return undefined;
  const body = await response.json() as { assets?: MediaAssetSnapshot[] };
  return body.assets?.find((asset) => asset.slot === slot && asset.active);
}

async function cleanupUploadedMedia(page: Page, alt: string, displaced?: MediaAssetSnapshot) {
  await deleteMediaByAlt(page, alt);
  if (displaced?.active) {
    const response = await page.request.patch("/api/admin/media", {
      data: { id: displaced.id, active: true },
    });
    if (!response.ok()) {
      throw new Error(`Could not restore displaced ${displaced.slot} asset ${displaced.id}.`);
    }
  }
}

async function setCropValue(page: Page, label: string, value: number) {
  const input = page.getByLabel(label);
  await input.press("Home");
  const step = label === "Thu phóng" ? 0.1 : 1;
  const minimum = label === "Thu phóng" ? 1 : 0;
  const steps = Math.round((value - minimum) / step);
  for (let index = 0; index < steps; index += 1) await input.press("ArrowRight");
  await expect(input).toHaveValue(String(value));
}

async function expectImageBytesLoad(page: Page, image: ReturnType<Page["locator"]>) {
  const src = await image.getAttribute("src");
  expect(src).toMatch(/^\/uploads\//);
  const response = await page.request.get(src!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^image\//);
  expect((await response.body()).length).toBeGreaterThan(0);
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}

async function saveHeroCrop(page: Page, focusX: number, focusY: number, zoom: number) {
  const hero = mediaSlot(page, "Ảnh cover");
  await hero.getByRole("button", { name: "Căn khung" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await setCropValue(page, "Ngang", focusX);
  await setCropValue(page, "Dọc", focusY);
  await setCropValue(page, "Thu phóng", zoom);
  await page.getByRole("button", { name: "Lưu căn chỉnh" }).click();
  await expect(page.getByText("Đã lưu căn chỉnh.")).toBeVisible();
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844, frame: ".media-frame-hero-mobile" },
  { name: "desktop", width: 1280, height: 800, frame: ".media-frame-hero-desktop" },
]) {
  test(`persists crop metadata with matching public ${viewport.name} rendering`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    let previousHero: MediaAssetSnapshot | undefined;
    const alt = mediaAlt("hero", viewport.name);

    try {
      await login(page);
      previousHero = await activeMedia(page, "hero");
      await uploadMedia(page, "hero", viewport.name);
      await saveHeroCrop(page, 24, 72, 1.6);
      const adminImage = mediaSlot(page, "Ảnh cover").locator(`${viewport.frame} img`);
      const adminObjectPosition = await adminImage.evaluate((image) => getComputedStyle(image).objectPosition);
      expect(adminObjectPosition).toBe("24% 72%");

      await page.goto("/");
      const publicImage = page.locator(".hero-media img");
      await expect(publicImage).toBeVisible();
      await expectImageBytesLoad(page, publicImage);
      const publicObjectPosition = await publicImage.evaluate((image) => getComputedStyle(image).objectPosition);
      expect(publicObjectPosition).toBe(adminObjectPosition);
    } finally {
      await cleanupUploadedMedia(page, alt, previousHero);
    }
  });
}

test("full invitation preview defaults to mobile, toggles desktop, and refreshes after crop save", async ({ page }) => {
  let previousHero: MediaAssetSnapshot | undefined;
  const alt = mediaAlt("hero", "preview");

  try {
    await login(page);
    previousHero = await activeMedia(page, "hero");
    await uploadMedia(page, "hero", "preview");
    await page.getByRole("button", { name: "Xem trước toàn bộ thiệp" }).click();
    const dialog = page.getByRole("dialog", { name: "Xem trước toàn bộ thiệp" });
    const iframe = dialog.getByTitle("Xem trước toàn bộ thiệp");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("invitation-preview-device")).toHaveClass(/is-mobile/);
    await expect(iframe).toHaveAttribute("src", /\/\?preview=\d+/);
    await expect(dialog.frameLocator('iframe[title="Xem trước toàn bộ thiệp"]').locator("#invitation-title")).toBeVisible();

    const initialSource = await iframe.getAttribute("src");
    const initialRefresh = Number(new URL(initialSource!, "http://127.0.0.1").searchParams.get("preview"));
    await dialog.getByRole("button", { name: "Desktop" }).click();
    await expect(page.getByTestId("invitation-preview-device")).toHaveClass(/is-desktop/);
    await expect(iframe).toHaveAttribute("width", "1280");
    await expect(iframe).toHaveAttribute("height", "800");

    await dialog.getByRole("button", { name: "Đóng" }).click();
    await expect(page.getByRole("dialog", { name: "Xem trước toàn bộ thiệp" })).not.toBeVisible();
    await saveHeroCrop(page, 31, 67, 1.4);

    await page.getByRole("button", { name: "Xem trước toàn bộ thiệp" }).click();
    const refreshedIframe = page.getByTitle("Xem trước toàn bộ thiệp");
    const refreshedSource = await refreshedIframe.getAttribute("src");
    const refreshedRefresh = Number(new URL(refreshedSource!, "http://127.0.0.1").searchParams.get("preview"));
    expect(refreshedRefresh).toBe(initialRefresh + 1);
  } finally {
    await cleanupUploadedMedia(page, alt, previousHero);
  }
});

test("temporary hero replacement cleanup restores the displaced active asset", async ({ page }) => {
  let previousHero: MediaAssetSnapshot | undefined;
  let baselineHero: MediaAssetSnapshot | undefined;
  let replacementCleaned = false;
  const baselineAlt = mediaAlt("hero", "cleanup-baseline");
  const replacementAlt = mediaAlt("hero", "cleanup-replacement");

  try {
    await login(page);
    previousHero = await activeMedia(page, "hero");
    await uploadMedia(page, "hero", "cleanup-baseline");
    baselineHero = await activeMedia(page, "hero");
    expect(baselineHero).toBeDefined();
    await uploadMedia(page, "hero", "cleanup-replacement");
    await cleanupUploadedMedia(page, replacementAlt, baselineHero);
    replacementCleaned = true;
    const restoredHero = await activeMedia(page, "hero");
    expect(restoredHero?.id).toBe(baselineHero?.id);
  } finally {
    if (!replacementCleaned) await cleanupUploadedMedia(page, replacementAlt, baselineHero);
    await cleanupUploadedMedia(page, baselineAlt, previousHero);
  }
});

test("public gallery renders uploaded media and opens its lightbox", async ({ page }) => {
  const alt = mediaAlt("gallery", "gallery");

  try {
    await login(page);
    await uploadMedia(page, "gallery", "gallery");
    await page.goto("/");
    const galleryItem = page.getByRole("button", { name: alt });
    await expect(galleryItem).toBeVisible();
    await galleryItem.click();
    const lightbox = page.getByRole("dialog", { name: "Xem ảnh lớn" });
    await expect(lightbox).toBeVisible();
    await expect(lightbox.getByRole("img", { name: alt })).toBeVisible();
    await lightbox.getByRole("button", { name: "Đóng ảnh" }).click();
    await expect(lightbox).not.toBeVisible();
  } finally {
    await deleteMediaByAlt(page, alt);
  }
});

test("personalised preview keeps the validated guest name visible", async ({ page }) => {
  await page.goto("/moi/demo");
  await expect(page.getByRole("heading", { name: "Khách mời thân yêu" })).toBeVisible();
});
