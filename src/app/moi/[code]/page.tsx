import type { Metadata } from "next";

import { PersonalInvitation } from "@/components/personal-invitation";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { getInvitation } from "@/lib/invitation-service";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";
import { sqliteInvitationStore } from "@/lib/sqlite-store";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const content = getInvitationContent();
  const couple = `${content.couple.shortGroomName} & ${content.couple.shortBrideName}`;
  try {
    const result = await getInvitation(code, sqliteInvitationStore);
    if (result.ok) {
      return {
        title: `Thiệp mời dành cho ${result.invitation.guestName} | ${couple}`,
        description: `${couple} trân trọng kính mời ${result.invitation.guestName} đến chung vui trong ngày đặc biệt.`,
      };
    }
  } catch {
    // Fall through to generic metadata.
  }
  return { title: `${couple} | Thiệp mời lễ thành hôn`, description: `Trân trọng kính mời bạn đến chung vui cùng ${couple}.` };
}

export default async function PersonalInvitationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PersonalInvitation code={code} media={listActiveMedia().map(toPublicMediaAsset)} content={getInvitationContent()} />;
}
