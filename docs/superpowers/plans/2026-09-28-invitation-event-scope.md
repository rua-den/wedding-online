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

### C1. Dated event profiles and rendering — IMPLEMENTED, CI GATE PENDING

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

### C2. RSVP per event — IMPLEMENTED, CI GATE PENDING

- [x] Keep one invitation code/guest record; do not duplicate guests for `both`.
- [x] Add `event_rsvps` with a unique response per `(invitation_code, event_scope)`.
- [x] Preserve the legacy RSVP path and payload for legacy invitations.
- [x] Require dated RSVP submissions to include an event scope and verify server-side that the scope belongs to that invitation.
- [x] Validate each RSVP against that event profile's own deadline.
- [x] Render two independent RSVP forms for `both` invitations.
- [x] Report/export RSVP targets by event while keeping legacy responses separate.
- [x] Ignore preserved legacy responses after an invitation is reassigned to a dated scope instead of reinterpreting them.
- [x] Cascade event RSVP deletion with invitation deletion while surfacing that RSVP data existed.

## Verification

Completed before the current final head:

- Unit coverage for invitation-scope migration, stores, public lookup, event resolution, dated profiles, scoped RSVP service/store and admin APIs.
- Admin component/E2E coverage for scope creation/editing and seed validation.
- Personalized rendering regression coverage for 11/10, 31/10, `both`, missing-profile fail-closed behavior and independent RSVP forms.
- A previous checkpoint (`353167e`) passed unit tests, lint, production build and Playwright E2E.

Still required before merge:

- [ ] Full CI on the exact final feature SHA.
- [ ] Confirm unit, lint, production build and Playwright all pass on that SHA.
- [ ] Keep PR draft / do not deploy if the exact-SHA gate is not green.

## Production activation checklist

Code readiness and wedding-data readiness are separate gates. Even after CI passes, dated invitations should not be distributed until:

1. `/admin/events` has complete, verified profiles for both dates that will be used.
2. Existing `legacy` guests are explicitly assigned to `oct11`, `oct31` or `both` where appropriate.
3. A preview link from each scope is manually opened and checked for date, time, venue, map and RSVP deadline.
4. `both` is verified with two event cards and two independent RSVP forms.

## Non-goals

- No duplicate site or duplicate `/moi` routes.
- No automatic date assignment for existing guests.
- No destructive rewrite of current RSVP rows.
- No hard-coded guest-name heuristics.
- No automatic cloning of the current global event into 11/10 or 31/10 production profiles.
