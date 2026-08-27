# Admin & SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Google Sheets with a durable SQLite database and add a single-account admin dashboard for invitations and RSVP responses.

**Architecture:** `better-sqlite3` owns one local database file and is accessed only through a repository module. The existing public invitation/RSVP routes retain their contracts while switching to that repository; server-validated admin routes and pages use a signed cookie session based on environment secrets.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind CSS, `better-sqlite3`, Node.js `crypto`, Zod, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-27-admin-sqlite-design.md`

## Global Constraints

- `SQLITE_PATH` defaults to `data/wedding.sqlite`; enable SQLite foreign keys and WAL mode.
- SQLite is the only production and development RSVP store; remove Google Sheets code, credentials, and dependency.
- In development only, seed an active invitation `demo` with name `Khách mời thân yêu` and `maxGuests` 2 if absent.
- Never hard-delete invitations; inactive links return the existing unavailable invitation result.
- Wedding copy, date, venue, and RSVP deadline stay in `src/config/wedding.ts`.
- Admin credentials are environment-only: `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`; never store either in SQLite or return either to a client.
- Admin cookie is `httpOnly`, `SameSite=Lax`, `Secure` in production, HMAC-signed, and expires after seven days.
- Admin routes send `Cache-Control: no-store`; public APIs do not disclose lists of guests.
- CSV export escapes values beginning with `=`, `+`, `-`, or `@` by prepending an apostrophe.
- Preserve the uncommitted `.env.example` port change unless the user explicitly asks to change it.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/lib/sqlite.ts` | Open/configure the singleton SQLite connection and create the schema idempotently. |
| `src/lib/sqlite-store.ts` | Public `InvitationStore` implementation plus admin CRUD/report/query functions; only module issuing SQL. |
| `src/lib/guest-csv.ts` | Parse/validate guest CSV and serialize injection-safe RSVP CSV export. |
| `src/lib/admin-auth.ts` | Password hashing/verification, session signing/verification, cookie configuration, and login rate limit. |
| `src/lib/admin-validation.ts` | Zod schemas for admin login, invitation create/update, and list filters. |
| `src/app/admin/login/page.tsx` | Public login page. |
| `src/app/admin/page.tsx` | Server-side session gate and initial dashboard data loader. |
| `src/components/admin-login-form.tsx` | Login form/client error state. |
| `src/components/admin-dashboard.tsx` | Dashboard statistics, invitation CRUD controls, RSVP table/filter, and CSV link. |
| `src/app/api/admin/**/route.ts` | Authenticated admin route handlers. |
| `scripts/db-init.ts` | Initialize SQLite schema. |
| `scripts/db-seed.ts` | Upsert guests from CSV and print invitation URLs. |
| `scripts/db-backup.ts` | WAL checkpoint and timestamped database backup. |
| `scripts/admin-password.ts` | Generate an `ADMIN_PASSWORD_HASH` value without writing it to disk. |

## Task 1: SQLite foundation

**Files:**

- Create: `src/lib/sqlite.ts`
- Create: `src/lib/sqlite.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

**Interfaces:**

- Produces `getDatabase(): Database.Database`, `initializeDatabase(): void`, and `closeDatabaseForTests(): void`.
- `getDatabase()` reads `SQLITE_PATH` once and returns a connection with `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`.

- [ ] **Step 1: Write the failing schema test**

```ts
it("creates the invitation and RSVP tables with foreign keys enabled", () => {
  process.env.SQLITE_PATH = temporaryPath;
  initializeDatabase();

  const tables = getDatabase()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as Array<{ name: string }>;

  expect(tables.map((table) => table.name)).toEqual(expect.arrayContaining(["invitations", "rsvps"]));
  expect(getDatabase().pragma("foreign_keys", { simple: true })).toBe(1);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the module does not exist**

Run: `npx vitest run src/lib/sqlite.test.ts`

Expected: FAIL with a module-not-found error for `./sqlite`.

- [ ] **Step 3: Add SQLite dependencies and the schema implementation**

```ts
const schema = `
  CREATE TABLE IF NOT EXISTS invitations (...);
  CREATE TABLE IF NOT EXISTS rsvps (
    ...,
    invitation_code TEXT NOT NULL UNIQUE REFERENCES invitations(code)
  );
  CREATE INDEX IF NOT EXISTS rsvps_attendance_updated_idx
    ON rsvps(attendance, updated_at DESC);
`;

export function initializeDatabase() {
  const database = getDatabase();
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.exec(schema);
}
```

Add `better-sqlite3` and `@types/better-sqlite3`; add `data/*.sqlite`, `data/*.sqlite-shm`, and `data/*.sqlite-wal` to `.gitignore`.

- [ ] **Step 4: Extend the test for schema constraints and development seed behavior**

```ts
it("adds the local demo invitation only in development", () => {
  vi.stubEnv("NODE_ENV", "development");
  initializeDatabase();

  expect(getDatabase().prepare("SELECT code, max_guests FROM invitations WHERE code = ?").get("demo"))
    .toEqual({ code: "demo", max_guests: 2 });
});
```

Run: `npx vitest run src/lib/sqlite.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the foundation**

```bash
git add package.json package-lock.json .gitignore src/lib/sqlite.ts src/lib/sqlite.test.ts
git commit -m "feat(db): add SQLite foundation"
```

## Task 2: SQLite invitation and RSVP repository

**Files:**

- Create: `src/lib/sqlite-store.ts`
- Create: `src/lib/sqlite-store.test.ts`
- Modify: `src/lib/invitation-service.ts`
- Modify: `src/app/api/invitations/[code]/route.ts`
- Modify: `src/app/api/rsvp/[code]/route.ts`
- Delete: `src/lib/sheets.ts`
- Delete: `src/lib/sheets.test.ts`
- Delete: `src/lib/demo-store.ts`
- Delete: `src/lib/runtime-store.ts`
- Delete: `src/lib/runtime-store.test.ts`

**Interfaces:**

- Produces `sqliteInvitationStore: InvitationStore`.
- Produces `listAdminInvitations(query?: string)`, `createAdminInvitation(input)`, `updateAdminInvitation(input)`, `listAdminRsvps(filters)`, `getAdminSummary()`, and `getRsvpExportRows()`.
- Consumes `StoredRsvp` and `InvitationStore` from `src/lib/invitation-service.ts`.

- [ ] **Step 1: Write failing repository tests using a temporary SQLite path**

```ts
it("upserts an RSVP while preserving its created timestamp", () => {
  createAdminInvitation({ code: "guest-1", name: "Mai", maxGuests: 2 });
  sqliteInvitationStore.upsertRsvp(attendingReply);
  sqliteInvitationStore.upsertRsvp({ ...attendingReply, guestCount: 1, message: "Đổi lại nhé" });

  const rows = getRsvpExportRows();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ code: "guest-1", guestCount: 1, message: "Đổi lại nhé" });
  expect(rows[0].createdAt).not.toBe(rows[0].updatedAt);
});

it("hides inactive invitations from public lookup but retains their RSVP", () => {
  updateAdminInvitation({ code: "guest-1", active: false });
  expect(sqliteInvitationStore.findInvitation("guest-1")).toBeNull();
  expect(getRsvpExportRows()).toHaveLength(1);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run src/lib/sqlite-store.test.ts`

Expected: FAIL because `sqlite-store.ts` and its exported operations do not exist.

- [ ] **Step 3: Implement parameterized SQL repository operations**

```ts
const upsertRsvp = database.prepare(`
  INSERT INTO rsvps (invitation_code, attendance, guest_count, message, created_at, updated_at)
  VALUES (@code, @attendance, @guestCount, @message, @now, @now)
  ON CONFLICT(invitation_code) DO UPDATE SET
    attendance = excluded.attendance,
    guest_count = excluded.guest_count,
    message = excluded.message,
    updated_at = excluded.updated_at
`);
```

Use prepared statements for every value. Create a random `createInvitationCode()` code only when an admin does not provide one; verify uniqueness before insert. Keep all summary/filter/export SQL in this module.

- [ ] **Step 4: Replace public route storage and remove Google Sheets code**

```ts
const result = await getInvitation(code, sqliteInvitationStore);

const result = await submitRsvp(code, parsed.data, {
  store: sqliteInvitationStore,
  deadline: new Date(wedding.event.rsvpDeadline),
  now: new Date(),
});
```

Update route tests to mock `sqliteInvitationStore` instead of `googleSheetsStore`. Keep public response copy/statuses unchanged.

- [ ] **Step 5: Verify repository and public API behavior**

Run: `npx vitest run src/lib/sqlite-store.test.ts src/app/api/invitations/[code]/route.test.ts src/app/api/rsvp/[code]/route.test.ts`

Expected: PASS, including inactive-link, invalid guest count, and RSVP deadline cases.

- [ ] **Step 6: Commit the storage migration**

```bash
git add src/lib src/app/api/invitations/[code]/route.ts src/app/api/rsvp/[code]/route.ts
git rm src/lib/sheets.ts src/lib/sheets.test.ts src/lib/demo-store.ts src/lib/runtime-store.ts src/lib/runtime-store.test.ts
git commit -m "feat(db): store invitations in SQLite"
```

## Task 3: Database operations and project documentation

**Files:**

- Create: `src/lib/guest-csv.ts`
- Create: `src/lib/guest-csv.test.ts`
- Create: `scripts/db-init.ts`
- Create: `scripts/db-seed.ts`
- Create: `scripts/db-backup.ts`
- Create: `scripts/admin-password.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`
- Delete: `scripts/seed-invitations.mjs`
- Delete: `src/lib/seed-invitations.test.ts`

**Interfaces:**

- Produces `parseGuestCsv(text): Array<{ name: string; maxGuests: number }>` and `toSafeCsv(rows): string`.
- Adds `db:init`, `db:seed`, `db:backup`, and `admin:password` package scripts executed through `tsx`.

- [ ] **Step 1: Write failing CSV parser/export tests**

```ts
it("reports the source row when a guest name is blank", () => {
  expect(() => parseGuestCsv("name,maxGuests\n,2\n"))
    .toThrow("Dòng 2: Tên khách mời không được để trống.");
});

it("prefixes formula-like export values with an apostrophe", () => {
  expect(toSafeCsv([{ name: "=HYPERLINK(...)" }])).toContain("'=HYPERLINK");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run src/lib/guest-csv.test.ts`

Expected: FAIL because `guest-csv.ts` does not exist.

- [ ] **Step 3: Implement parser, seed, backup, and password scripts**

```ts
// db-seed.ts
for (const guest of parseGuestCsv(await readFile(inputPath, "utf8"))) {
  const invitation = createAdminInvitation({ name: guest.name, maxGuests: guest.maxGuests });
  console.log(`${invitation.name}\t${siteUrl}/moi/${invitation.code}`);
}

// db-backup.ts
getDatabase().pragma("wal_checkpoint(TRUNCATE)");
await getDatabase().backup(join(backupDirectory, `wedding-${timestamp}.sqlite`));
```

Use `crypto.scrypt` with a random salt for the password generator; print only the final `ADMIN_PASSWORD_HASH=...` line. The sample environment removes `GOOGLE_*` values and documents `SQLITE_PATH`, `ADMIN_PASSWORD_HASH`, and `ADMIN_SESSION_SECRET`.

- [ ] **Step 4: Update local/VPS runbooks**

Document the initial sequence:

```bash
npm ci
npm run admin:password
npm run db:init
npm run db:seed -- data/guests.csv
npm run build
```

Document a backup command and restore procedure that stops PM2, replaces only the database file from a dated backup, then starts PM2.

- [ ] **Step 5: Run script and documentation tests**

Run: `npx vitest run src/lib/guest-csv.test.ts && npm run db:init`

Expected: PASS; `db:init` creates the configured SQLite database without deleting existing records.

- [ ] **Step 6: Commit operational tooling**

```bash
git add package.json package-lock.json .env.example README.md DEPLOYMENT.md src/lib/guest-csv.ts src/lib/guest-csv.test.ts scripts
git rm scripts/seed-invitations.mjs src/lib/seed-invitations.test.ts
git commit -m "feat(db): add SQLite operations"
```

## Task 4: Admin authentication and login page

**Files:**

- Create: `src/lib/admin-auth.ts`
- Create: `src/lib/admin-auth.test.ts`
- Create: `src/lib/admin-validation.ts`
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/components/admin-login-form.tsx`

**Interfaces:**

- Produces `hashPassword(password)`, `verifyPassword(password, hash)`, `createAdminSession(now)`, `verifyAdminSession(token, now)`, `requireAdmin(request)`, and `adminSessionCookie`.
- Login accepts `{ password: string }`; success returns 204 plus Set-Cookie, failure returns `{ message }` and 401/429.

- [ ] **Step 1: Write failing auth tests**

```ts
it("rejects a changed session payload or expired signature", async () => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "a-32-character-test-secret-value-123");
  const token = createAdminSession(new Date("2027-01-01T00:00:00Z"));

  expect(verifyAdminSession(`${token}x`, new Date("2027-01-02T00:00:00Z"))).toBe(false);
  expect(verifyAdminSession(token, new Date("2027-01-09T00:00:01Z"))).toBe(false);
});

it("sets an httpOnly login cookie only after a valid password", async () => {
  const response = await POST(loginRequest("correct-password"));
  expect(response.status).toBe(204);
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
});
```

- [ ] **Step 2: Run focused auth tests and confirm failure**

Run: `npx vitest run src/lib/admin-auth.test.ts src/app/api/admin/login/route.test.ts`

Expected: FAIL because auth modules/routes do not exist.

- [ ] **Step 3: Implement scrypt password verification and signed sessions**

```ts
const [algorithm, salt, digest] = encodedHash.split("$");
const candidate = await scryptAsync(password, salt, 64);
return algorithm === "scrypt" && timingSafeEqual(Buffer.from(digest, "hex"), candidate);
```

Encode session payload as base64url JSON `{ exp }`, sign it with `createHmac("sha256", ADMIN_SESSION_SECRET)`, and compare the supplied signature with `timingSafeEqual`. Reject missing/invalid environment configuration with a generic 500 response; never expose configuration detail.

- [ ] **Step 4: Implement login UI and logout endpoint**

The form posts JSON to `/api/admin/login`, announces Vietnamese errors in an `aria-live` region, redirects success to `/admin`, and disables the submit button while waiting. The logout endpoint clears the same cookie path and redirects or returns 204.

- [ ] **Step 5: Verify auth behavior**

Run: `npx vitest run src/lib/admin-auth.test.ts src/app/api/admin/login/route.test.ts src/app/api/admin/logout/route.test.ts`

Expected: PASS for valid login, invalid login, IP rate limit, tampered token, expired token, and logout.

- [ ] **Step 6: Commit admin authentication**

```bash
git add src/lib/admin-auth.ts src/lib/admin-auth.test.ts src/lib/admin-validation.ts src/app/admin/login src/app/api/admin/login src/app/api/admin/logout src/components/admin-login-form.tsx
git commit -m "feat(admin): add signed login"
```

## Task 5: Protected admin APIs

**Files:**

- Create: `src/app/api/admin/invitations/route.ts`
- Create: `src/app/api/admin/invitations/route.test.ts`
- Create: `src/app/api/admin/rsvps/route.ts`
- Create: `src/app/api/admin/rsvps/route.test.ts`
- Create: `src/app/api/admin/export/route.ts`
- Create: `src/app/api/admin/export/route.test.ts`

**Interfaces:**

- `GET /api/admin/invitations?q=` returns active/inactive invitation rows.
- `POST /api/admin/invitations` accepts `{ name, maxGuests }` and returns a generated code/link.
- `PATCH /api/admin/invitations` accepts `{ code, name?, maxGuests?, active? }`.
- `GET /api/admin/rsvps?q=&status=attending|declined|pending` returns filtered RSVP rows.
- `GET /api/admin/export` returns UTF-8 CSV attachment.

- [ ] **Step 1: Write failing route tests for the authorization boundary**

```ts
it("rejects an unauthenticated invitation create", async () => {
  const response = await POST(new Request("http://localhost/api/admin/invitations", {
    method: "POST",
    body: JSON.stringify({ name: "Lan", maxGuests: 2 }),
  }));
  expect(response.status).toBe(401);
});

it("exports safe CSV only to an authenticated admin", async () => {
  const response = await GET(authenticatedRequest("/api/admin/export"));
  expect(response.headers.get("content-disposition")).toContain("rsvp.csv");
  expect(await response.text()).toContain("'=");
});
```

- [ ] **Step 2: Run focused route tests and confirm failure**

Run: `npx vitest run src/app/api/admin`

Expected: FAIL because the protected route modules do not exist.

- [ ] **Step 3: Implement shared admin route guard and handlers**

Each handler calls `requireAdmin(request)` before parsing data or querying SQLite. Parse request JSON through Zod; return Vietnamese `400` messages for invalid data, `401` for session failure, `404` for unknown code, and `409` only for a code collision. Add `Cache-Control: no-store` to every response.

- [ ] **Step 4: Implement filtering and export response**

```ts
return new Response(toSafeCsv(getRsvpExportRows()), {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": "attachment; filename=\"rsvp.csv\"",
    "Cache-Control": "no-store",
  },
});
```

- [ ] **Step 5: Verify protected route behavior**

Run: `npx vitest run src/app/api/admin`

Expected: PASS for 401 rejection, create/edit/deactivate, all RSVP filters, summary-compatible export, malformed JSON, and CSV formula escaping.

- [ ] **Step 6: Commit admin APIs**

```bash
git add src/app/api/admin src/lib/admin-validation.ts src/lib/sqlite-store.ts src/lib/sqlite-store.test.ts
git commit -m "feat(admin): add management APIs"
```

## Task 6: Admin dashboard UI

**Files:**

- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin-dashboard.tsx`
- Create: `src/components/admin-dashboard.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- `/admin` calls `requireAdmin()` server-side and redirects unauthenticated requests to `/admin/login`.
- `AdminDashboard` receives `{ summary, invitations, rsvps, siteUrl }` and uses only protected APIs for mutations/filter refresh.

- [ ] **Step 1: Write failing component tests**

```tsx
it("creates an invitation then renders its copyable link", async () => {
  render(<AdminDashboard {...fixture} />);
  await userEvent.type(screen.getByLabelText("Tên khách mời"), "Cô Lan");
  await userEvent.click(screen.getByRole("button", { name: "Tạo link mời" }));

  expect(await screen.findByText("Đã tạo link mời cho Cô Lan")).toBeInTheDocument();
});

it("filters RSVP rows to pending guests", async () => {
  render(<AdminDashboard {...fixture} />);
  await userEvent.selectOptions(screen.getByLabelText("Trạng thái RSVP"), "pending");

  expect(await screen.findByText("Chưa phản hồi")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused component tests and confirm failure**

Run: `npx vitest run src/components/admin-dashboard.test.tsx`

Expected: FAIL because the dashboard component does not exist.

- [ ] **Step 3: Implement server gate, responsive summary, and invitation controls**

Render the six summary values from `getAdminSummary()`. Use a semantic table on desktop and horizontally scrollable table container on mobile. The invitation form collects name and max guests; edit controls use explicit labels; active state uses a button whose text changes between `Tắt link` and `Bật link`.

- [ ] **Step 4: Implement RSVP filter, export, and error feedback**

Use URL/API query parameters for search/status. Present pending as `Chưa phản hồi`; show attendance, guest count, message, and updated time for completed RSVP. The export button is a normal protected download link. Mutation errors render Vietnamese text in an `aria-live="polite"` region.

- [ ] **Step 5: Add focused responsive styles**

Add styles for `.admin-shell`, `.admin-stat-grid`, `.admin-panel`, `.admin-table-wrap`, `.admin-form-grid`, and `.admin-actions`. At `max-width: 640px`, make stat cards a two-column grid, stack forms/actions, and preserve table access with horizontal scrolling.

- [ ] **Step 6: Verify dashboard UI**

Run: `npx vitest run src/components/admin-dashboard.test.tsx`

Expected: PASS for creation, active toggle, RSVP filter, mutation error announcement, and mobile table wrapper.

- [ ] **Step 7: Commit admin UI**

```bash
git add src/app/admin/page.tsx src/components/admin-dashboard.tsx src/components/admin-dashboard.test.tsx src/app/globals.css
git commit -m "feat(admin): add RSVP dashboard"
```

## Task 7: Browser coverage and release verification

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/admin.spec.ts`
- Create: `e2e/public-rsvp.spec.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`

**Interfaces:**

- Adds `npm run test:e2e` which starts the production-like local server with a temporary `SQLITE_PATH`.

- [ ] **Step 1: Write browser scenarios**

```ts
test("admin login gates the dashboard and creates a usable invitation", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Mật khẩu").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.getByLabel("Tên khách mời").fill("Cô Lan");
  await page.getByRole("button", { name: "Tạo link mời" }).click();
  await expect(page.getByText("Đã tạo link mời cho Cô Lan")).toBeVisible();
});
```

Add a mobile viewport test for the dashboard, a deactivation test showing a public unavailable invitation, an RSVP submit success/failure test, and a filter/export-link test.

- [ ] **Step 2: Run browser tests and confirm any missing infrastructure fails**

Run: `npm run test:e2e`

Expected: initial failure until Playwright config, test environment values, and pages are connected.

- [ ] **Step 3: Configure deterministic E2E environment**

The Playwright web server sets `NODE_ENV=test`, a temporary `SQLITE_PATH`, `ADMIN_PASSWORD_HASH` generated for a non-secret test password, `ADMIN_SESSION_SECRET`, and a disposable port. Test setup initializes the database and inserts fixture invitations.

- [ ] **Step 4: Run all verification commands serially**

```bash
npm test -- --run
npm run lint
npm run build
npm run test:e2e
git diff --check
```

Expected: every command exits zero. Do not run Vitest concurrently with other resource-intensive checks because the child-process seed test can approach its five-second timeout on this VM.

- [ ] **Step 5: Commit release coverage and documentation**

```bash
git add playwright.config.ts e2e package.json README.md DEPLOYMENT.md
git commit -m "test(admin): cover SQLite dashboard"
```

## Plan Self-Review

- Storage/schema, local seed, no Sheets import, and operation scripts map to Tasks 1–3.
- Single-account authentication and cookie security map to Task 4.
- Invitation/RVSP administration, filtering, deactivation, and export map to Tasks 2, 5, and 6.
- Mobile admin behavior and end-to-end coverage map to Tasks 6–7.
- The spec keeps wedding content in `src/config/wedding.ts`; no task adds a wedding-content editor.
- Every interface used by a later task is introduced in an earlier task, and each task has a focused test command and commit boundary.
