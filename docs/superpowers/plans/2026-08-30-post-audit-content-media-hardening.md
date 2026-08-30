# Post-Audit Content & Media Hardening Plan

## Status
Planned and audited on `main` on 2026-08-30. **Not implemented yet.**

This plan is the canonical follow-up backlog produced after reviewing the completed admin/SQLite, media/gallery, invitation content, theme, font, RSVP delete/filter, and CI work.

Do not treat the unchecked work below as already shipped. When an item is implemented, update this file in the same milestone/commit so another AI can recover the exact state from the repository.

## Related plans
This plan extends, but does not replace:

- `docs/superpowers/plans/2026-08-27-admin-sqlite.md`
- `docs/superpowers/plans/2026-08-29-media-gallery.md`
- `docs/superpowers/plans/2026-08-30-invitation-delete-filter.md`
- `docs/superpowers/plans/2026-08-30-invitation-theme-presets.md`
- `docs/superpowers/plans/2026-08-30-invitation-font-presets.md`

## Goal
Finish the five accepted post-audit improvements without changing public invitation/RSVP contracts, losing existing SQLite content, or reintroducing duplicate admin sources of truth.

The accepted audit items are:

1. Make the remaining normal-state public invitation/RSVP copy editable.
2. Remove the duplicate venue/date editor from `/admin` and keep `/admin/edit` as the single content-editing UI.
3. Add non-destructive crop/focus controls to each love-story milestone image.
4. Prevent uploaded-but-never-saved milestone images from accumulating as orphan files.
5. Add explicit invitation-content schema versioning and migrations so future content fields do not silently invalidate old JSON.

## Important execution order
Keep the audit numbering above for traceability, but implement in this order:

**5 → 1 → 2 → 3 → 4**

Reason: items 1 and 3 add new persisted content fields. Building the migration/version layer first prevents the exact compatibility problem identified in audit item 5.

Each numbered audit item should still be committed as a clear milestone with tests.

---

# Audit Item 5 — Invitation content schema versioning and migrations

## Problem
`invitation_content.content_json` currently stores the whole content object and validates it against the current Zod schema. Old rows do not carry an explicit schema version. Adding a new required field can make a previously valid stored object fail validation and cause the application to fall back to defaults.

## Product/architecture decision
Add a database-level `schema_version` to the singleton `invitation_content` row rather than wrapping the JSON in a new envelope. Existing rows are version 1.

Use sequential pure migrations before final schema validation:

```text
stored JSON + schema_version
  -> migrate v1 -> v2
  -> migrate v2 -> v3 ...
  -> validate current InvitationContent
  -> return current content
```

Never destroy or overwrite the original row merely because migration/validation fails during a read.

## Files
- Modify: `src/lib/invitation-content-store.ts`
- Modify: `src/lib/sqlite.ts` or keep the table migration local to the content store, but choose one canonical migration owner and document it.
- Create or modify: `src/lib/invitation-content-migrations.ts`
- Modify: `src/lib/invitation-content-store.test.ts`
- Modify affected API tests as needed.

## Requirements
- [ ] Define `CURRENT_INVITATION_CONTENT_SCHEMA_VERSION`.
- [ ] Add `schema_version INTEGER NOT NULL DEFAULT 1` idempotently for an existing database.
- [ ] Treat pre-column/pre-version content as version 1.
- [ ] Store the current version on every successful content save.
- [ ] Implement sequential migration functions; no scattered inline `?? default` migration logic across React components.
- [ ] Migrations preserve all existing names, story text, dates, venue data, URLs, uploaded milestone image references, and other user content.
- [ ] A migration may add defaults for fields that did not exist in the older version, but must not reset unrelated fields.
- [ ] A row with a future version (`storedVersion > currentVersion`) must not be rewritten as an older version.
- [ ] Invalid/unmigratable stored content must fail safely without corrupting the stored row.

## Tests
- [ ] Start from a legacy v1 row and prove it migrates to the current in-memory shape without losing existing values.
- [ ] Save migrated content and prove `schema_version` advances to current.
- [ ] Prove unknown/future version does not get overwritten during read.
- [ ] Prove malformed JSON does not mutate the database.
- [ ] Existing content-store/API tests remain green.

## Done when
- Existing production JSON can survive the new fields planned below.
- Future content changes have one documented migration path.

---

# Audit Item 1 — Make remaining invitation-facing copy editable

## Problem
The section editor already owns most wedding copy, but some normal-state strings remain hard-coded in public components. Confirmed examples include event labels such as `Thời gian`, `Địa điểm`, `Xem chỉ đường` and RSVP copy such as the attendance question/options, guest-count label, message label/placeholder, submit label, closed-state copy, and default success copy.

## Scope decision
Make **normal invitation-facing editorial/UX copy** editable. Keep low-level technical/network/validation diagnostics code-owned where changing them could make failures misleading or impossible to support.

## Data model
Extend `InvitationContent` with explicit semantic copy fields instead of generic arrays or arbitrary HTML.

Suggested shape (final names may be refined during implementation):

```ts
event: {
  // existing fields...
  timeHeading: string;
  venueHeading: string;
  directionsLabel: string;
};

rsvp: {
  // existing fields...
  greetingPrefix: string;
  attendanceQuestion: string;
  attendingLabel: string;
  declinedLabel: string;
  guestCountLabel: string;
  guestCountSuffix: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  closedMessage: string;
  successMessage: string;
};
```

Do not store JSX/HTML in these values.

## Files
- Modify: `src/types/invitation-content.ts`
- Modify: `src/config/invitation-content.ts`
- Modify: `src/lib/invitation-content-store.ts`
- Modify: `src/lib/invitation-content-migrations.ts`
- Modify: `src/components/admin-content-editor.tsx`
- Modify: `src/components/invitation.tsx`
- Modify: `src/components/personal-invitation.tsx` if needed.
- Modify: `src/components/rsvp-form.tsx`
- Modify corresponding component/store/API tests.
- Add/update Playwright coverage.

## Requirements
- [ ] Add defaults matching the current visible Vietnamese strings exactly, so upgrading does not redesign/reword the live invitation.
- [ ] Add migration defaults for older stored content.
- [ ] Add editor fields under the logical `Lễ cưới` and `Thiệp riêng & RSVP` sections.
- [ ] Public `/` and `/moi/[code]` use stored copy.
- [ ] Personalized guest names/counts remain data-driven and are not converted into editable static text.
- [ ] No user-supplied HTML is rendered.
- [ ] Existing technical error responses remain understandable even if content settings are invalid.

## Tests
- [ ] Content-store migration preserves old content and adds current defaults.
- [ ] Admin editor saves at least representative event + RSVP copy fields.
- [ ] `Invitation` renders editable event headings/directions label.
- [ ] `RsvpForm` renders editable normal-state copy and still submits the same API payload.
- [ ] E2E edits a visible RSVP/event label, saves, and sees it on a public invitation.

## Done when
Normal guest-facing invitation copy is controlled from `/admin/edit` except intentionally code-owned error/diagnostic text.

---

# Audit Item 2 — Remove duplicate venue/date editing from `/admin`

## Problem
Venue/address/date label/time label/Maps URL are editable both in the guest dashboard and in `/admin/edit → Lễ cưới`. Two editing UIs for the same persisted values are confusing and can diverge conceptually.

## Product decision
`/admin` should focus on guests, RSVP, invitation links, and media management. `/admin/edit` is the single human-facing editor for invitation content, including venue/date/map copy.

Keep the existing `site_settings` persistence compatibility layer temporarily because `invitation-content-store` still synchronizes the legacy five fields. Removing the duplicate UI does **not** require deleting compatibility storage/API in the same milestone.

## Files
- Modify: `src/components/admin-dashboard.tsx`
- Modify: `src/components/admin-dashboard.test.tsx`
- Modify: `src/app/admin/page.tsx` if `settings` is no longer required by the dashboard.
- Review: `src/app/api/admin/settings/route.ts`
- Review: `src/lib/site-settings.ts`
- Modify README/docs describing admin areas.

## Requirements
- [ ] Remove the `Địa điểm & thời gian` form from `/admin`.
- [ ] Remove dashboard-only settings state/save handlers/props made obsolete by that UI.
- [ ] Do not break media management, guest creation/edit/delete, filters, RSVP export, or preview.
- [ ] `/admin/edit → Lễ cưới` remains the visible source of truth.
- [ ] Keep `/api/admin/settings` and `site_settings` only if still required as a compatibility shim; mark their status in code/docs so a future cleanup does not mistake them for the primary editor.
- [ ] Do not perform an unrelated database migration just to remove the duplicate panel.

## Tests
- [ ] Dashboard test proves duplicate settings form is absent.
- [ ] Content editor test proves venue/date fields remain editable.
- [ ] Existing media + guest dashboard tests stay green.

## Done when
There is one obvious UI location for wedding venue/time content.

---

# Audit Item 3 — Crop/focus controls for milestone images

## Problem
Love-story milestones now support one image each, but milestone JSON stores only `imageSrc`. Hero/portrait/story/venue/gallery media already have non-destructive focus/zoom behavior, so milestone images should use the same visual model.

## Data model
Keep `imageSrc` for backward compatibility and add crop metadata with safe defaults:

```ts
imageSrc: string | null;
imageFocusX: number; // default 50, range 0..100
imageFocusY: number; // default 50, range 0..100
imageZoom: number;   // default 1, range 1..3
```

If implementation finds a nested image object materially cleaner, it may migrate to that shape only through the schema-version migration layer from Audit Item 5. Do not silently break the current `imageSrc` rows.

## Files
- Modify: `src/types/invitation-content.ts`
- Modify: `src/config/invitation-content.ts`
- Modify: `src/lib/invitation-content-store.ts`
- Modify: `src/lib/invitation-content-migrations.ts`
- Modify: `src/components/admin-content-editor.tsx`
- Modify: `src/components/admin-content-editor.module.css`
- Review/refactor: `src/components/admin-media-panel.tsx`
- Review/reuse: shared `MediaFrame` rendering/crop style utilities.
- Modify: `src/components/invitation.tsx`
- Modify: `src/app/story-milestones.css` or the current milestone stylesheet.
- Add/update unit and E2E tests.

## Architecture requirement
Do not create a second incompatible crop algorithm.

Prefer extracting/reusing a small shared crop editor/control from the existing admin media workflow if practical. Public milestone rendering must pass focus/zoom through the same `MediaFrame` behavior used by managed media.

## UX requirements
- [ ] Each milestone with an image has a clear `Chỉnh khung ảnh` action.
- [ ] Admin preview reflects focus X/Y and zoom before save.
- [ ] Controls are usable on mobile; primary adjustment cannot require hover.
- [ ] Provide reset-to-center/default action.
- [ ] Removing/replacing an image resets or deliberately preserves crop metadata; choose and test one behavior. Recommended: replacing resets to `50/50/1` to avoid inheriting a crop from a different photo.
- [ ] Milestones without an image do not show meaningless crop controls.

## Tests
- [ ] Validation clamps/rejects focus/zoom outside supported ranges consistently with media assets.
- [ ] Legacy milestone rows migrate to `50/50/1`.
- [ ] Component test saves crop metadata for a milestone.
- [ ] Public rendering receives the same focus/zoom values.
- [ ] Playwright changes a milestone crop and verifies the public image framing on mobile or desktop.

## Done when
Milestone images have the same non-destructive framing quality as the other invitation media slots.

---

# Audit Item 4 — Clean up orphaned uploads

## Problem
The milestone upload endpoint writes a canonical file into `MEDIA_UPLOAD_DIRECTORY` immediately. If an admin uploads an image and closes/reloads the page before saving content, that file is never referenced by `invitation_content` and can accumulate indefinitely.

Client-only cleanup on unload is not reliable enough; server-side reconciliation is required.

## Architecture decision
Implement a conservative **unreferenced canonical upload prune** that understands both storage systems:

Referenced uploads are the union of:

1. all `media_assets.src` rows, and
2. all milestone `imageSrc` values in current invitation content.

Only generated canonical `/uploads/<filename>` files may be considered for automatic deletion. Never delete arbitrary files in the upload directory.

Use an age grace period (recommended: 24 hours) so an in-progress upload/save cannot be pruned by another request.

## Files
- Modify: `src/lib/media-upload.ts`
- Create: `src/lib/media-prune.ts`
- Create: `src/lib/media-prune.test.ts`
- Modify: `src/app/api/admin/content/image/route.ts`
- Modify: `src/app/api/admin/content/route.ts` as appropriate.
- Optionally create a maintenance script such as `scripts/media-prune.ts` if manual VPS cleanup is useful; if added, document it in README/DEPLOYMENT.

## Requirements
- [ ] Enumerate only canonical generated upload filenames.
- [ ] Build the referenced set from both media metadata and invitation milestone content.
- [ ] Never delete a referenced media asset or saved milestone image.
- [ ] Never delete a file younger than the configured grace period.
- [ ] Ignore unknown/non-canonical files rather than attempting to manage them.
- [ ] Cleanup failures do not cause a successful content save to be rolled back after persistence has committed.
- [ ] Run pruning from a bounded admin-side lifecycle point (for example after successful content save and/or before/after a new admin upload), not on every public page request.
- [ ] Log/report enough information for manual diagnosis without exposing filesystem paths to browsers.

## Tests
- [ ] Old unreferenced canonical file is removed.
- [ ] Recent unreferenced file is retained.
- [ ] File referenced by `media_assets` is retained.
- [ ] File referenced by milestone content is retained.
- [ ] Non-canonical file is ignored.
- [ ] Missing upload directory is harmless.

## Done when
Abandoned milestone uploads cannot grow indefinitely, while referenced wedding media remains protected.

---

# Cross-cutting regression checklist

After each milestone, and before marking this plan implemented:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

GitHub Actions must be green on the final HEAD and must still upload:

- `playwright-report`
- `playwright-test-results` screenshots/traces

Manual smoke check after deployment:

- `/admin` guest/RSVP/media workflows still work and no duplicate venue editor remains.
- `/admin/edit` can edit all intended invitation copy.
- Existing production content is preserved after the schema migration.
- `/` renders updated event/story copy and milestone crop.
- `/moi/[code]` renders personalized guest + RSVP copy correctly.
- Old milestone images remain visible after migration.
- Upload cleanup does not remove active gallery/hero/portrait/venue/milestone images.
- Mobile has no horizontal overflow introduced by new editor/crop controls.

# Explicitly out of scope for this plan

Do not expand this audit plan into unrelated work:

- SEO/dynamic root metadata/Open Graph improvements.
- Automatic VPS deployment/CD or branch protection.
- Custom/free-form color picker or custom CSS.
- Arbitrary uploaded fonts or font URLs.
- Heading/body font pairing, font sizing, or letter-spacing controls.
- Per-guest/per-section themes or fonts.
- New invitation layout/template system.

Those may be planned separately after these five accepted audit items are complete.

# Completion protocol for future AI

For every implemented audit item:

1. Read this plan and the related feature plan(s) before editing.
2. Read current `main`; do not assume file state from old plan text.
3. Add/update tests with the implementation.
4. Push a clearly named milestone commit to `main` only after source changes are coherent.
5. Update the relevant section in **this file** with `✅ Implemented`, commit SHA(s), and any architecture deviation.
6. Let GitHub Actions verify unit/lint/build/E2E; do not claim success before the final HEAD workflow is green.
7. At the end, change `## Status` to `Implemented` and leave any intentionally deferred cleanup explicitly documented.

## Final done-when summary

- [ ] Invitation content has explicit schema versioning + tested migrations.
- [ ] Remaining normal-state public event/RSVP copy is editable from `/admin/edit`.
- [ ] `/admin` no longer duplicates venue/date editing.
- [ ] Love-story milestone images support focus/zoom crop metadata and preview.
- [ ] Old abandoned canonical uploads are safely pruned without touching referenced media.
- [ ] Unit tests, lint, build, Playwright E2E, screenshots/artifacts all pass on final HEAD.
