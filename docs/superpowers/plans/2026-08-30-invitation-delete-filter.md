# Invitation Delete & Filter Plan

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
- SQLite foreign keys currently do not cascade RSVP rows, so deletion must explicitly remove `rsvps` before `invitations` inside a transaction-like SQL unit.
- The existing `active` flag remains the preferred way to retire a real invitation while preserving its RSVP history.
- Filters are client-side because the admin page already receives the full invitation list and the current search is client-side.

## Done when
- Admin can distinguish active/disabled/responded/pending invitations quickly.
- Admin can permanently delete test or mistaken invitations.
- Deleting an invitation with an RSVP leaves no orphan RSVP.
- Summary cards update after delete.
- Tests cover delete success, delete-with-RSVP, not-found behavior, and filtering.
