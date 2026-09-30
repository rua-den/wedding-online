# Codex handoff — 2026-09-30

This file is the current coding handoff for `rua-den/wedding-online`.

## Start here

Before changing code:

1. Verify current `main` HEAD. At this handoff the verified HEAD is:
   - `37695db0137331c6fadce0e6886abd4d0c41f62e`
   - `fix: protect persistent state during production deploy`
2. Do **not** reset to this SHA if `main` has moved. Inspect the newer commits instead.
3. Read in this order:
   - `AGENTS.md`
   - this file
   - `docs/superpowers/plans/2026-09-28-invitation-event-scope.md`
   - `DEPLOYMENT.md` when touching CI/CD, SQLite, uploads, music, PM2, Nginx, or production activation
4. Inspect `git status`, recent commits, relevant regressions, and production code before editing.

## Verified repository state

Current completed sequence:

- `97238c86db33dec0813217d8965b9126b7f0542d` — split personalized invitations into `oct11`, `oct31`, `both`, with safe internal `legacy`; add independent dated event profiles, per-event RSVP, reporting/export, and browser coverage.
- `c9aeea4a164aa72a217d62aa16d802d60489bebb` — harden dated invitation activation: canonical date/time derived from validated event time, blank unconfigured profiles, fail-closed scope handling, SQLite scope constraints, clearer RSVP summary semantics, full `both` E2E.
- `37695db0137331c6fadce0e6886abd4d0c41f62e` — harden deployment persistence: require `CD_ENABLED=true` for automatic deploy dispatch; pre/post activation verification for shared SQLite/uploads/music; SQLite integrity check; pre-deploy SQLite backup; row-count and upload-filename preservation checks; rollback code on state regression.

Exact post-merge CI for `37695db` was CI #282 and passed unit tests, lint, Next.js production build, Playwright E2E, and visual smoke. ARM64 release and production deploy were skipped. `Auto deploy production` run #21 completed as **skipped**, confirming a normal merge does not auto-dispatch production while `CD_ENABLED` is off.

Do not assume the production VPS is running `37695db`; this merge intentionally did not deploy it. Verify production state before any production action.

## Wedding-date source of truth

The dated invitation events are:

- **11/10/2026**
- **31/10/2026**

There is no 10/10 wedding event. A hotel/check-in timeline on 10/10 is separate and must never be interpreted as an invitation event date.

Do not invent production venue, address, map URL, event time, RSVP deadline, or event copy. Dated invitations are designed to fail closed until real profiles are configured.

## Current invitation contract

One personalized URL remains: `/moi/[code]`.

Invitation scopes:

- `oct11` — 11/10 only
- `oct31` — 31/10 only
- `both` — both dates
- `legacy` — internal compatibility state for pre-migration guests; never a selectable scope for newly saved invitations

Important behavior:

- Existing legacy guests are not auto-guessed into a date.
- `oct11` / `oct31` require their matching configured profile.
- `both` requires both profiles and renders two event cards plus two independent RSVP targets.
- Missing dated configuration fails closed instead of falling back to the old global event.
- Legacy RSVP history remains preserved and is not reinterpreted as a dated RSVP after scope reassignment.
- General `/` remains on the global event content.

## Production persistence contract

Runtime state lives outside immutable releases under `<VPS_APP_ROOT>/shared/`.

A production deploy must preserve:

- `.env`
- `shared/data/wedding.sqlite`
- `shared/data/backups/`
- `shared/uploads/` including images and music

Before activation the release verifier must confirm shared realpaths, run SQLite `PRAGMA integrity_check`, validate referenced music, snapshot tracked row counts and the upload filename manifest, and create a pre-deploy SQLite backup. After the new process passes localhost health check, the verifier runs again. A decreased tracked row count, missing pre-existing upload filename, missing referenced music file, or changed persistent path fails deployment and triggers code rollback.

Do not weaken these invariants merely to make a deploy pass. Do not automatically restore the database on a verification failure; the retained pre-deploy backup exists for deliberate recovery because concurrent legitimate writes may have happened.

## Default next checkpoint

If the user gives a new feature/fix request, that request takes priority. Work regression-first from current `main` and preserve all contracts above.

If no more specific request is given, the next useful phase is **production-activation readiness**, not new invitation architecture:

1. verify the production/shared-storage topology and currently deployed revision;
2. keep automatic CD disabled until the first deliberate manual deploy is proven safe;
3. prove a manual deployment path with the persistence verifier before enabling automatic CD;
4. configure real `/admin/events` data only from user-provided wedding details;
5. smoke-test `oct11`, `oct31`, and `both` end to end before bulk assigning legacy guests.

Production activation and real wedding data are operational gates. Do not fabricate them in application code to make the feature appear configured.

## Forward-progress policy

Continue autonomously on the active checkpoint unless one of these is true:

- the checkpoint is locally/CI verified PASS;
- an external review or production authorization gate is genuinely required;
- a real external blocker is proven.

A failed test, lint/build failure, command timeout, connector error, or ambiguous implementation detail is not a stopping condition. Investigate, narrow the failure, fix it, and rerun the smallest useful verification before escalating. Prefer partial verified progress over stopping to ask a question that can be answered from the repository.

Do not merge a coding change just because a focused test passes. For normal application changes, finish with the relevant focused regressions plus the repository quality gates (`npm test`, `npm run lint`, `npm run build`, and Playwright when user-visible flows changed).
