import type { Metadata } from "next";

import { InvitationThemeScope } from "@/components/invitation-theme-scope";
import { PersonalInvitation } from "@/components/personal-invitation";
import { resolveAppearanceThemeId } from "@/lib/appearance-store";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { getInvitation } from "@/lib/invitation-service";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";
import { sqliteInvitationStore } from "@/lib/sqlite-store";

export const dynamic = "force-dynamic";

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

type SearchParams = Promise<{ previewTheme?: string | string[] }>;

export default async function PersonalInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: SearchParams;
}) {
  const { code } = await params;
  const query = searchParams ? await searchParams : {};
  const previewTheme = Array.isArray(query.previewTheme) ? query.previewTheme[0] : query.previewTheme;
  const themeId = resolveAppearanceThemeId(previewTheme);

  return <InvitationThemeScope themeId={themeId}>
    <PersonalInvitation code={code} media={listActiveMedia().map(toPublicMediaAsset)} content={getInvitationContent()} />
  </InvitationThemeScope>;
}
