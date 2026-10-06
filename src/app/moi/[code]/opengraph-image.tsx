import { ImageResponse } from "next/og";

import {
  InvitationSocialCard,
  invitationSocialImageSize,
} from "@/lib/invitation-social-card";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { getInvitation } from "@/lib/invitation-service";
import { sqliteInvitationStore } from "@/lib/sqlite-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = invitationSocialImageSize;
export const contentType = "image/png";

export default async function PersonalInvitationOpenGraphImage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const content = getInvitationContent();

  try {
    const result = await getInvitation(code, sqliteInvitationStore);
    if (result.ok) {
      return new ImageResponse(
        <InvitationSocialCard content={content} guestName={result.invitation.guestName} />,
        invitationSocialImageSize,
      );
    }
  } catch {
    // Keep the share image usable even if guest lookup fails.
  }

  return new ImageResponse(
    <InvitationSocialCard content={content} />,
    invitationSocialImageSize,
  );
}
