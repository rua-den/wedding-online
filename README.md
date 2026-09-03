# Huy & Nhi Wedding Invitation

[![CI](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml/badge.svg)](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml)

**English** · [Tiếng Việt](README.vi.md)

A responsive wedding invitation built with Next.js App Router. `/` is the general invitation, while each guest receives a private `/moi/<code>` link with personalized copy and RSVP. Invitations, RSVP responses, editable content, appearance settings, music settings, and media metadata are stored in SQLite.

## Features

- General invitation and personalized guest links with RSVP.
- Password-protected admin dashboard.
- Invitation CRUD, search/filter, RSVP filters, and CSV export.
- Section-based content editor at `/admin/edit`.
- Five curated color themes and eleven Vietnamese-capable font presets at `/admin/appearance`.
- Admin UI mirrors the selected invitation theme/font.
- Background MP3 upload/playback controls.
- Media manager plus non-destructive focus/zoom controls for managed media and story milestones.
- Full-viewport invitation sections with section jump controls.
- SQLite backup and CSV guest seeding scripts.
- GitHub Actions CI with unit/lint/build, Playwright E2E, visual smoke summaries, and gated ARM64 VPS CD.

## Requirements

- Node.js 22.5 or newer.
- npm.
- `better-sqlite3` in production; Node's built-in SQLite is a fallback where supported.

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

## Environment variables

Use `.env.local` locally or `.env` on the VPS:

```env
SQLITE_PATH=data/wedding.sqlite
SQLITE_BACKUP_DIRECTORY=data/backups
MEDIA_UPLOAD_DIRECTORY=public/uploads
ADMIN_PASSWORD_HASH=scrypt\$generated-salt\$generated-digest
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000
```

Generate admin credentials:

```bash
npm run admin:password -- 'a-long-private-password'
openssl rand -base64 48
```

Never commit real credentials.

## Admin areas

`/admin` manages invitation links, RSVP responses, media, and operational actions. `/admin/edit` is the single human-facing content editor. `/admin/appearance` manages the global theme, font, and background music. Theme/font previews are non-persistent until **Save appearance**; the admin UI mirrors the currently selected appearance as well.

## Media and music

Uploads are served by `/uploads/<filename>` at runtime. Keep `MEDIA_UPLOAD_DIRECTORY` on persistent storage. SQLite stores references and crop/focus metadata; the uploaded image/audio bytes live in the upload directory.

Back up both SQLite and uploads.

## Database, seed, and backup

```bash
npm run db:init
npm run db:seed -- data/guests.csv
npm run db:backup
```

`db:backup` checkpoints the SQLite WAL before creating a timestamped backup.

## Tests and CI

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

GitHub Actions runs unit tests, lint, build, and Playwright Chromium E2E for pushes to `main` and pull requests. Successful `main` runs publish a visual smoke summary directly in the Actions run.

## VPS CI/CD

Production is Node.js + PM2 + Nginx on an Oracle ARM64 VPS. CD is intentionally gated by the repository variable `CD_ENABLED`.

When enabled, a successful `main` CI run:

1. rebuilds a Next.js standalone release on GitHub's ARM64 runner;
2. smoke-tests that ARM64 artifact;
3. uploads it to the VPS over strict-host-key SSH;
4. switches an immutable `current` release symlink;
5. reloads PM2;
6. checks localhost health;
7. automatically rolls back on health-check failure.

SQLite, `.env`, backups, uploaded images, and music stay under persistent `shared/` storage and are never replaced by a code release. The VPS no longer needs to run `npm ci` or `npm run build` for normal CD deployments.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the one-time shared-storage bootstrap, GitHub `production` environment secrets/variables, first manual deploy, automatic deploy enablement, and rollback instructions.
