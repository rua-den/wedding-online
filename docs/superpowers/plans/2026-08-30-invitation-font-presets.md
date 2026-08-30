# Invitation Font Presets Extension

## Status
Implemented on `main` on 2026-08-30. Final CI verification is tracked by the repository GitHub Actions workflow.

## Goal
Extend the existing global invitation appearance picker so the admin can choose a wedding-oriented display font independently from the color theme, while preserving the existing Georgia typography as the default and keeping Vietnamese diacritics fully supported.

## Product decisions
- Font choice is global for `/` and every `/moi/[code]` invitation.
- Font and color theme are independent settings and save together through the existing **Lưu giao diện** action.
- Preview accepts `previewFont=<known-id>` and never persists the override.
- Functional/small UI copy that already uses sans-serif remains sans-serif for readability; the selected font controls the invitation's main inherited serif/display typography.
- No arbitrary font URL, uploaded font file, or custom CSS is accepted.

## Font registry
`src/config/invitation-fonts.ts`

Presets:
1. `classic-serif` — Georgia / Times fallback; exact previous behavior and default.
2. `cormorant-garamond` — elegant wedding/display serif.
3. `playfair-display` — high-contrast display serif.
4. `lora` — softer serif suitable for longer invitation/story copy.
5. `noto-serif-display` — broad Vietnamese support and strong mobile readability.

The four webfont families are loaded through `next/font/google` in `src/app/layout.tsx`, using Latin + Vietnamese subsets and CSS variables. Google Fonts metadata for these families declares the Vietnamese subset.

## Persistence and API
- `appearance_settings` now includes `font_id TEXT NOT NULL DEFAULT 'classic-serif'`.
- Existing databases are migrated idempotently by `migrateAppearanceFontColumn()`.
- `AppearanceSettings` contains both `themeId` and `fontId`, with safe fallback/recovery for removed preset IDs.
- `PUT /api/admin/appearance` accepts exactly `{ themeId, fontId }` and validates both against registries.

## Public rendering
- `InvitationThemeScope` also accepts `fontId`, emits `data-invitation-font`, and sets `--invitation-font-display`.
- `src/app/invitation-theme.css` applies that variable to the invitation scope.
- `/` and `/moi/[code]` resolve persisted or preview theme/font settings on every request.

## Admin UX
`/admin/appearance` now contains separate **Màu sắc** and **Font chữ** sections.
- Each font card includes Vietnamese sample copy.
- Theme/font selections remain pending until save.
- Preview combines the pending theme and font.
- Invalid stored theme/font values can be repaired by saving safe fallbacks.

## Test coverage
- Store: default, persistence, preview overrides, removed preset fallback.
- API: authentication, valid theme/font persistence, strict invalid/extra-field rejection.
- Component: pending state, save payload, combined preview, Vietnamese sample copy, recovery state.
- Page tests: persisted and preview font propagation on `/` and `/moi/[code]`.
- Playwright: admin selects Cormorant Garamond, saves it, public scope applies it, then the test restores the previous appearance setting.

## Still out of scope
- Uploading arbitrary font files.
- Arbitrary Google Fonts/custom font URLs.
- Per-section or per-guest fonts.
- Separate heading/body font pairing controls.
- Font size/letter-spacing controls.
