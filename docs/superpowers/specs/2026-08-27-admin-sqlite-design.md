# Admin & SQLite Design

## Goal

Replace Google Sheets and the in-memory demo store with SQLite as the sole RSVP data source. Add a single-account admin area where Huy and Nhi can manage invitation links and monitor RSVP responses.

## Scope

Included:

- SQLite-backed invitations and RSVP records for local development and the Oracle VPS.
- A development seed for `/moi/demo` so a fresh local checkout remains testable.
- A password-protected `/admin` dashboard with invitation management, RSVP filtering, CSV export, and logout.
- Database initialization, CSV seed, and file backup commands.
- Updated deployment and environment documentation.

Excluded:

- Google Sheets import, sync, or a dashboard for wedding copy, date, venue, or images.
- Multiple admin accounts, roles, hard deletion of invitations, and online database hosting.

## Storage

The application will use `better-sqlite3` in the Node.js runtime. The database location is controlled by `SQLITE_PATH` and defaults to `data/wedding.sqlite`. The connection will enable foreign keys and WAL journaling.

The `data/` directory is ignored by Git. Oracle VPS backups copy the database after a WAL checkpoint into a timestamped file in a configurable backup directory. Google Sheets credentials and `googleapis` are removed.

### Schema

```sql
CREATE TABLE invitations (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  max_guests INTEGER NOT NULL CHECK (max_guests >= 1),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE rsvps (
  id INTEGER PRIMARY KEY,
  invitation_code TEXT NOT NULL UNIQUE REFERENCES invitations(code),
  attendance TEXT NOT NULL CHECK (attendance IN ('attending', 'declined')),
  guest_count INTEGER NOT NULL CHECK (guest_count >= 0),
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX rsvps_attendance_updated_idx ON rsvps(attendance, updated_at DESC);
```

Invitation links retain their existing format: `/moi/<code>`. The public invitation and RSVP APIs keep their URLs and validation behavior; their store implementation changes from Google Sheets to SQLite.

## Authentication

One shared admin account is configured entirely with environment variables:

```env
ADMIN_PASSWORD_HASH=<scrypt encoded password hash>
ADMIN_SESSION_SECRET=<at least 32 random bytes, encoded as a string>
```

`/admin/login` validates the supplied password using a timing-safe comparison and rate limits failed attempts by IP. A successful login creates an HMAC-signed, expiry-bound session token stored in an `httpOnly`, `SameSite=Lax` cookie. The cookie receives the `Secure` flag in production and expires after seven days.

Every admin page and `/api/admin/*` route validates the session on the server. Login responses never expose the hash; protected API failures return 401 JSON and page requests redirect to `/admin/login`. Logout clears the cookie.

## Admin UI

`/admin` is mobile-responsive and has four areas:

1. Summary cards: invitation count, invitation links with RSVP, attending invitation count, declined invitation count, pending invitation count, and total confirmed guests.
2. Invitation list: search by name or code; create a generated-code invitation; edit name/max guests; activate/deactivate; copy its personalized link. Deactivation preserves existing RSVP data and makes the public link unavailable.
3. RSVP list: search by guest/code; filter by attendance or pending; view submitted time and message.
4. CSV export: a protected download containing invitation and RSVP information.

The admin UI does not hard-delete records or edit the wedding configuration. `src/config/wedding.ts` remains the source for ceremony content, date, venue, and RSVP deadline.

## Server Interfaces

The database repository exposes operations for public lookup/upsert plus admin CRUD and reporting. It is the only code allowed to issue SQL.

Public endpoints retained:

- `GET /api/invitations/[code]`
- `PUT /api/rsvp/[code]`

New protected endpoints:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET|POST|PATCH /api/admin/invitations`
- `GET /api/admin/rsvps`
- `GET /api/admin/export`

Admin writes validate data server-side and include `Cache-Control: no-store`. CSV cells are escaped to prevent formula injection when opened in spreadsheet software.

## Operational Commands

```bash
npm run db:init
npm run db:seed -- data/guests.csv
npm run db:backup
npm run admin:password
```

`db:init` creates tables without removing data. The application initializes the schema at startup. In development, it inserts the known `demo` invitation only when absent. `db:seed` upserts customers from CSV and prints their URLs. `db:backup` performs a checkpoint then creates a timestamped copy.

## Testing

Unit tests cover database initialization, invitation CRUD, RSVP upsert, summary counts, CSV escaping, password verification, session signing, and admin validation.

Route tests cover unauthenticated rejection, login rate limiting, authenticated invitation changes, RSVP listing/filtering, export, and the unchanged public invitation/RSVP behavior against a temporary SQLite database.

Browser tests cover the login gate, mobile admin layout, guest creation/copy-link, invitation deactivation, RSVP filtering, export affordance, and public RSVP submission.
