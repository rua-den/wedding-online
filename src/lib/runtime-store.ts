import type { InvitationStore } from "./invitation-service";

import { demoStore } from "./demo-store";
import { googleSheetsStore } from "./sheets";

export function getInvitationStore(code: string): InvitationStore {
  if (process.env.NODE_ENV !== "production" && code === "demo") {
    return demoStore;
  }

  return googleSheetsStore;
}
