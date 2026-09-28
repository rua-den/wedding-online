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

## Delivery checkpoints

### A. Persist event assignment

1. Add a typed invitation-event scope domain model.
2. Add `event_scope` to fresh SQLite schema and an idempotent migration for existing databases.
3. Return the scope from public invitation lookup.
4. Accept scope on admin create/update endpoints.
5. Add regression coverage for fresh schema, existing-db migration, service lookup, persistence and validation.

### B. Admin workflow

1. Require an event selection when creating a personalized invitation.
2. Show the event assignment in the invitation table.
3. Allow existing/legacy invitations to be assigned to 11/10, 31/10 or both while editing.
4. Keep existing invitation URLs and RSVP data unchanged.

### C. Event-specific content and rendering

1. Evolve invitation content from one global event into two named event definitions while preserving legacy content.
2. Let the content editor manage 11/10 and 31/10 independently.
3. Resolve personalized content by invitation scope:
   - `oct11`: render only 11/10.
   - `oct31`: render only 31/10.
   - `both`: render both event cards and use the earliest upcoming event for countdown behavior.
   - `legacy`: preserve the current single-event page.
4. Keep RSVP tied to the invitation code; do not create duplicate guest records merely because a guest attends both dates.

## Verification

- Unit tests for migration, store and public lookup.
- Admin route/component regression tests for create/edit scope.
- Personalized-page tests for each scope before enabling event-specific rendering.
- Full `npm test`, lint/build, then CI on the feature branch before merge.

## Non-goals

- No duplicate site or duplicate `/moi` routes.
- No automatic date assignment for existing guests.
- No destructive rewrite of current RSVP rows.
- No hard-coded guest-name heuristics.
