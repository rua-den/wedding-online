# Invitation Delete & Filter Plan

## Status
Implemented on `main` on 2026-08-30. Source-level regression tests were added; run `npm test`, `npm run lint`, and `npm run build` in a Node environment after pulling the latest `main`.

## Goal
Make a large invitation list easier to manage by adding safe deletion and useful status filters without changing public invitation/RSVP contracts.

## Scope
1. Add a protected DELETE flow for admin invitations.
   - Delete by invitation code.
   - If an RSVP exists, delete that RSVP and the invitation together in one transaction.
   - Return the refreshed admin summary.
   - Unknown codes return 404.
2. Add invitation-list filters in the admin UI.
   - All
   - Active
   - Disabled
   - Responded
   - Pending
   - Keep the existing name/code search and make filters compose with search.
3. Add a visible Delete action.
   - Require browser confirmation before destructive deletion.
   - Confirmation copy explicitly warns when the row already has an RSVP.
   - Keep Disable as the non-destructive option for preserving history.
4. Add regression coverage for store/API/UI behavior.

## Implementation notes
- SQLite foreign keys currently do not cascade RSVP rows, so deletion explicitly removes `rsvps` before `invitations` inside a database transaction.
- The existing `active` flag remains the preferred way to retire a real invitation while preserving its RSVP history.
- Invitation filters are client-side because the admin page already receives the full invitation list.
- Invitation search and RSVP search use separate state so filtering one table does not unexpectedly filter the other.

## Implemented behavior
- `DELETE /api/admin/invitations` accepts `{ code }`, requires an admin session, deletes the linked RSVP first, deletes the invitation, and returns the refreshed summary.
- The invitation table has All / Active / Disabled / Responded / Pending filters plus its own name/code search.
- Each normal invitation row has Edit, Enable/Disable, and Delete actions.
- Delete requires confirmation; rows with an RSVP explicitly warn that the RSVP will be deleted too.
- Successful deletion removes the invitation and its RSVP from the rendered admin state and refreshes summary cards.

## Done when
- Admin can distinguish active/disabled/responded/pending invitations quickly. ✅
- Admin can permanently delete test or mistaken invitations. ✅
- Deleting an invitation with an RSVP leaves no orphan RSVP. ✅ (covered by source test)
- Summary cards update after delete. ✅
- Tests cover delete success, delete-with-RSVP, not-found behavior, and filtering. ✅ (added; runtime verification still required)
