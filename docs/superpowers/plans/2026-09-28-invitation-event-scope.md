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

C1 and C2 were squash-merged to `main` as `97238c86db33dec0813217d8965b9126b7f0542d`. Main CI #269 passed unit tests, lint, production build, Playwright E2E and visual smoke. Production release/deploy remained disabled and was skipped.

### D. Production-activation hardening — COMPLETE

A post-merge review found activation-safety gaps that needed to be closed before entering real wedding data. PR #7 addresses them without modifying production data.

- [x] Derive visible `dateLabel` and `timeLabel` from trusted `scope + dateTime`; admin-entered display text can no longer contradict the real event time.
- [x] Start unconfigured dated profiles with blank event-specific business data instead of cloning the legacy/global event's title, venue, address or map.
- [x] Reject unknown invitation scopes at runtime instead of silently treating them as `legacy`.
- [x] Enforce allowed invitation scopes in SQLite for both fresh databases and already-migrated databases.
- [x] Clarify dashboard summary labels so invitation-link counts are not confused with per-event RSVP-target counts.
- [x] Add browser E2E for: configure 11/10 + 31/10 → create a `both` invitation → render both event cards → submit two independent RSVPs → verify two admin response rows.

Runtime hardening code at `77022cef6bd8f1a3a1a6aa00f184f402debd42ff` passed CI #272: unit tests, lint, production build and the full Playwright suite including the new dated-invitation flow. This documentation update does not change runtime behavior; the PR still requires exact-head CI before merge.

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
- end-to-end browser coverage of the complete `both` workflow.

## Production activation checklist

Code readiness and wedding-data readiness are separate gates. Even after the hardening PR is merged, dated invitations should not be distributed until:

1. `/admin/events` has complete, verified profiles for both dates that will be used.
2. Existing `legacy` guests are explicitly assigned to `oct11`, `oct31` or `both` where appropriate.
3. A preview link from each scope is manually opened and checked for date, time, venue, map and RSVP deadline.
4. `both` is verified with two event cards and two independent RSVP forms.
5. Production deployment is deliberately enabled/run; merging code alone must not be treated as activation.

## Repository safety follow-up

`main` was observed without branch protection during the post-merge review. Production CD remains disabled, so this does not block merging the hardening code, but branch protection / required CI should be enabled before automatic CD is turned on. This is a repository setting, not an application-code change.

## Non-goals

- No duplicate site or duplicate `/moi` routes.
- No automatic date assignment for existing guests.
- No destructive rewrite of current RSVP rows.
- No hard-coded guest-name heuristics.
- No automatic cloning of the current global event into 11/10 or 31/10 production profiles.
