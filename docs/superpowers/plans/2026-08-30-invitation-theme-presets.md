# Invitation Theme Presets Implementation Plan

## Status
Planned and reviewed on 2026-08-30. Not implemented yet.

This plan is intentionally separate from `invitation_content`: copy/content and visual appearance should remain independent so future appearance work does not make the content schema harder to evolve.

## Review notes
A second-pass architecture review was completed after the first draft. The following decisions are now explicit requirements rather than implementation suggestions:

1. **The current design is the exact baseline.** `ivory-gold` should copy the current CSS variable/literal palette into tokens before any aesthetic cleanup. Refactoring must not be used as an excuse to subtly redesign the default invitation.
2. **Theme tokens need dedicated action/footer/hero/focus roles.** Do not overload `ink` or `inverseText` as button/footer surfaces, especially for the dark preset. The registry must include explicit `actionSurface`, `actionText`, `footerSurface`, `heroText`, and `focusRing` tokens.
3. **The full personalized page must be themed.** Personal cover and RSVP live outside the shared `Invitation` component today; a theme implementation that changes only `Invitation` is incomplete.
4. **Public CSS needs a full literal-color audit.** Existing root variables cover only part of the visual system. Hero gradients, section surfaces, portrait gradients, footer, inputs/buttons, borders/overlays and media states must be included.
5. **Preview must never persist.** A pending theme may be rendered through a validated preset-ID override, but previewing cannot mutate SQLite or content/media state.
6. **Admin stays visually stable.** Wedding themes are scoped to public invitation wrappers only; `/admin` must not inherit the selected wedding palette.
7. **Dark-theme viewport coverage must be checked.** The themed wrapper must cover the full viewport so dark themes do not reveal the default ivory body between sections or during normal scrolling. Mobile overscroll/bounce should be manually inspected.
8. **Contrast is a shipping gate.** Key text/action token pairs should be tested from the TypeScript registry; failures require palette changes, not lower thresholds.

## Goal
Add a safe theme picker for the wedding invitation so an admin can switch the entire public invitation between curated visual presets without editing CSS, while preserving readability, mobile behavior, uploaded media, RSVP behavior, and the current design as the default.

The first version is preset-only. It must not accept arbitrary CSS or unrestricted color values.

## Product decisions

### v1 behavior
- Add a new top-level admin area: **Giao diện** at `/admin/appearance`.
- Ship 5 curated presets:
  1. `ivory-gold` — current warm ivory/champagne design; this is the default and must preserve the current invitation palette/layout as the regression baseline.
  2. `blush-rose` — soft blush, rose accent, warm dark text.
  3. `sage-garden` — cream/sage botanical palette.
  4. `burgundy-cream` — cream surfaces with restrained burgundy accents.
  5. `midnight-gold` — dark navy/charcoal surfaces with warm gold accents and light text.
- Theme selection is global for the wedding site. `/` and every `/moi/[code]` invitation use the same persisted theme.
- Selecting a preset in admin changes only the pending selection. Persistence happens only after the admin explicitly clicks **Lưu giao diện**.
- Each preset card shows name, short description, color swatches, selected state, and a preview action.
- Reuse the existing invitation preview dialog for mobile/desktop preview.
- Keep uploaded images, crop/focus metadata, invitation content, guest links, and RSVP data unchanged when switching themes.

### Explicitly out of scope for v1
- Free-form color picker.
- Custom CSS.
- Per-guest themes.
- Per-section themes.
- Font family picker.
- Layout/template picker.
- Changing photos based on theme.
- Automatic dark/light theme based on device preference.

A future v2 may add a constrained custom palette after presets are stable. That should be built on the same appearance/token architecture rather than bypassing it.

## Current-state constraints

The current public invitation is not fully themeable yet:
- `src/app/globals.css` defines core variables such as `--ivory`, `--paper`, `--champagne`, `--champagne-deep`, `--ink`, `--muted`, and `--sage`.
- Several public sections still use literal colors/gradients directly, including hero gradient stops, couple-section background, portrait gradients, event background, footer colors, personal invitation cover, RSVP form surfaces/buttons, and border/overlay colors.
- `src/components/invitation.tsx` renders the common invitation but has no appearance/theme input.
- `src/components/personal-invitation.tsx` renders additional personal-cover and RSVP UI outside the common invitation, so theme scoping must include those sections too.
- Admin currently has only `dashboard` and `edit` top-level tabs.
- SQLite already backs admin settings/content/media, so appearance should use the same database and existing backup flow.

The implementation must first create a complete public color-token boundary. A theme picker that only overrides the existing seven root variables is not considered complete.

## Architecture

### 1. Theme registry
Create `src/config/invitation-themes.ts` as the single source of truth for available presets.

Suggested types:

```ts
export type InvitationThemeId =
  | "ivory-gold"
  | "blush-rose"
  | "sage-garden"
  | "burgundy-cream"
  | "midnight-gold";

export type InvitationThemeTokens = {
  canvas: string;
  paper: string;
  alternate: string;
  eventSurface: string;
  ink: string;
  muted: string;
  accent: string;
  accentStrong: string;
  botanical: string;
  inverseText: string;
  footerSurface: string;
  footerMuted: string;
  inputSurface: string;
  actionSurface: string;
  actionText: string;
  focusRing: string;
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  heroOverlay: string;
  heroText: string;
  groomPortraitStart: string;
  groomPortraitEnd: string;
  bridePortraitStart: string;
  bridePortraitEnd: string;
  borderSoft: string;
  borderStrong: string;
  portraitLine: string;
  portraitSymbol: string;
};

export type InvitationThemeDefinition = {
  id: InvitationThemeId;
  name: string;
  description: string;
  swatches: readonly string[];
  tokens: InvitationThemeTokens;
};
```

Keep actual preset colors in this registry rather than duplicating palette values across TypeScript and CSS. This gives the admin cards, renderer, and tests one source of truth.

Add helpers such as:
- `invitationThemes`
- `defaultInvitationThemeId = "ivory-gold"`
- `isInvitationThemeId(value)`
- `getInvitationTheme(id)`
- `themeCssVariables(theme)`

`themeCssVariables()` maps the registry tokens to scoped custom properties used by public CSS. It should return only values from a known registry definition. The React typing can use a narrow `CSSProperties & Record<\`--invitation-${string}\`, string>` helper rather than accepting arbitrary runtime style keys.

### 2. Theme scope component
Create a small shared component such as `src/components/invitation-theme-scope.tsx`.

Responsibilities:
- Accept a validated `themeId`.
- Resolve the preset from the registry.
- Apply `data-invitation-theme="<id>"` for debugging/testing.
- Apply the preset's CSS custom properties to one wrapper using an inline style object.
- Provide `min-height: 100svh` and the theme canvas as the wrapper background so the selected theme owns the visible public viewport.
- Never inject arbitrary CSS strings from request/user input; only registry values are allowed.

The theme variables must inherit through all public invitation sections.

Do not apply the selected wedding theme to `/admin`. Admin should remain visually stable and neutral regardless of the public invitation theme.

### 3. Public CSS tokenization
Refactor public invitation colors in `src/app/globals.css` (or move the public-theme overrides into a dedicated `src/app/invitation-theme.css` imported after `globals.css`) so all theme-sensitive public colors come from variables inherited from the theme scope.

For a low-risk migration:
- First inventory every literal color in public invitation selectors and record its exact current value in `ivory-gold` tokens.
- The existing root variables may remain as admin/fallback values.
- Inside the invitation scope, alias/override the existing variables from the new theme token set so current selectors continue to work where possible.
- Replace remaining public literal theme colors with dedicated variables.
- Do not refactor unrelated spacing, typography, sizing, or layout in the same milestone.

At minimum cover:
- page/canvas background
- paper/card surfaces
- alternate couple/personal-cover surface
- event surface
- hero gradient start/middle/end
- hero media overlay/legibility layer
- hero text when an uploaded image is present
- body/heading text
- muted text
- accent and strong accent
- floral/botanical color
- soft and strong borders
- footer surface, inverse/footer text and footer secondary text
- RSVP input surface
- RSVP primary action surface/text
- focus ring
- groom portrait gradient
- bride portrait gradient
- portrait decorative lines/symbols
- timeline marker/background behavior
- link underline/border treatments

Do not theme semantic success/error states purely for aesthetics. RSVP/admin error and success messages must keep accessible semantic colors unless a theme-specific replacement has verified contrast and meaning.

### 4. Appearance persistence
Add a singleton SQLite table in the central schema in `src/lib/sqlite.ts`:

```sql
CREATE TABLE IF NOT EXISTS appearance_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  theme_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

No destructive migration is required. Existing databases get the table through `CREATE TABLE IF NOT EXISTS`.

Create `src/lib/appearance-store.ts` with:
- `type AppearanceSettings = { themeId: InvitationThemeId }`
- `getAppearanceSettings()`
- `updateAppearanceSettings(input)`

Rules:
- If no row exists, return `ivory-gold` without requiring a seed migration.
- Reject unknown theme IDs.
- Never silently persist an unknown/future ID.
- If a previously stored ID is no longer in the registry, safely fall back to `ivory-gold` for rendering and surface a recoverable state in admin rather than crashing the public site.

Because this table is in the existing SQLite database, current backup/restore scripts automatically include appearance settings. No new backup mechanism or environment variable should be introduced.

### 5. Protected admin API
Add `/api/admin/appearance`.

`GET`
- Require admin session using existing admin-route helpers.
- Return `{ appearance }`; preset metadata should normally come from the shared registry/server props rather than being duplicated in API payloads.
- Use `Cache-Control: no-store`.

`PUT`
- Require admin session before parsing/mutating.
- Accept exactly `{ themeId }`.
- Validate against known preset IDs.
- Persist singleton appearance settings.
- Return `{ appearance }`.
- Invalid IDs return 400 with a Vietnamese message.
- Unexpected persistence failures return 500 without leaking internals.

No public write API is needed.

### 6. Public route integration
Server-load the persisted appearance for both public surfaces:
- `/`
- `/moi/[code]`

Pass the resolved theme into the shared theme scope so the public invitation and personalized RSVP sections inherit the same variables.

Important details:
- The personalized cover and RSVP section are currently outside the common `Invitation` component; wrap the full personalized experience, not only the inner common invitation.
- Avoid nested `<main>` regressions when introducing the wrapper. The theme scope should render a neutral `<div>` wrapper.
- Ensure personalized routes do not retain a stale theme after an admin saves a new one. If necessary, mark the route dynamic consistently with the home route.
- Theme changes must not affect invitation lookup, RSVP deadline logic, guest count, or RSVP submission contracts.
- On dark themes, inspect normal scrolling and mobile overscroll/bounce for flashes of the root ivory background. If the wrapper alone cannot prevent a visible flash, solve that as a rendering/background issue without applying the wedding palette to admin pages.

### 7. Admin navigation and page
Extend `AdminTabs` from:
- Khách mời
- Chỉnh thiệp

to:
- Khách mời
- Chỉnh thiệp
- **Giao diện**

Add protected page `src/app/admin/appearance/page.tsx`.

The page should server-load current appearance settings and render a client editor such as `AdminAppearanceEditor`.

### 8. Admin appearance editor UX
Create `src/components/admin-appearance-editor.tsx` plus a CSS module.

Layout:
- Heading: `Giao diện thiệp`
- Short note that a theme applies to both the public invitation and all guest links.
- Responsive preset-card grid.
- Each card contains:
  - preset name
  - one-sentence description
  - 4–6 representative swatches
  - selected indicator using both icon/text and border (not color alone)
  - `Xem trước` action
- Sticky or clearly visible footer action area:
  - `Lưu giao diện`
  - dirty-state indicator such as `Chưa lưu`
  - success/error live region

Interaction rules:
- Clicking/selecting a card updates local pending state only.
- Save button is disabled when pending theme equals persisted theme or while saving.
- On successful save, persisted state updates and success copy appears.
- On failed save, pending selection stays so the admin can retry.
- Navigating/reloading without save retains the previously persisted theme.

### 9. Preview behavior
Reuse `InvitationPreviewDialog` rather than creating a second iframe/modal system.

Preview must work before saving.

Recommended mechanism:
- Add a validated cosmetic query override such as `previewTheme=<known-id>` to the preview URL.
- The server may render that known preset for the request without persisting it.
- Unknown values are ignored/fall back safely to the persisted/default theme.
- Only registry IDs are accepted; never accept raw colors or CSS through the query string.
- The override must not alter SQLite, invitation content, media, guest data, or RSVP data.

For best coverage:
- If an active invitation exists, let the appearance page preview a personalized invitation URL so the personal cover + RSVP section are visible under the pending theme.
- Otherwise preview `/`.
- Keep the existing Mobile/Desktop controls.

It is acceptable that a public user could manually append a known `previewTheme` value because it is a non-persistent cosmetic override containing no sensitive data. If implementation prefers stricter isolation, an authenticated admin-only preview route is also acceptable, but do not create a second preview UI.

### 10. Preset design requirements
All five presets must preserve the same layout and component structure. Only theme tokens change.

#### Ivory Gold
- Baseline/current design.
- Exact current color values should be captured before refactor for all existing variables and literal public colors.
- Warm ivory canvas, champagne accents, brown-black ink, muted sage ornament.
- This preset is the visual regression reference.

#### Blush Rose
- Very light warm blush canvas/paper.
- Dusty rose accent with deep rose/brown accent-strong.
- Text remains dark neutral, not pink.
- Avoid low-contrast pastel-on-pastel body copy.

#### Sage Garden
- Warm cream canvas.
- Muted sage/olive accent and botanical elements.
- Dark olive-brown/charcoal text.
- Keep event/card surfaces clearly separated from canvas.

#### Burgundy Cream
- Cream canvas/paper.
- Burgundy as accent/strong accent, not as body text.
- Warm neutral alternate surfaces.
- Footer may use deep burgundy if inverse text passes contrast.

#### Midnight Gold
- Dark navy/charcoal primary canvas with distinct dark surfaces.
- Warm gold accent.
- Light main text and sufficiently distinct muted text.
- `actionSurface`, `footerSurface`, and `ink` must remain separate concepts so controls/footer are not forced into the same value as body text.
- Inputs/cards must remain visibly separated and focusable.
- Uploaded photos must not lose legibility of overlaid text; `heroOverlay` + `heroText` are especially important.

### 11. Accessibility guardrails
- Normal text contrast target: WCAG AA 4.5:1 or better.
- Large text/control boundaries: at least 3:1 where applicable.
- Focus indicators must remain visible on every preset.
- Selected theme state in admin cannot be communicated by color alone.
- RSVP radio accent, buttons, inputs, links, disabled states, and focus states must be checked in every preset.
- Hero with and without uploaded media must be checked separately.
- Do not let a theme override semantic error/success meaning.

Because preset tokens live in TypeScript, add a small contrast utility/test for the key token pairs rather than relying only on visual review. At minimum test:
- `ink` vs `canvas`
- `ink` vs `paper`
- `muted` vs `paper`
- `inverseText` vs `footerSurface`
- `actionText` vs `actionSurface`
- `heroText` against the effective hero background/overlay strategy where a static check is meaningful
- `focusRing` against the most common adjacent surfaces

If a token pair cannot meet AA while preserving the concept, adjust the palette before shipping; do not weaken the test threshold.

## Implementation sequence

### Milestone 1 — Registry and color boundary
Files expected:
- `src/config/invitation-themes.ts` (new)
- `src/components/invitation-theme-scope.tsx` (new)
- `src/app/globals.css` and/or `src/app/invitation-theme.css`
- theme registry/contrast tests

Work:
1. Inventory the exact current public palette before changing CSS.
2. Capture the current visual palette as `ivory-gold` tokens.
3. Define all semantic tokens, including hero/action/footer/focus roles.
4. Refactor every public literal theme color to token usage.
5. Render current invitation through the scope using `ivory-gold`.
6. Verify no intended visual change in the default theme.

Suggested commit: `refactor(theme): tokenize invitation palette`

### Milestone 2 — SQLite persistence and API
Files expected:
- `src/lib/sqlite.ts`
- `src/lib/appearance-store.ts` (new)
- `src/lib/appearance-store.test.ts` (new)
- `src/app/api/admin/appearance/route.ts` (new)
- `src/app/api/admin/appearance/route.test.ts` (new)

Work:
1. Add singleton table.
2. Add default/fallback/validation behavior.
3. Add protected GET/PUT API.
4. Test auth, fallback, save, invalid ID, stale stored ID, and persistence.

Suggested commit: `feat(theme): persist invitation appearance`

### Milestone 3 — Public rendering integration
Files expected:
- `src/app/page.tsx`
- `src/app/moi/[code]/page.tsx`
- `src/components/invitation.tsx` and/or `src/components/personal-invitation.tsx`
- public rendering tests

Work:
1. Load persisted appearance on both public routes.
2. Scope the full invitation including personal cover and RSVP.
3. Add validated preview-only override.
4. Ensure current theme applies on the next rendered request without requiring a rebuild.
5. Confirm no changes to public invitation or RSVP API contracts.
6. Verify dark-theme full-viewport/background behavior on mobile.

Suggested commit: `feat(theme): apply themes to public invitations`

### Milestone 4 — Admin appearance UI and preview
Files expected:
- `src/components/admin-tabs.tsx`
- `src/app/admin/appearance/page.tsx` (new)
- `src/components/admin-appearance-editor.tsx` (new)
- `src/components/admin-appearance-editor.module.css` (new)
- `src/components/admin-appearance-editor.test.tsx` (new)
- possibly a small extension to `invitation-preview-dialog.tsx` if needed for dynamic preview URL changes

Work:
1. Add Giao diện navigation.
2. Render preset cards/swatches/selected state.
3. Implement pending vs persisted state.
4. Save through protected API.
5. Preview pending selection on mobile/desktop before save.
6. Ensure preview does not mutate persisted settings.

Suggested commit: `feat(admin): add invitation theme picker`

### Milestone 5 — Full regression and polish
Work:
1. Test all five preset IDs.
2. Test unknown/stale DB theme fallback.
3. Test admin auth boundaries.
4. Test pending selection does not save automatically.
5. Test save updates persisted selection.
6. Test preview URL uses pending theme but persistence does not change.
7. Test `/` and `/moi/[code]` receive the persisted theme.
8. Verify default `ivory-gold` against current mobile and desktop layout.
9. Verify uploaded hero/groom/bride/story/venue/gallery images under every preset.
10. Verify RSVP form readability and focus states in every preset.
11. Verify dark-theme viewport/overscroll background behavior.
12. Run `npm test`, `npm run lint`, `npm run build`, and relevant browser/E2E tests.

Suggested commit: `test(theme): cover presets and appearance flow`

## Test matrix

### Store/API
- no appearance row -> `ivory-gold`
- save each valid preset -> persists and reads back
- invalid theme -> 400/no mutation
- unauthenticated GET/PUT -> 401
- stale stored ID -> safe default, public route does not crash

### Admin UI
- persisted theme initially selected
- card selection sets dirty state
- save disabled when unchanged
- save request sends only `{ themeId }`
- failed save retains pending selection
- successful save clears dirty state
- preview uses pending selection before save
- selected state has accessible text/ARIA, not only color

### Public rendering
- home gets persisted theme scope
- personalized link gets same persisted theme scope
- personal cover and RSVP inherit theme variables
- preview override changes only the rendered request
- unknown preview override falls back safely
- default theme renders exact baseline palette values
- themed wrapper covers full visible viewport

### Visual/browser
Test at minimum:
- 390×844 mobile
- 1280×800 desktop
- hero with image
- hero without image
- personalized invitation + RSVP
- all five themes
- keyboard focus through RSVP controls and admin theme picker
- normal mobile scrolling/overscroll with `midnight-gold`

## Migration and rollback
- Existing installs require only a normal application deploy; the table is created idempotently during DB initialization.
- No existing data is rewritten.
- If appearance UI is unavailable or the DB row is missing, public rendering uses `ivory-gold`.
- If a theme ID is removed accidentally in a later deploy, public rendering still falls back to `ivory-gold` rather than failing.
- Rollback to a previous app version leaves the extra SQLite table harmlessly unused.
- Backup/restore remains unchanged because appearance lives in the existing SQLite file.

## Documentation updates during implementation
When implementation is complete:
- Update this plan Status to `Implemented` with final commit(s) and runtime verification status.
- Record any palette values that had to change for accessibility in the implementation notes.
- Add a short admin/theme note to README or deployment/admin docs only if operational behavior needs explanation. No new environment variables are expected.

## Done when
- Admin has a third **Giao diện** tab with five curated theme presets.
- Admin can preview a pending theme on mobile and desktop without saving.
- Theme changes persist only after explicit save.
- `/` and all personalized invitation links use the same saved theme.
- Current `ivory-gold` remains the safe default and preserves the exact current palette/layout baseline except for changes required and documented for accessibility.
- Every theme covers the full invitation, including personal cover and RSVP, not only the shared middle sections.
- No unrestricted user-provided CSS/color value reaches the renderer.
- Key token contrast checks pass and manual keyboard/focus review is complete.
- Dark theme has no obvious ivory gaps/viewport flashes during normal mobile use.
- Existing media/content/guest/RSVP data is untouched by theme changes.
- `npm test`, `npm run lint`, `npm run build`, and relevant E2E/browser checks pass before marking this plan implemented.
