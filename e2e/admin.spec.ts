import { expect, test } from "playwright/test";
import { login } from "./auth";

test("admin login gates the dashboard and creates a usable invitation", async ({ page }) => {
  await login(page);
  await page.getByLabel("Tên khách mời").fill("Cô Lan");
  await page.getByLabel("Ngày mời").selectOption("oct11");
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
  await page.getByLabel("Ngày mời").selectOption("oct31");
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

test("both-date invitation renders and records one RSVP per configured event", async ({ page }) => {
  await login(page);
  await page.goto("/admin/events");

  async function configureEvent(label: "11/10/2026" | "31/10/2026", values: {
    title: string;
    dateTime: string;
    deadline: string;
    venue: string;
    address: string;
    mapsUrl: string;
  }) {
    const panel = page.locator("section.admin-panel").filter({ has: page.getByRole("heading", { name: label }) });
    await panel.getByLabel("Eyebrow").fill("Trân trọng kính mời");
    await panel.getByLabel("Tiêu đề").fill(values.title);
    await panel.getByLabel("Ngày giờ").fill(values.dateTime.slice(0, 16));
    await panel.getByLabel("Hạn RSVP").fill(values.deadline.slice(0, 16));
    await panel.getByLabel("Tên địa điểm").fill(values.venue);
    await panel.getByLabel("Địa chỉ").fill(values.address);
    await panel.getByLabel("Google Maps URL").fill(values.mapsUrl);
    await panel.getByRole("button", { name: `Lưu ${label}` }).click();
    await expect(page.getByRole("status")).toContainText(`Đã lưu sự kiện ${label.startsWith("11") ? "11/10" : "31/10"}.`);
  }

  await configureEvent("11/10/2026", {
    title: "Lễ ngày 11",
    dateTime: "2026-10-11T11:00:00+07:00",
    deadline: "2026-10-10T23:00:00+07:00",
    venue: "Sảnh ngày 11",
    address: "Địa chỉ ngày 11",
    mapsUrl: "https://maps.google.com/?q=sanh+11",
  });
  await configureEvent("31/10/2026", {
    title: "Lễ ngày 31",
    dateTime: "2026-10-31T18:30:00+07:00",
    deadline: "2026-10-30T23:00:00+07:00",
    venue: "Sảnh ngày 31",
    address: "Địa chỉ ngày 31",
    mapsUrl: "https://maps.google.com/?q=sanh+31",
  });

  await page.goto("/admin");
  await page.getByLabel("Tên khách mời").fill("Khách E2E hai ngày");
  await page.getByLabel("Ngày mời").selectOption("both");
  await page.getByRole("button", { name: "Tạo link mời" }).click();
  const invitationUrl = await page.locator(".admin-created-link input").inputValue();
  expect(invitationUrl).toContain("/moi/");

  await page.goto(invitationUrl);
  await expect(page.getByRole("heading", { name: "Khách E2E hai ngày" })).toBeVisible();
  const eventCards = page.locator(".event-card");
  const rsvpCards = page.locator(".rsvp-card");
  await expect(eventCards.getByRole("heading", { name: "Lễ ngày 11" })).toBeVisible();
  await expect(eventCards.getByRole("heading", { name: "Lễ ngày 31" })).toBeVisible();
  await expect(rsvpCards.getByRole("heading", { name: "Lễ ngày 11" })).toBeVisible();
  await expect(rsvpCards.getByRole("heading", { name: "Lễ ngày 31" })).toBeVisible();
  await expect(page.getByText("11/10/2026", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("31/10/2026", { exact: true }).first()).toBeVisible();

  for (const scope of ["oct11", "oct31"] as const) {
    const form = page.locator(`form[data-event-scope="${scope}"]`);
    await form.getByLabel("Sẽ tham dự").check();
    await form.getByLabel("Số người tham dự").selectOption("1");
    await form.getByRole("button", { name: "Gửi xác nhận" }).click();
    await expect(form.getByText("Cảm ơn bạn đã xác nhận tham dự!")).toBeVisible();
  }

  await page.goto("/admin");
  await expect(page.getByText("Khách E2E hai ngày · 11/10")).toBeVisible();
  await expect(page.getByText("Khách E2E hai ngày · 31/10")).toBeVisible();
});
