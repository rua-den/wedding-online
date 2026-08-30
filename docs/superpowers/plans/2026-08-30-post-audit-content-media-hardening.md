# Post-Audit Content, Media & Experience Hardening Plan

## Status
Planned and audited on `main` on 2026-08-30. **Not implemented yet.**

This plan is the canonical follow-up backlog produced after reviewing the completed admin/SQLite, media/gallery, invitation content, theme, font, RSVP delete/filter, CI, milestone-image, and public invitation work.

Do not treat the unchecked work below as already shipped. When an item is implemented, update this file in the same milestone/commit so another AI can recover the exact state from the repository.

## Related plans
This plan extends, but does not replace:

- `docs/superpowers/plans/2026-08-27-admin-sqlite.md`
- `docs/superpowers/plans/2026-08-29-media-gallery.md`
- `docs/superpowers/plans/2026-08-30-invitation-delete-filter.md`
- `docs/superpowers/plans/2026-08-30-invitation-theme-presets.md`
- `docs/superpowers/plans/2026-08-30-invitation-font-presets.md`

## Goal
Finish the seven accepted post-audit improvements without changing public invitation/RSVP API contracts, losing existing SQLite content, deleting referenced uploads, or reintroducing duplicate admin sources of truth.

The accepted audit items are:

1. Make the remaining normal-state public invitation/RSVP copy editable.
2. Remove the duplicate venue/date editor from `/admin` and keep `/admin/edit` as the single content-editing UI.
3. Add non-destructive crop/focus controls to each love-story milestone image.
4. Prevent uploaded-but-never-saved files from accumulating as orphan uploads.
5. Add explicit invitation-content schema versioning and migrations so future content fields do not silently invalidate old JSON.
6. Add admin-uploaded wedding background music with a browser-safe public player.
7. Audit and fix the stuttering/jank observed while scrolling the public invitation, especially on mobile.

## Important execution order
Keep the audit numbering above for traceability, but implement in this order:

**5 → 1 → 2 → 3 → 7 → 6 → 4**

Reasons:

- Items 1 and 3 add new persisted content fields. Building item 5 first prevents the exact compatibility problem identified in the audit.
- Item 7 should establish a clean scroll-performance baseline before background audio adds another long-lived browser resource.
- Item 4 must run after item 6, or be updated in the same milestone, because the orphan-prune reference set must protect the saved wedding audio as well as image assets.

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

# Audit Item 7 — Scroll animation and performance hardening

## Problem
The public invitation feels visibly `khựng`/janky while scrolling, particularly on mobile. The current repository does not have a dedicated animation dependency such as Framer Motion or GSAP, so this item must begin with profiling rather than assuming the problem is an animation library.

Known current characteristics worth auditing include:

- `html { scroll-behavior: smooth; }`.
- Full-height `100svh` hero/personal sections.
- Large uploaded images and gallery assets.
- Theme canvas coverage and large painted surfaces.
- Shadows/gradients/media overlays that may increase paint cost on lower-end phones.
- Any reveal/scroll effects added by current or future CSS/JS must be included in the audit.

## Architecture/performance decision
Do **not** add a large animation framework as the first response to scroll jank.

Profile the actual public pages first, then keep motion lightweight:

- Prefer CSS `transform` and `opacity` for visual motion.
- Never animate layout-heavy properties such as `top`, `left`, `height`, large `box-shadow` spreads, or continuously changing filters during scroll unless profiling proves they are cheap enough.
- Do not attach an unthrottled `scroll` handler that reads layout and writes styles every frame.
- If reveal-on-scroll behavior exists/is retained, prefer a single `IntersectionObserver`, animate each section once, and disconnect observations after reveal.
- Respect `prefers-reduced-motion: reduce` and provide a fully usable static state.
- Avoid permanent `will-change` on many elements; only use it when measurement proves a benefit.

## Files to audit
- `src/app/globals.css`
- `src/app/invitation-theme.css`
- `src/app/mobile-fixes.css`
- `src/app/story-milestones.css`
- `src/components/invitation.tsx`
- `src/components/media-frame.tsx`
- `src/components/gallery.tsx`
- `src/components/personal-invitation.tsx`
- Any future reveal/animation component introduced during the fix.
- Playwright config/tests for mobile smoke coverage.

## Profiling requirements
- [ ] Reproduce on at least one mobile viewport and one desktop viewport.
- [ ] Profile `/` and `/moi/[code]` separately.
- [ ] Test with a realistic uploaded hero plus story/gallery images; an empty-media page is not a sufficient benchmark.
- [ ] Inspect long tasks, forced layout/reflow, image decode work, main-thread event handlers, paint/composite cost, and layout shifts while scrolling through the whole page.
- [ ] Record the primary bottleneck(s) in this plan before/when implementing the fix so future AI knows what was actually measured.
- [ ] Distinguish normal image/network loading from continuous scroll-time jank.

## Implementation requirements
- [ ] Fix measured bottlenecks instead of masking them by removing all visual polish.
- [ ] Keep normal finger/mousewheel scrolling native; do not implement custom smooth-scroll physics.
- [ ] Ensure images below the fold remain lazily loaded where appropriate and have stable dimensions to avoid layout jumps.
- [ ] If large theme/background paint techniques are responsible, replace them with a cheaper equivalent while keeping admin theme isolation intact.
- [ ] If section reveal animation is used, animate once and only with compositor-friendly properties.
- [ ] `prefers-reduced-motion` must disable non-essential scroll/reveal animation.
- [ ] Mobile 320px+ must not gain horizontal overflow.
- [ ] Keep gallery/lightbox interactions responsive after optimization.

## Tests / verification
- [ ] Existing visual/component tests remain green.
- [ ] Add E2E smoke coverage for full-page scrolling on the general and personalized invitation without page errors or stuck overlays.
- [ ] Add a reduced-motion E2E case if reveal animation exists after the fix.
- [ ] Do not enforce brittle CI FPS numbers; GitHub-hosted runner timing is too noisy for a hard performance threshold.
- [ ] Do document a before/after local/device profiling note in this plan or a linked performance note.
- [ ] Playwright screenshots still capture the page after the final scroll state.

## Done when
The invitation scrolls smoothly enough on representative mobile hardware, with no repeated scroll-time main-thread work or paint pathology identified by the audit, while preserving the intended visual design.

---

# Audit Item 6 — Uploadable wedding background music

## Problem
The invitation currently has no managed wedding music. The admin needs to upload/replace/remove a background track and guests need an elegant, reliable way to play/pause it on both `/` and `/moi/[code]`.

## Product decisions
- Music is a **global invitation experience setting**, not per guest and not embedded inside `InvitationContent` JSON.
- Put the admin controls in `/admin/appearance` as a third section after **Màu sắc** and **Font chữ**, because music belongs to the invitation presentation/experience rather than guest management.
- v1 supports a single active track.
- Public playback loops by default while the invitation is open.
- Do not promise audible autoplay. Modern iOS/Android/desktop browsers may block autoplay until a user gesture.
- Show a clear, accessible play/pause control. If an autoplay attempt is ever made, failure must silently fall back to the paused control rather than producing an error state.
- Do not accept remote arbitrary URLs; only authenticated uploads managed by this application.

## Storage architecture
Use the existing persistent upload root (`MEDIA_UPLOAD_DIRECTORY`) so deployment/backup behavior stays consistent, but separate audio validation/canonical filenames from image validation.

Do not simply add audio extensions to image-only helpers in a way that lets an audio file pass image APIs.

Recommended structure:

- shared safe upload-path containment utilities,
- image canonical/validation rules remain image-only,
- audio canonical/validation rules accept only the chosen audio formats,
- a singleton SQLite `music_settings` record stores public metadata/reference, not audio bytes.

Suggested persisted shape:

```ts
type MusicSettings = {
  enabled: boolean;
  src: string | null;
  title: string;
  loop: boolean;
};
```

Do not store a client volume preference in SQLite in v1; device/browser volume behavior is not consistent enough across mobile platforms to make that a reliable global setting.

## Audio formats and limits
Choose a deliberately small supported set based on actual browser compatibility. Recommended v1 baseline:

- MP3 (`audio/mpeg`) required.
- M4A/AAC may be accepted if validation + public MIME serving are covered by tests.
- OGG may be optional because Safari support is weaker than MP3.

Set an explicit server-side size limit suitable for one wedding track (for example 25–30 MiB) and document the final value. Validate MIME + extension consistently; do not trust only the browser-provided filename.

## Public serving requirement
The existing `/uploads/[filename]` route is image-oriented and currently reads the complete file before returning it. Audio needs correct MIME handling and practical seeking/playback behavior.

- [ ] Extend/refactor upload serving so approved audio files return the correct `Content-Type`.
- [ ] Implement HTTP byte-range (`Range`) support for audio or provide an equivalent streaming-safe route, returning `206 Partial Content` and `Accept-Ranges: bytes` where appropriate.
- [ ] Preserve immutable caching for canonical uploaded files.
- [ ] Keep realpath/path-containment checks; audio must not weaken traversal/symlink protections.
- [ ] Unknown extensions remain 404.

## Admin files / API
Expected files (final factoring may differ):

- Create: `src/lib/music-store.ts`
- Create: `src/lib/music-store.test.ts`
- Create: `src/lib/audio-validation.ts`
- Create or refactor: audio upload helper(s) under `src/lib/`.
- Create: `src/app/api/admin/music/route.ts` for authenticated GET/PUT/upload/delete behavior, or split upload/settings endpoints if cleaner.
- Modify: `src/components/admin-appearance-editor.tsx`
- Modify: `src/components/admin-appearance-editor.module.css`
- Modify: `src/app/admin/appearance/page.tsx` as needed.
- Modify/refactor: `src/app/uploads/[filename]/route.ts` and tests.
- Update README/README.vi/DEPLOYMENT backup notes if needed.

## Admin UX requirements
- [ ] Show current track title/file state.
- [ ] Upload a new track.
- [ ] Replace the current track safely.
- [ ] Remove track with confirmation.
- [ ] Enable/disable background music without deleting the file.
- [ ] Toggle loop if retained as an admin option; default enabled.
- [ ] Include an admin preview/play button without saving unrelated theme/font pending changes accidentally.
- [ ] Failed upload/save keeps the previous working track.
- [ ] Replacing/removing a saved track eventually cleans the old audio file without touching image assets.

## Public player UX
- [ ] Add one compact floating music control that does not cover RSVP/buttons on mobile.
- [ ] Control has an accessible label that changes between play/pause state.
- [ ] Do not hide the only control behind hover.
- [ ] Music-disabled/no-track state renders no dead control.
- [ ] Playback continues while scrolling through the one-page invitation.
- [ ] Loop works when enabled.
- [ ] A failed/deleted audio resource does not break the invitation; player can fall back to disabled/error-safe state.
- [ ] Theme colors keep the control readable across all five themes.
- [ ] Respect reduced-motion for any decorative spinning/pulsing music icon; audio itself is not automatically disabled by reduced-motion.

## Tests
- [ ] Store default/persistence/replace/remove behavior.
- [ ] Admin auth rejects music mutation when unauthenticated.
- [ ] Reject disallowed type and oversized audio.
- [ ] Accept a valid small MP3 fixture.
- [ ] Public upload route returns correct audio MIME and byte-range response.
- [ ] Appearance admin renders current music and performs upload/enable/disable actions.
- [ ] Public player is absent when disabled/no track and present when enabled.
- [ ] Playwright uploads/selects a test track, opens `/` and `/moi/demo`, starts playback via user gesture, verifies the control state, and restores previous music state.
- [ ] Playwright artifacts include screenshots with the music control on mobile.

## Done when
The admin can safely manage one persistent wedding track and guests can explicitly play/pause looping background music without autoplay-policy failures or broken mobile layout.

---

# Audit Item 4 — Clean up orphaned uploads

## Problem
Upload endpoints can write canonical files into `MEDIA_UPLOAD_DIRECTORY` before the final content/settings save. If an admin uploads an image or audio file and closes/reloads the page before saving, that file can remain unreferenced indefinitely.

Client-only cleanup on unload is not reliable enough; server-side reconciliation is required.

## Architecture decision
Implement a conservative **unreferenced canonical upload prune** that understands all persistent upload references.

Referenced uploads are the union of:

1. all `media_assets.src` rows,
2. all saved milestone `imageSrc` values in current invitation content, and
3. the active/saved music track reference from `music_settings` when present.

Only application-generated canonical upload filenames may be considered for automatic deletion. Never delete arbitrary files in the upload directory.

Use an age grace period (recommended: 24 hours) so an in-progress upload/save cannot be pruned by another request.

## Files
- Modify/refactor: `src/lib/media-upload.ts` / shared upload path helpers.
- Create: `src/lib/media-prune.ts`
- Create: `src/lib/media-prune.test.ts`
- Modify: `src/app/api/admin/content/image/route.ts`
- Modify: `src/app/api/admin/content/route.ts` as appropriate.
- Modify music upload/settings mutation paths from Audit Item 6.
- Optionally create a maintenance script such as `scripts/media-prune.ts` if manual VPS cleanup is useful; if added, document it in README/DEPLOYMENT.

## Requirements
- [ ] Enumerate only known canonical generated image/audio filenames.
- [ ] Build the referenced set from media metadata, invitation milestone content, and music settings.
- [ ] Never delete a referenced media asset, saved milestone image, or active/saved wedding audio track.
- [ ] Never delete a file younger than the configured grace period.
- [ ] Ignore unknown/non-canonical files rather than attempting to manage them.
- [ ] Cleanup failures do not cause a successful content/music save to be rolled back after persistence has committed.
- [ ] Run pruning from a bounded admin-side lifecycle point (for example after successful content/music save and/or before/after a new admin upload), not on every public page request.
- [ ] Log/report enough information for manual diagnosis without exposing filesystem paths to browsers.

## Tests
- [ ] Old unreferenced canonical image is removed.
- [ ] Old unreferenced canonical audio is removed.
- [ ] Recent unreferenced file is retained.
- [ ] File referenced by `media_assets` is retained.
- [ ] File referenced by milestone content is retained.
- [ ] File referenced by music settings is retained.
- [ ] Non-canonical file is ignored.
- [ ] Missing upload directory is harmless.

## Done when
Abandoned uploads cannot grow indefinitely, while all referenced wedding images and music remain protected.

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
- `/admin/appearance` can manage theme, font, and wedding music without cross-saving unrelated pending values incorrectly.
- Existing production content is preserved after the schema migration.
- `/` renders updated event/story copy and milestone crop.
- `/moi/[code]` renders personalized guest + RSVP copy correctly.
- Old milestone images remain visible after migration.
- Full-page mobile scrolling is visibly smooth with realistic media loaded.
- Reduced-motion mode remains usable.
- Music play/pause works after an explicit user gesture on mobile and desktop.
- Upload cleanup does not remove active gallery/hero/portrait/venue/milestone images or the active wedding track.
- Mobile has no horizontal overflow introduced by editor/crop/music controls.

# Explicitly out of scope for this plan

Do not expand this audit plan into unrelated work:

- SEO/dynamic root metadata/Open Graph improvements.
- Automatic VPS deployment/CD or branch protection.
- Custom/free-form color picker or custom CSS.
- Arbitrary uploaded fonts or font URLs.
- Heading/body font pairing, font sizing, or letter-spacing controls.
- Per-guest/per-section themes, fonts, or music.
- Playlist/multiple-track queue, Spotify/YouTube embedding, or remote music URLs.
- Custom smooth-scroll engine or heavy animation framework without a measured need.
- New invitation layout/template system.

Those may be planned separately after these seven accepted audit items are complete.

# Completion protocol for future AI

For every implemented audit item:

1. Read this plan and the related feature plan(s) before editing.
2. Read current `main`; do not assume file state from old plan text.
3. Add/update tests with the implementation.
4. Push a clearly named milestone commit to `main` only after source changes are coherent.
5. Update the relevant section in **this file** with `✅ Implemented`, commit SHA(s), measured findings when relevant, and any architecture deviation.
6. Let GitHub Actions verify unit/lint/build/E2E; do not claim success before the final HEAD workflow is green.
7. For Audit Item 7, record the measured scroll-performance cause and before/after verification rather than only saying `optimized`.
8. At the end, change `## Status` to `Implemented` and leave any intentionally deferred cleanup explicitly documented.

## Final done-when summary

- [ ] Invitation content has explicit schema versioning + tested migrations.
- [ ] Remaining normal-state public event/RSVP copy is editable from `/admin/edit`.
- [ ] `/admin` no longer duplicates venue/date editing.
- [ ] Love-story milestone images support focus/zoom crop metadata and preview.
- [ ] Public invitation scroll performance has been profiled and the measured jank source(s) fixed.
- [ ] Admin can upload/manage one wedding background track and public pages expose a browser-safe play/pause control.
- [ ] Old abandoned canonical image/audio uploads are safely pruned without touching referenced media/music.
- [ ] Unit tests, lint, build, Playwright E2E, screenshots/artifacts all pass on final HEAD.