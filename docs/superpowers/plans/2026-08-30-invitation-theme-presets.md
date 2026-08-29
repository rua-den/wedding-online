# Invitation Theme Presets Implementation Plan

## Status
Implemented on `main` on 2026-08-30. Source-level tests and a second implementation review were added. Runtime verification is still required with `npm test`, `npm run lint`, `npm run build`, and browser/mobile checks after pulling the latest `main`.

## Goal
Add a safe global theme picker for the wedding invitation without allowing arbitrary CSS/colors, while preserving the current design as the default, keeping admin visually stable, and applying the selected appearance to both `/` and every `/moi/[code]` guest invitation.

## Product decisions
- v1 is preset-only; no free-form color picker or custom CSS.
- Five presets ship in v1:
  - `ivory-gold` — exact baseline/current palette.
  - `blush-rose`.
  - `sage-garden`.
  - `burgundy-cream`.
  - `midnight-gold`.
- Theme is global, not per guest or per section.
- Selecting a theme in admin is pending only until **Lưu giao diện** is clicked.
- Preview never persists data.
- Uploaded media/crops, invitation content, guest links and RSVP records are independent from theme selection.
- Admin pages do not inherit the wedding palette.

## Architecture implemented

### Theme registry
`src/config/invitation-themes.ts`
- Single source of truth for theme IDs, labels, swatches and semantic tokens.
- Includes dedicated canvas/paper/alternate/event surfaces; ink/muted/accent colors; footer/action/focus roles; portrait colors; media fallback colors; gallery/lightbox colors; hero-with-media colors; and accessible success/error colors.
- `ivory-gold` captures the existing public palette as the regression baseline.
- Helpers: `invitationThemes`, `defaultInvitationThemeId`, `isInvitationThemeId()`, `getInvitationTheme()`, `themeCssVariables()`.

`src/config/invitation-themes.test.ts`
- Verifies important baseline colors.
- Enforces WCAG AA 4.5:1 for key body, muted, action, footer, success and error pairs.

### Public theme scope
`src/components/invitation-theme-scope.tsx`
- Accepts only a validated registry theme ID.
- Applies `data-invitation-theme` and generated CSS variables to a neutral `<div>`.
- Does not inject arbitrary user CSS.

`src/app/invitation-theme.css`
- Imported after `globals.css`.
- Scopes theme overrides under `.invitation-theme-scope`, leaving admin unchanged.
- Covers public section surfaces, hero gradients, portrait states, borders, footer, RSVP controls, gallery/lightbox, media fallbacks and uploaded hero overlays.
- Adds full-viewport themed background coverage to reduce ivory flashes on dark themes.

### SQLite persistence
`src/lib/sqlite.ts`
- Adds singleton `appearance_settings` table through `CREATE TABLE IF NOT EXISTS`.
- Existing DB backup/restore automatically includes it.

`src/lib/appearance-store.ts`
- Defaults to `ivory-gold` when no row exists.
- Persists only known theme IDs.
- If an old/removed theme ID exists, public rendering safely falls back to `ivory-gold` and admin receives a recoverable warning state.
- `resolveAppearanceThemeId()` allows only known preview IDs and never persists preview overrides.

`src/lib/appearance-store.test.ts`
- Covers default, persistence, invalid stored theme fallback and non-persistent preview override.

### Protected admin API
`src/app/api/admin/appearance/route.ts`
- `GET` requires admin session and returns `{ appearance }` with no-store behavior.
- `PUT` requires admin session, accepts exactly `{ themeId }`, rejects unknown IDs/extra fields, persists the singleton and returns `{ appearance }`.

`src/app/api/admin/appearance/route.test.ts`
- Covers authentication, default/read/save behavior, unknown theme rejection and extra-field rejection.

### Public route integration
`src/app/page.tsx`
`src/app/moi/[code]/page.tsx`
- Both are dynamic and load the persisted theme on each request.
- Both accept cosmetic `previewTheme=<known-id>` override without writing SQLite.
- The entire personalized guest experience is inside the theme scope, so personal cover + shared invitation + RSVP all use the same theme.

`src/app/page.test.tsx`
- Updated from the old synchronous/settings-only assumptions.
- Covers persisted content + appearance and non-persistent preview override.

### Admin appearance UX
`src/components/admin-tabs.tsx`
- Adds **Giao diện** navigation.

`src/app/admin/appearance/page.tsx`
- Protected by the existing admin session.
- Loads current appearance.
- Uses an active personalized invitation for preview when one exists; otherwise previews `/`.

`src/components/admin-appearance-editor.tsx`
`src/components/admin-appearance-editor.module.css`
- Responsive preset cards with text labels, swatches and non-color-only selected state.
- Pending vs persisted state.
- **Lưu giao diện** disabled when nothing changed, except when repairing an invalid stored theme.
- Preview uses the existing `InvitationPreviewDialog` with mobile/desktop controls.
- Failed saves keep pending selection for retry.
- Removed-theme recovery can save the safe fallback and clear the warning.

`src/components/admin-appearance-editor.test.tsx`
- Covers pending-before-save behavior.
- Covers preview without API persistence.
- Covers removed-theme recovery.

## Review findings resolved during implementation
1. The initial public color audit was incomplete: gallery, media fallback and uploaded-hero colors lived later in `globals.css`. They are now covered by theme tokens/overrides.
2. Fixed success/error colors did not have sufficient contrast on `midnight-gold`; semantic theme tokens now preserve meaning while meeting contrast requirements.
3. A removed stored theme initially produced a fallback that could not be re-saved because the UI considered it clean. Dirty-state logic now treats that recovery condition as unsaved.
4. The legacy `src/app/page.test.tsx` still assumed the pre-content-editor `settings` prop and synchronous `Home()` call. It was updated to the current architecture.
5. Dark-theme canvas coverage uses the theme wrapper/background rather than changing global admin body colors.

## Explicitly out of scope for v1
- Free-form color picker.
- Custom CSS.
- Per-guest or per-section themes.
- Font/layout/template picker.
- Theme-specific photo sets.
- Automatic system light/dark switching.

A future constrained custom palette should extend the same token/appearance store architecture rather than bypassing the preset registry.

## Runtime verification checklist
After pulling latest `main`:

```bash
npm test
npm run lint
npm run build
```

Then manually verify:
- `/admin/appearance` requires login.
- All five cards render and can be selected.
- Preview Mobile/Desktop changes theme without saving.
- Reload before save retains the old persisted theme.
- Save persists theme across `/` and `/moi/[code]`.
- `ivory-gold` visually matches the previous/current design.
- Each theme is checked with and without uploaded hero media.
- Gallery lightbox and media fallback states match the theme.
- RSVP inputs/buttons/status text remain legible.
- `midnight-gold` has no obvious ivory flashes during normal mobile scrolling/overscroll.
- Admin/dashboard/editor pages remain on the original admin palette.

## Done when
- Theme persistence/API/admin/public integration works. ✅ source implemented
- Five presets + preview exist. ✅ source implemented
- Public literal-color boundary includes gallery/media states. ✅ source implemented
- Contrast guard tests exist. ✅ source implemented
- Invalid stored-theme recovery exists. ✅ source implemented
- `npm test`, `npm run lint`, `npm run build` pass. ⏳ runtime verification required
- Mobile/desktop visual QA for all five themes passes. ⏳ manual verification required
