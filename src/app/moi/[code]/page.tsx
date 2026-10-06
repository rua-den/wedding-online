import type { Metadata } from "next";

import { InvitationThemeScope } from "@/components/invitation-theme-scope";
import { MusicPlayer } from "@/components/music-player";
import { PersonalInvitation } from "@/components/personal-invitation";
import { resolveAppearanceSettings } from "@/lib/appearance-store";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { getInvitationEventProfiles } from "@/lib/invitation-event-profile-store";
import { getInvitation } from "@/lib/invitation-service";
import { invitationSocialCopy } from "@/lib/invitation-social-card";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";
import { getMusicSettings } from "@/lib/music-store";
import { sqliteInvitationStore } from "@/lib/sqlite-store";

export const dynamic = "force-dynamic";

const personalizedRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  noarchive: true,
};

function socialMetadata(title: string, description: string, couple: string): Metadata {
  return {
    title,
    description,
    robots: personalizedRobots,
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: couple,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const content = getInvitationContent();

  try {
    const result = await getInvitation(code, sqliteInvitationStore);
    if (result.ok) {
      const copy = invitationSocialCopy(content, result.invitation.guestName);
      return socialMetadata(copy.title, copy.description, copy.couple);
    }
  } catch {
    // Fall through to generic metadata.
  }

  const copy = invitationSocialCopy(content);
  return socialMetadata(copy.title, copy.description, copy.couple);
}

type SearchParams = Promise<{ previewTheme?: string | string[]; previewFont?: string | string[] }>;

export default async function PersonalInvitationPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams?: SearchParams }) {
  const { code } = await params;
  const query = searchParams ? await searchParams : {};
  const previewTheme = Array.isArray(query.previewTheme) ? query.previewTheme[0] : query.previewTheme;
  const previewFont = Array.isArray(query.previewFont) ? query.previewFont[0] : query.previewFont;
  const appearance = resolveAppearanceSettings({ previewTheme, previewFont });

  return <InvitationThemeScope themeId={appearance.themeId} fontId={appearance.fontId}>
    <PersonalInvitation
      code={code}
      media={listActiveMedia().map(toPublicMediaAsset)}
      content={getInvitationContent()}
      eventProfiles={getInvitationEventProfiles()}
    />
    <MusicPlayer settings={getMusicSettings()} />
  </InvitationThemeScope>;
}
