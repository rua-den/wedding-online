import type { InvitationStore, StoredRsvp } from "./invitation-service";

const demoInvitation = {
  code: "demo",
  name: "Khách mời thân yêu",
  maxGuests: 2,
  active: true,
};

let latestDemoRsvp: StoredRsvp | undefined;

export const demoStore: InvitationStore = {
  async findInvitation(code) {
    return code === demoInvitation.code ? demoInvitation : null;
  },
  async upsertRsvp(response) {
    latestDemoRsvp = response;
  },
};

export function getLatestDemoRsvp() {
  return latestDemoRsvp;
}
