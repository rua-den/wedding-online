# Invitation event split plan — 11/10 and 31/10

## Goal

Split personalized invitations into three explicit guest groups without duplicating the wedding site:

- `oct11` — invited to the 11 October event only.
- `oct31` — invited to the 31 October event only.
- `both` — invited to both events.

The guest keeps one personalized `/moi/[code]` URL. The assigned event scope determines which event information is rendered.

## Backward compatibility

Existing production invitations predate event assignment, so migration must not guess whether they belong to 11/10 or 31/10. Existing rows are migrated to an internal `legacy` scope and keep their current rendering until an administrator explicitly assigns one of the three new scopes.

New invitations must choose `oct11`, `oct31`, or `both`.

Legacy RSVP rows are preserved in the original `rsvps` table. Dated invitations use a separate `event_rsvps` table keyed by `(invitation_code, event_scope)`, so assigning a legacy invitation to a dated event does not reinterpret an old response as a response for the new date.

## Delivery checkpoints

### A. Persist event assignment — COMPLETE

- [x] Add a typed invitation-event scope domain model.
- [x] Add `event_scope` to fresh SQLite schema and an idempotent migration for existing databases.
- [x] Return the scope from public invitation lookup.
- [x] Accept scope on admin create/update endpoints.
- [x] Require `eventScope` in batch guest CSV seeds so new rows cannot silently become legacy.
- [x] Add regression coverage for fresh schema, existing-db migration, service lookup, persistence and validation.

### B. Admin workflow — COMPLETE

- [x] Require an event selection when creating a personalized invitation.
- [x] Show the event assignment in the invitation table.
- [x] Allow existing/legacy invitations to be assigned to 11/10, 31/10 or both while editing.
- [x] Keep existing invitation URLs unchanged.
- [x] Preserve existing legacy RSVP data rather than rewriting it.

### C1. Dated event profiles and rendering — COMPLETE

The implementation uses a dedicated `invitation_event_profiles` store instead of duplicating the full invitation-content document. Shared wedding copy/media/theme remains global; only the fields that genuinely differ by date are stored independently.

- [x] Store independent 11/10 and 31/10 event profiles: date/time, RSVP deadline, venue, address, maps URL and event copy.
- [x] Add a protected `/admin/events` editor with independent forms for 11/10 and 31/10.
- [x] Validate that each profile's event time actually falls on its assigned date in `Asia/Ho_Chi_Minh`.
- [x] Fail closed when an assigned profile is not configured; never fall back to the legacy/global event and risk showing the wrong date.
- [x] Resolve personalized content by invitation scope:
  - `oct11`: render only 11/10.
  - `oct31`: render only 31/10.
  - `both`: render both event cards and use the earliest upcoming event for countdown behavior.
  - `legacy`: preserve the current single-event page.
- [x] After 11/10 passes, a `both` invitation uses 31/10 as its primary/countdown event.

### C2. RSVP per event — COMPLETE

- [x] Keep one invitation code/guest record; do not duplicate guests for `both`.
- [x] Add `event_rsvps` with a unique response per `(invitation_code, event_scope)`.
- [x] Preserve the legacy RSVP path and payload for legacy invitations.
- [x] Require dated RSVP submissions to include an event scope and verify server-side that the scope belongs to that invitation.
- [x] Validate each RSVP against that event profile's own deadline.
- [x] Render two independent RSVP forms for `both` invitations.
- [x] Report/export RSVP targets by event while keeping legacy responses separate.
- [x] Ignore preserved legacy responses after an invitation is reassigned to a dated scope instead of reinterpreting them.
- [x] Cascade event RSVP deletion with invitation deletion while surfacing that RSVP data existed.

C1 and C2 were squash-merged to `main` as `97238c86db33dec0813217d8965b9126b7f0542d`. Main CI #269 passed unit tests, lint, production build, Playwright E2E and visual smoke. Production release/deploy remained disabled and was skipped for that merge.

### D. Production-activation hardening — COMPLETE

A post-merge review found activation-safety gaps that needed to be closed before entering real wedding data. They were fixed without inventing or modifying real event data.

- [x] Derive visible `dateLabel` and `timeLabel` from trusted `scope + dateTime`; admin-entered display text can no longer contradict the real event time.
- [x] Start unconfigured dated profiles with blank event-specific business data instead of cloning the legacy/global event's title, venue, address or map.
- [x] Reject unknown invitation scopes at runtime instead of silently treating them as `legacy`.
- [x] Enforce allowed invitation scopes in SQLite for both fresh databases and already-migrated databases.
- [x] Clarify dashboard summary labels so invitation-link counts are not confused with per-event RSVP-target counts.
- [x] Add browser E2E for: configure 11/10 + 31/10 → create a `both` invitation → render both event cards → submit two independent RSVPs → verify two admin response rows.

This hardening was squash-merged to `main` as `c9aeea4a164aa72a217d62aa16d802d60489bebb` (`fix: harden dated invitation activation`). A deliberate workflow-dispatch CI #275 passed unit/lint/build, Playwright, ARM64 release assembly/smoke, and **successfully deployed `c9aeea` to the production VPS** according to GitHub Actions.

### E. Deployment persistent-state invariants — COMPLETE

After the first deliberate dated-invitation deployment, deployment persistence was hardened so future code releases cannot silently replace or regress wedding runtime state.

- [x] Gate automatic production dispatch on repository variable `CD_ENABLED == 'true'`.
- [x] Package a standalone persistent-state verifier with the ARM64 release.
- [x] Before process replacement, require SQLite and uploads to resolve into shared persistent storage.
- [x] Run SQLite `PRAGMA integrity_check` before activation.
- [x] Validate that any configured background music file still exists under shared uploads.
- [x] Snapshot tracked table row counts and the full upload filename manifest.
- [x] Create a `pre-deploy-*.sqlite` backup in shared backup storage before activation.
- [x] Re-run persistent-state verification after the new release passes localhost health check.
- [x] Fail deployment and roll code back if tracked rows decrease, a pre-existing upload filename disappears, persistent paths change, or referenced music disappears.
- [x] Add behavioral regressions for unchanged state, row loss, missing music, and upload replacement with unchanged file count.
- [x] Document that rollback code does not automatically restore shared data; the retained backup exists for deliberate recovery.

This hardening was squash-merged to `main` as `37695db0137331c6fadce0e6886abd4d0c41f62e` (`fix: protect persistent state during production deploy`). Exact post-merge CI #282 passed unit tests, lint, production build, Playwright E2E, and visual smoke. ARM64 release and production deployment were skipped. `Auto deploy production` run #21 completed as **skipped**, proving that the merge did not silently dispatch production while `CD_ENABLED` was off.

`37695db` has therefore **not** been deployed by that merge. The last GitHub-Actions-confirmed successful production deploy is `c9aeea` via CI #275; verify the VPS before relying on that as the live revision because manual/out-of-band changes are possible.

## Verification

Verified behavior now includes:

- additive migration of existing invitations to `legacy` without guessing a wedding date;
- strict event-scope validation at API/store/database boundaries;
- independent 11/10 and 31/10 profile validation in `Asia/Ho_Chi_Minh`;
- canonical visible date/time derived from the validated event instant;
- fail-closed rendering for missing or invalid dated configuration;
- one personalized URL with correct rendering for `oct11`, `oct31` and `both`;
- one RSVP per invited event with server-side scope authorization and per-event deadlines;
- event-aware admin reporting/export without reinterpreting stale legacy RSVP data;
- end-to-end browser coverage of the complete `both` workflow;
- gated automatic CD plus pre/post activation SQLite/uploads/music invariants.

## Production activation checklist

Code readiness and wedding-data readiness are separate gates. Dated invitations should not be distributed broadly until:

1. `/admin/events` has complete, verified profiles for both dates that will be used.
2. Existing `legacy` guests are explicitly assigned to `oct11`, `oct31` or `both` where appropriate.
3. A preview link from each scope is manually opened and checked for date, time, venue, map and RSVP deadline.
4. `both` is verified with two event cards and two independent RSVP forms.
5. Current VPS revision and shared-storage topology are verified before the next deliberate deploy.
6. The first deploy containing `37695db` or later is run deliberately with the new persistent-state verifier and confirmed green before automatic CD is enabled.

Do not fabricate missing business data in code merely to make this checklist look complete.

## Repository safety follow-up

`main` was observed without branch protection during the review. Automatic CD is currently gated off, so this does not block normal development, but branch protection / required CI should be enabled before automatic CD is turned on. This is a repository setting, not an application-code change.

## Non-goals

- No duplicate site or duplicate `/moi` routes.
- No automatic date assignment for existing guests.
- No destructive rewrite of current RSVP rows.
- No hard-coded guest-name heuristics.
- No automatic cloning of the current global event into 11/10 or 31/10 production profiles.
- No code-release mechanism that owns or replaces persistent wedding data.
