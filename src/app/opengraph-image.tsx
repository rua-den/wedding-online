import { ImageResponse } from "next/og";

import {
  InvitationSocialCard,
  invitationSocialImageSize,
} from "@/lib/invitation-social-card";
import { getInvitationContent } from "@/lib/invitation-content-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = invitationSocialImageSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <InvitationSocialCard content={getInvitationContent()} />,
    invitationSocialImageSize,
  );
}
