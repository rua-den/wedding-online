import { InvitationThemeScope } from "@/components/invitation-theme-scope";
import { Invitation } from "@/components/invitation";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default function Home() {
  return <InvitationThemeScope>
    <Invitation media={listActiveMedia().map(toPublicMediaAsset)} content={getInvitationContent()} />
  </InvitationThemeScope>;
}
