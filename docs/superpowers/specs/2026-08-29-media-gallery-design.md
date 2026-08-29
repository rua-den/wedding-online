# Media, Gallery & Invitation Preview Design

## Goal

Add the image-management and venue-editing capabilities from `D:\TestAI\loz` to the Huy & Nhi wedding site, while keeping SQLite as the local source of truth and making every invitation link preview show the invited guest's name.

## Scope

- Admin-authenticated image upload, replacement, delete, activation, and ordering.
- Media slots for `hero`, `groom`, `bride`, `story`, `venue`, plus a sortable `gallery`.
- Responsive media sections on `/` and `/moi/[code]`, including a fullscreen gallery viewer.
- Editable venue text, address, ceremony time, map URL, and optional venue/map image.
- Copyable invitation URLs and a preview action that opens the personalized invitation.
- Personalized page and metadata title/description containing the invited guest's name.
- Non-destructive focal-point and zoom controls so admin previews match the crop used by the public invitation.
- An admin full-invitation preview with mobile and desktop viewport modes.
- Local disk storage in `public/uploads/` for v1; SQLite stores metadata only.

## Out of scope

- Cloud object storage, image transformation/CDN, video, music, multi-event support, or a public gallery upload endpoint.
- Moving the existing wedding text configuration from `src/config/wedding.ts` into a full CMS. Existing text remains the fallback; venue fields may be overridden by the media/settings store when implemented.

## Data model

Extend the existing SQLite schema with:

```sql
CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY,
  slot TEXT NOT NULL CHECK (slot IN ('hero', 'groom', 'bride', 'story', 'venue', 'gallery')),
  src TEXT NOT NULL UNIQUE,
  alt TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  focus_x REAL NOT NULL DEFAULT 50 CHECK (focus_x BETWEEN 0 AND 100),
  focus_y REAL NOT NULL DEFAULT 50 CHECK (focus_y BETWEEN 0 AND 100),
  zoom REAL NOT NULL DEFAULT 1 CHECK (zoom BETWEEN 1 AND 3),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_assets_slot_order_idx ON media_assets(slot, sort_order, id);
```

Only relative `/uploads/...` paths may be created by file uploads. Existing safe absolute HTTPS URLs may be retained as fallback values. A slot can have one active image for singleton slots; gallery can contain many assets.

Existing SQLite databases are migrated idempotently by inspecting `PRAGMA table_info(media_assets)` and adding `focus_x`, `focus_y`, and `zoom` when absent. Existing rows therefore render with the centered, unzoomed defaults `50`, `50`, and `1`.

## Upload and API behavior

- `POST /api/admin/media` accepts multipart form data (`file`, `slot`, `alt`), requires the existing admin session, accepts `image/*` only, enforces a 12 MiB limit, generates a random filename, writes under `public/uploads/`, and inserts metadata.
- `GET /api/admin/media` returns metadata for the authenticated admin only.
- `PATCH /api/admin/media` updates `slot`, `alt`, `active`, `focusX`, `focusY`, or `zoom` for one asset. Crop values are finite numbers; `focusX` and `focusY` are clamped to `0..100`, and `zoom` is clamped to `1..3`.
- `PUT /api/admin/media/order` accepts an ordered list of asset IDs and rewrites `sort_order` transactionally.
- `DELETE /api/admin/media` removes the metadata and the owned file after authentication; references to missing files fall back gracefully.
- Public rendering reads only active media metadata through a server-side store; no admin-only fields or guest lists are exposed.
- Upload failures return Vietnamese JSON errors and never leave a partially inserted row.

## Public rendering

- A shared `MediaFrame` renderer owns `object-fit: cover`, focal point, zoom, overflow, and fallback behavior. Public slots and admin crop previews use this same renderer instead of duplicating crop CSS.
- Hero image is a full-bleed cover with a readable overlay.
- Groom and bride slots render portrait cards; missing slots render the existing initials/ornament fallback.
- Story slot renders an editorial image beside the timeline/copy.
- Gallery renders a responsive grid, lazy-loaded images, keyboard-accessible lightbox, previous/next controls, and an empty-state fallback.
- Venue slot renders beside the event details and map CTA; address and Google Maps URL remain text/link values.
- Both `/` and `/moi/[code]` use the same active media collection. The personalized route keeps its guest cover and RSVP behavior.

## Crop editor and live preview

- Every singleton image and gallery item in admin exposes a `Căn khung` action.
- The crop editor is non-destructive: the original upload is never rewritten. It edits local `focusX`, `focusY`, and `zoom` state, then persists those values only when `Lưu căn chỉnh` succeeds.
- The image can be repositioned by pointer drag. Three range inputs (`Ngang`, `Dọc`, `Thu phóng`) provide keyboard-accessible exact control and remain the source of truth for the editor state.
- The editor previews the real target shape for the selected slot. Hero provides `Mobile` and `Desktop` preview modes and overlays representative Huy & Nhi cover copy so the admin can detect subject/text collisions.
- Slot previews use these public shapes: hero full-bleed viewport, groom/bride portrait frame, story editorial frame, venue landscape frame, and gallery grid tile. Labels state which public section each slot controls.
- The media panel includes `Xem trước toàn bộ thiệp`, opening an embedded preview dialog. It renders `/` in a sandboxed same-origin iframe at `390 x 844` for mobile or `1280 x 800` for desktop, with a direct `Mở tab mới` link.
- After upload, replacement, deletion, reorder, or saved crop changes, the iframe is reloaded so it reflects persisted server state. Unsaved crop changes are shown only in the crop editor.
- The editor traps focus while open, closes on `Escape`, restores focus to its trigger, and respects reduced motion.

## Invitation links and previews

- Admin rows show the complete copyable URL and a `Xem trước` action.
- Preview opens `/moi/<code>` in a new tab and displays the invitation name in the cover before the shared content.
- `/moi/[code]` generates metadata from the validated invitation lookup: `Thiệp mời dành cho <guestName> | Huy & Nhi`; invalid/inactive codes use a generic safe title.
- The personalized cover remains the authoritative visible preview, and no guest name is included in URLs.

## Validation and safety

- MIME and extension are validated; generated filenames prevent path traversal and collisions.
- Maximum file size is 12 MiB; alt text is trimmed and capped at 160 characters.
- All mutating media routes require `requireAdmin` and `Cache-Control: no-store`.
- Deleting a media row only deletes files inside the resolved `public/uploads` directory.
- Missing or corrupt media never prevents the invitation page from rendering.

## Testing and acceptance

- Unit tests cover slot validation, upload filename/path safety, ordering, active-slot selection, and fallback behavior.
- Unit tests additionally cover old-schema migration, crop defaults, crop clamping, and conversion to shared media-frame styles.
- API tests cover unauthenticated access, invalid MIME/size, successful upload, update/delete, reorder persistence, and crop updates using a temporary SQLite database.
- Component tests cover image slots, gallery/lightbox controls, copyable invitation URL, preview label/name, crop controls, save/cancel behavior, and mobile/desktop full-preview modes.
- Browser tests cover admin upload/reorder/delete, public gallery and venue rendering, crop persistence, admin/public crop parity, mobile layout, and personalized metadata/cover name.
- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and the existing E2E suite must pass.
