import { PersonalInvitation } from "@/components/personal-invitation";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";
import { getInvitation } from "@/lib/invitation-service";
import { sqliteInvitationStore } from "@/lib/sqlite-store";
import { getSiteSettings } from "@/lib/site-settings";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  try {
    const result = await getInvitation(code, sqliteInvitationStore);
    if (result.ok) {
      return {
        title: `Thiệp mời dành cho ${result.invitation.guestName} | Huy & Nhi`,
        description: `Huy & Nhi trân trọng kính mời ${result.invitation.guestName} đến chung vui trong ngày đặc biệt.`,
      };
    }
  } catch {
    // Fall through to the safe generic metadata for unavailable invitations.
  }
  return { title: "Huy & Nhi | Thiệp mời lễ thành hôn", description: "Trân trọng kính mời bạn đến chung vui cùng Huy và Nhi." };
}

export default async function PersonalInvitationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PersonalInvitation code={code} media={listActiveMedia().map(toPublicMediaAsset)} settings={getSiteSettings()} />;
}
