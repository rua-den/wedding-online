# Media, Gallery & Invitation Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-managed wedding images, venue media, public gallery rendering, guest-named invitation previews, non-destructive crop controls, and an accurate mobile/desktop invitation preview to the Huy & Nhi site.

**Architecture:** Keep the existing Next.js App Router and SQLite repository. Store uploaded files under `public/uploads/`, store validated media and crop metadata in SQLite, and render every public/admin image through one shared frame component. Reuse the existing admin session and invitation code APIs; preview the persisted full invitation through a responsive same-origin iframe.

**Tech Stack:** Next.js 16 App Router, TypeScript, React, SQLite (`better-sqlite3` or Node `node:sqlite` fallback), Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-media-gallery-design.md`

## Global Constraints

- Keep `/`, `/moi/[code]`, and existing RSVP behavior backward compatible.
- Store only generated relative upload paths; never accept arbitrary filesystem paths from a browser.
- Enforce image MIME and 12 MiB limits server-side.
- Do not expose guest lists or admin media mutation APIs without the existing admin session.
- Preserve text fallbacks in `src/config/wedding.ts` when SQLite media/settings are empty.
- Preserve original upload bytes; crop is metadata-only with `focusX/focusY` in `0..100` and `zoom` in `1..3`.
- Admin crop previews and public slots must use the same `MediaFrame` renderer and style calculation.

---

### Task 1: Add the media schema and repository

**Files:**
- Modify: `src/lib/sqlite.ts`
- Create: `src/lib/media-store.ts`
- Create: `src/lib/media-store.test.ts`

**Interfaces:**
- Produces `MediaSlot`, `MediaAsset`, `listActiveMedia()`, `listAdminMedia()`, `createMediaAsset()`, `updateMediaAsset()`, `deleteMediaAsset()`, and `reorderMediaAssets()`.

- [ ] **Step 1: Write failing tests** for slot validation, singleton-slot selection, gallery ordering, and deleting a missing asset.
- [ ] **Step 2: Run `npm test -- src/lib/media-store.test.ts --run` and verify the new tests fail because the repository/schema is absent.
- [ ] **Step 3: Add the `media_assets` schema and repository mapping with parameterized SQL and an atomic reorder transaction.
- [ ] **Step 4: Run `npm test -- src/lib/media-store.test.ts --run` and verify they pass.
- [ ] **Step 5: Run the existing SQLite tests to confirm schema initialization remains compatible.

### Task 2: Implement authenticated media APIs and safe file handling

**Files:**
- Create: `src/lib/media-validation.ts`
- Create: `src/lib/media-upload.ts`
- Create: `src/app/api/admin/media/route.ts`
- Create: `src/app/api/admin/media/order/route.ts`
- Create: `src/app/api/admin/media/route.test.ts`
- Create: `src/app/api/admin/media/order/route.test.ts`

**Interfaces:**
- `POST /api/admin/media` multipart upload; `GET/PATCH/DELETE /api/admin/media`; `PUT /api/admin/media/order`.

- [ ] **Step 1: Write failing API tests** for unauthenticated rejection, non-image rejection, 12 MiB rejection, successful upload, metadata update/delete, and ordered IDs.
- [ ] **Step 2: Run `npm test -- src/app/api/admin/media/route.test.ts src/app/api/admin/media/order/route.test.ts --run` and verify expected failures.
- [ ] **Step 3: Implement MIME/size/alt/slot validation, random filename generation, upload-directory containment checks, and admin guards.
- [ ] **Step 4: Run `npm test -- src/app/api/admin/media/route.test.ts src/app/api/admin/media/order/route.test.ts --run` and verify they pass without leaking filesystem paths.
- [ ] **Step 5: Add cleanup coverage for failed writes and run all API tests.

### Task 3: Add venue/settings overrides needed by uploaded venue media

**Files:**
- Modify: `src/config/wedding.ts`
- Create: `src/lib/site-settings.ts`
- Create: `src/lib/site-settings.test.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin-dashboard.tsx`

**Interfaces:**
- `SiteSettings` contains venue, address, event labels, maps URL, and optional `venueImage` media reference; config values remain fallback defaults.

- [ ] **Step 1: Write failing tests** for merging stored venue values with config defaults and rejecting malformed maps URLs.
- [ ] **Step 2: Run `npm test -- src/lib/site-settings.test.ts --run` and verify the merge/URL assertions fail before implementation.
- [ ] **Step 3: Add the minimal settings persistence/read path and admin form fields for venue, address, time, and map URL.
- [ ] **Step 4: Run `npm test -- src/lib/site-settings.test.ts --run` and verify fallback and override behavior.
- [ ] **Step 5: Add a component test proving the settings form keeps existing invitation data intact.

### Task 4: Render media across the public invitation

**Files:**
- Modify: `src/components/invitation.tsx`
- Modify: `src/components/personal-invitation.tsx`
- Create: `src/components/gallery.tsx`
- Create: `src/components/gallery.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/moi/[code]/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- `Invitation` accepts an optional active-media collection and renders hero, couple, story, venue, and gallery slots.
- `Gallery` accepts ordered assets and exposes keyboard-accessible lightbox controls.

- [ ] **Step 1: Write failing component tests** for slot rendering, initials fallback, gallery empty state/lightbox, and both routes sharing media.
- [ ] **Step 2: Run `npm test -- src/components/gallery.test.ts --run` and verify the new rendering assertions fail.
- [ ] **Step 3: Implement server-side media loading, responsive sections, lazy images, lightbox close/previous/next behavior, and reduced-motion styles.
- [ ] **Step 4: Run `npm test -- src/components/gallery.test.ts --run` and verify they pass; use the browser suite in Task 7 for viewport checks.
- [ ] **Step 5: Add accessible labels and verify no layout-breaking asset failures.

### Task 5: Build the admin media editor

**Files:**
- Modify: `src/components/admin-dashboard.tsx`
- Create: `src/components/admin-media-panel.tsx`
- Modify: `src/components/admin-dashboard.test.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- `AdminMediaPanel` supports slot upload, previews, replace/delete, gallery drag-and-drop order, set-as-hero, and venue image selection.

- [ ] **Step 1: Write failing component tests** for upload form submission, preview thumbnails, delete, reorder, set hero, and accessible status messages.
- [ ] **Step 2: Run `npm test -- src/components/admin-media-panel.test.tsx --run` and verify expected failures.
- [ ] **Step 3: Implement the panel with `FormData`, optimistic preview state, server refresh, and Vietnamese error/success states.
- [ ] **Step 4: Run `npm test -- src/components/admin-media-panel.test.tsx --run` and verify all interactions pass.
- [ ] **Step 5: Check narrow viewport CSS and ensure controls remain usable by keyboard/touch.

### Task 6: Add guest-named invitation preview and copy UX

**Files:**
- Modify: `src/components/admin-dashboard.tsx`
- Modify: `src/components/admin-dashboard.test.tsx`
- Modify: `src/app/moi/[code]/page.tsx`
- Modify: `src/components/personal-invitation.tsx`
- Modify: `src/lib/invitation-service.ts`
- Modify: `src/app/moi/[code]/page.tsx` (colocated `generateMetadata` export)

**Interfaces:**
- Admin invitation rows expose `copy link` and `Xem trước` actions.
- Personalized metadata resolves only the validated guest name and returns a generic fallback for invalid codes.

- [ ] **Step 1: Write failing tests** for copyable URL, preview link/name, valid guest metadata, and invalid-code generic metadata.
- [ ] **Step 2: Run `npm test -- src/app/moi/[code]/page.test.tsx src/components/admin-dashboard.test.tsx --run` and verify the metadata/preview assertions fail.
- [ ] **Step 3: Implement the actions, metadata resolver, and visible guest-name cover while preserving RSVP route behavior.
- [ ] **Step 4: Run `npm test -- src/app/moi/[code]/page.test.tsx src/components/admin-dashboard.test.tsx --run` and verify they pass.

### Task 7: Browser verification and documentation

**Files:**
- Modify: `e2e/wedding.spec.ts`
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `DEPLOYMENT.md`

- [ ] **Step 1: Add browser coverage** for admin upload/reorder/delete, public media sections, mobile gallery, and personalized preview name.
- [ ] **Step 2: Run `npm run test:e2e -- --workers=1` and fix only behavior proven by failures.
- [ ] **Step 3: Document `public/uploads` backup/restore and media limits for VPS deployment.
- [ ] **Step 4: Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- [ ] **Step 5: Review the diff, confirm `.env.local`, SQLite files, and uploaded media are ignored, then commit the implementation.

### Task 8: Persist non-destructive crop metadata

**Files:**
- Modify: `src/lib/sqlite.ts`
- Modify: `src/lib/media-store.ts`
- Modify: `src/lib/media-store.test.ts`
- Modify: `src/app/api/admin/media/route.ts`
- Modify: `src/app/api/admin/media/route.test.ts`

**Interfaces:**
- `MediaAsset` adds `focusX: number`, `focusY: number`, and `zoom: number`.
- `updateMediaAsset({ id, focusX?, focusY?, zoom? })` persists finite crop values clamped to `focusX/focusY: 0..100` and `zoom: 1..3`.
- `PATCH /api/admin/media` accepts `{ id, focusX?, focusY?, zoom? }` and returns the updated `MediaAsset`.

- [ ] **Step 1: Write failing repository migration and crop tests**

```ts
it("adds centered crop defaults to existing media", () => {
  const created = createMediaAsset({ slot: "hero", src: "/uploads/hero.jpg" });
  expect(created).toMatchObject({ focusX: 50, focusY: 50, zoom: 1 });
});

it("clamps crop metadata before persistence", () => {
  const created = createMediaAsset({ slot: "hero", src: "/uploads/hero.jpg" });
  const updated = updateMediaAsset({ id: created.id, focusX: -12, focusY: 160, zoom: 9 });
  expect(updated).toMatchObject({ focusX: 0, focusY: 100, zoom: 3 });
});
```

- [ ] **Step 2: Run the repository test and confirm RED**

Run: `npm test -- src/lib/media-store.test.ts --run --maxWorkers=1`

Expected: FAIL because `MediaAsset` does not expose crop metadata and the existing table has no crop columns.

- [ ] **Step 3: Add an idempotent old-database migration and repository mapping**

After `media_assets` exists, inspect `PRAGMA table_info(media_assets)` and execute these statements only for missing columns:

```sql
ALTER TABLE media_assets ADD COLUMN focus_x REAL NOT NULL DEFAULT 50;
ALTER TABLE media_assets ADD COLUMN focus_y REAL NOT NULL DEFAULT 50;
ALTER TABLE media_assets ADD COLUMN zoom REAL NOT NULL DEFAULT 1;
```

Map the three columns in every media query and clamp writes with a small finite-number helper; do not recreate or truncate an existing database.

- [ ] **Step 4: Write the failing PATCH test, then implement the API change**

```ts
const response = await PATCH(adminJsonRequest({ id: asset.id, focusX: 24, focusY: 72, zoom: 1.6 }));
expect(response.status).toBe(200);
await expect(response.json()).resolves.toMatchObject({ asset: { focusX: 24, focusY: 72, zoom: 1.6 } });
```

Run before implementation: `npm test -- src/app/api/admin/media/route.test.ts --run --maxWorkers=1`

Expected: FAIL because PATCH ignores crop fields.

- [ ] **Step 5: Verify repository and API GREEN**

Run: `npm test -- src/lib/media-store.test.ts src/app/api/admin/media/route.test.ts --run --maxWorkers=1`

Expected: PASS, including unchanged upload/delete behavior.

### Task 9: Use one crop renderer in public and admin previews

**Files:**
- Create: `src/components/media-frame.tsx`
- Create: `src/components/media-frame.test.tsx`
- Modify: `src/components/invitation.tsx`
- Modify: `src/components/gallery.tsx`
- Modify: `src/components/gallery.test.tsx`
- Modify: `src/components/admin-media-panel.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- `MediaFrame({ asset, className?, imageClassName?, alt?, loading?, children? })` renders one overflow-hidden frame and one cover image.
- `mediaFrameStyle(asset)` returns `{ objectPosition, transform, transformOrigin }` using the persisted crop values.
- The hero, portrait, story, venue, gallery, and admin slot previews all consume `MediaFrame`.

- [ ] **Step 1: Write failing style and render-parity tests**

```tsx
expect(mediaFrameStyle({ ...asset, focusX: 20, focusY: 70, zoom: 1.5 })).toEqual({
  objectPosition: "20% 70%",
  transform: "scale(1.5)",
  transformOrigin: "20% 70%",
});

render(<MediaFrame asset={{ ...asset, focusX: 20, focusY: 70, zoom: 1.5 }} />);
expect(screen.getByRole("img")).toHaveStyle({ objectPosition: "20% 70%", transform: "scale(1.5)" });
```

- [ ] **Step 2: Run the focused component test and confirm RED**

Run: `npm test -- src/components/media-frame.test.tsx --run --maxWorkers=1`

Expected: FAIL because the shared renderer does not exist.

- [ ] **Step 3: Implement `MediaFrame` and replace duplicated image crop markup**

The frame owns `overflow: hidden`; the image owns `height/width: 100%`, `object-fit: cover`, `object-position`, `transform`, and `transform-origin`. Hero must use an absolutely positioned `MediaFrame` layer behind the existing overlay/content instead of a CSS `background-image`.

- [ ] **Step 4: Make slot-specific admin previews match public shapes**

Use explicit preview variants: `hero`, `portrait`, `story`, `venue`, and `gallery`. Show the public section label under every preview and keep the same `MediaFrame` asset/style inputs used by the public component.

- [ ] **Step 5: Verify shared rendering GREEN**

Run: `npm test -- src/components/media-frame.test.tsx src/components/gallery.test.tsx src/components/admin-dashboard.test.tsx --run --maxWorkers=1`

Expected: PASS with no regression to empty fallbacks or lightbox controls.

### Task 10: Add crop editor and full invitation preview to admin

**Files:**
- Create: `src/components/media-crop-editor.tsx`
- Create: `src/components/media-crop-editor.test.tsx`
- Create: `src/components/invitation-preview-dialog.tsx`
- Create: `src/components/invitation-preview-dialog.test.tsx`
- Modify: `src/components/admin-media-panel.tsx`
- Create: `src/components/admin-media-panel.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- `MediaCropEditor({ asset, onSave, onClose })` edits local `{ focusX, focusY, zoom }` and calls `onSave` only from `Lưu căn chỉnh`.
- `InvitationPreviewDialog({ open, onClose, refreshKey, previewUrl?: string })` renders `/` by default and supports `mobile` (`390 x 844`) and `desktop` (`1280 x 800`) iframe modes.
- `AdminMediaPanel` PATCHes crop metadata and increments `refreshKey` after every persisted media mutation.

- [ ] **Step 1: Write failing crop editor interaction tests**

```tsx
fireEvent.change(screen.getByLabelText("Ngang"), { target: { value: "25" } });
fireEvent.change(screen.getByLabelText("Dọc"), { target: { value: "75" } });
await user.click(screen.getByRole("button", { name: "Lưu căn chỉnh" }));
expect(onSave).toHaveBeenCalledWith({ focusX: 25, focusY: 75, zoom: 1 });
```

Also assert `Hủy` does not call `onSave`, `Escape` closes, drag updates the range values, and hero switches between `Mobile` and `Desktop` frames.

- [ ] **Step 2: Run crop editor tests and confirm RED**

Run: `npm test -- src/components/media-crop-editor.test.tsx --run --maxWorkers=1`

Expected: FAIL because the crop editor does not exist.

- [ ] **Step 3: Implement the accessible crop dialog**

Use pointer events for drag and three `input type="range"` controls named `Ngang`, `Dọc`, and `Thu phóng`. Clamp local state to the same server ranges. Add `role="dialog"`, `aria-modal="true"`, initial focus, focus restoration, `Escape`, and visible `Lưu căn chỉnh`/`Hủy` actions.

- [ ] **Step 4: Write failing full-preview tests, then implement the dialog**

```tsx
render(<InvitationPreviewDialog open onClose={vi.fn()} refreshKey={3} />);
expect(screen.getByTitle("Xem trước toàn bộ thiệp")).toHaveAttribute("src", "/?preview=3");
await user.click(screen.getByRole("button", { name: "Desktop" }));
expect(screen.getByTestId("invitation-preview-device")).toHaveClass("is-desktop");
```

The iframe uses `sandbox="allow-same-origin allow-scripts allow-forms"`, the dialog exposes `Mở tab mới`, and it starts in mobile mode because invitation traffic is mobile-first.

- [ ] **Step 5: Integrate editor and preview into the media panel**

Add `Căn khung` to every active singleton/gallery asset and `Xem trước toàn bộ thiệp` to the panel heading. After successful upload, replacement, delete, reorder, or crop PATCH, increment `refreshKey`; failed mutations retain the previous preview and show the Vietnamese error status.

- [ ] **Step 6: Verify all admin media interactions GREEN**

Run: `npm test -- src/components/media-crop-editor.test.tsx src/components/invitation-preview-dialog.test.tsx src/components/admin-media-panel.test.tsx --run --maxWorkers=1`

Expected: PASS for save/cancel/drag/device mode/API error behavior.

### Task 11: Browser QA, documentation, and production verification for crop parity

**Files:**
- Modify: `e2e/wedding.spec.ts`
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`

- [ ] **Step 1: Add a crop-parity browser test**

Create or reuse a test media row, save a non-centered focal point from admin, reload `/`, and assert the public image computed `object-position` equals the admin crop preview. Run once at a mobile viewport and once at desktop width.

- [ ] **Step 2: Add browser coverage for the full invitation preview**

Assert the dialog defaults to mobile, toggles to desktop, renders `/` in the iframe, and refreshes after a successful crop save.

- [ ] **Step 3: Run browser tests**

Run: `npm run test:e2e -- --workers=1`

Expected: PASS for upload, crop persistence, mobile/desktop preview, public crop parity, gallery, and personalized guest name.

- [ ] **Step 4: Document crop behavior and VPS persistence**

Explain that crop metadata lives in SQLite, original files live under `public/uploads`, both must be backed up, and `MEDIA_UPLOAD_DIRECTORY` must persist across deploys.

- [ ] **Step 5: Run the full release gate**

Run sequentially: `npm test -- --run --maxWorkers=1`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

Expected: all commands exit `0`; uploaded files, SQLite databases, and `.env.local` remain ignored by Git.

### Task 12: Persist visual evidence for every E2E scenario

**Files:**
- Modify: `playwright.config.ts`
- Modify: `.gitignore`
- Test: `playwright.config.test.ts`

- [ ] **Step 1: Add a failing config test** asserting every Playwright test captures a full-page screenshot and that an HTML report is generated without opening automatically.
- [ ] **Step 2: Configure visual evidence** with `screenshot: { mode: "on", fullPage: true }`, retain the line reporter, and add an HTML reporter at `playwright-report/`.
- [ ] **Step 3: Ignore generated evidence** by keeping `test-results/` ignored and adding `playwright-report/` to `.gitignore`; neither directory is committed.
- [ ] **Step 4: Run the full browser suite** with one worker and verify 11/11 tests pass, one final screenshot is attached for each scenario, and `playwright-report/index.html` exists.
- [ ] **Step 5: Present evidence** by listing the generated PNG paths and showing representative admin, invitation, crop-preview, gallery, and RSVP screenshots to the user.
