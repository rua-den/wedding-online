# Huy & Nhi Wedding Invitation

[![CI](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml/badge.svg)](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml)

**English** · [Tiếng Việt](README.vi.md)

A responsive wedding invitation built with Next.js App Router. The public home page is the general invitation, while each guest receives a private `/moi/<code>` link with personalized copy and RSVP. Invitations, RSVP responses, editable content, appearance settings, and media metadata are stored in SQLite.

## Features

- General wedding invitation at `/`.
- Personalized guest links at `/moi/<code>` with RSVP.
- Password-protected admin dashboard at `/admin`.
- Invitation management: create, edit, enable/disable, permanently delete, search, and filter links.
- RSVP dashboard with attendance filters and CSV export.
- Section-based invitation content editor at `/admin/edit`.
- Global invitation theme picker at `/admin/appearance` with five curated presets and mobile/desktop preview.
- Media manager for hero, bride/groom portraits, story, venue, and gallery images.
- Non-destructive image focus/zoom metadata stored in SQLite.
- SQLite backup and CSV guest seeding scripts.
- VPS deployment with Node.js, PM2, and Nginx.

## Requirements

- Node.js 22.5 or newer.
- npm.
- `better-sqlite3` is used in production. The code can fall back to Node's built-in `node:sqlite` in supported environments when the native package is unavailable.

## Quick start

```bash
npm ci
cp .env.example .env.local
npm run db:init
npm run dev
```

Open:

- `http://localhost:3000/` — general invitation.
- `http://localhost:3000/moi/demo` — development demo guest link.
- `http://localhost:3000/admin` — admin dashboard.

The `demo` invitation is seeded only in development when it does not already exist.

## Environment variables

Create `.env.local` for local development or `.env` on the VPS from [`.env.example`](.env.example):

```env
SQLITE_PATH=data/wedding.sqlite
SQLITE_BACKUP_DIRECTORY=data/backups
MEDIA_UPLOAD_DIRECTORY=public/uploads
ADMIN_PASSWORD_HASH=scrypt\$generated-salt\$generated-digest
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000
```

Generate the admin password hash and session secret:

```bash
npm run admin:password -- 'a-long-private-password'
openssl rand -base64 48
```

The password command prints an `ADMIN_PASSWORD_HASH=...` line that is already escaped for a Next.js `.env` file. Copy that line exactly; do not remove or double-escape the backslashes. Never commit real password hashes or session secrets.

## Admin areas

### Guest links and RSVP

`/admin` manages invitation links and responses. Invitation rows can be searched and filtered by active, disabled, responded, or pending status. Use **Disable** when you want to preserve RSVP history. **Delete** is permanent and also removes the linked RSVP after a confirmation warning.

### Invitation content

`/admin/edit` edits the wedding invitation by section, including couple information, cover copy, countdown labels, love-story milestones, event details, gallery copy, personalized invitation/RSVP copy, and footer text. Changes are stored in SQLite and apply to both the general and personalized invitations.

### Appearance themes

`/admin/appearance` provides five curated global themes:

- Ivory Gold — current/default design.
- Blush Rose.
- Sage Garden.
- Burgundy Cream.
- Midnight Gold.

Selecting a theme is only a pending change until **Save appearance** is clicked. Preview uses a validated cosmetic override and does not persist anything. The selected theme applies to `/` and all `/moi/<code>` invitations; the admin interface keeps its own stable appearance.

### Media

The media manager supports hero, bride/groom portraits, story, venue/map, and gallery images. Gallery assets can be reordered. Original files live in `MEDIA_UPLOAD_DIRECTORY`; SQLite stores metadata such as `focusX`, `focusY`, and `zoom`.

Image framing is non-destructive: source files are not rewritten. `/uploads/<filename>` is served by a Next.js Route Handler at runtime, so new uploads work without rebuilding the app. If uploads are stored outside the release directory, point `MEDIA_UPLOAD_DIRECTORY` at a persistent volume and keep Nginx proxying `/uploads/` to Next.js.

## Database, seed, and backup

Guest CSV files use the header `name,maxGuests`; see [`data/guests.example.csv`](data/guests.example.csv).

```bash
npm run db:init
npm run db:seed -- data/guests.csv
npm run db:backup
```

- `db:init` creates/migrates required tables without deleting existing data.
- `db:seed` creates random invitation codes and prints personalized URLs.
- `db:backup` checkpoints the WAL and creates a timestamped SQLite backup in `SQLITE_BACKUP_DIRECTORY`.

Back up both SQLite and the upload directory. SQLite stores media metadata, not the image bytes themselves.

## Tests and build

```bash
npm test
npm run lint
npm run build
```

Browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

The repository also includes GitHub Actions CI. Pushes to `main` and pull requests automatically run unit tests, lint, build, and Playwright Chromium E2E checks.

## Deployment

The intended production setup is Node.js + PM2 + Nginx on a VPS; Vercel is not required. See [DEPLOYMENT.md](DEPLOYMENT.md) for HTTPS, reverse proxy, SQLite backup/restore, PM2 reload, and rollback instructions.

A typical update is:

```bash
npm run db:backup
git pull --ff-only
npm ci
npm test
npm run lint
npm run build
npm run db:init
pm2 reload ecosystem.config.cjs --update-env
```

Keep the SQLite database and uploaded media on persistent storage across deployments and rollbacks.
