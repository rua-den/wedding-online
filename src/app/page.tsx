import { InvitationThemeScope } from "@/components/invitation-theme-scope";
import { Invitation } from "@/components/invitation";
import { MusicPlayer } from "@/components/music-player";
import { resolveAppearanceSettings } from "@/lib/appearance-store";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";
import { getMusicSettings } from "@/lib/music-store";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ previewTheme?: string | string[]; previewFont?: string | string[] }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const previewTheme = Array.isArray(query.previewTheme) ? query.previewTheme[0] : query.previewTheme;
  const previewFont = Array.isArray(query.previewFont) ? query.previewFont[0] : query.previewFont;
  const appearance = resolveAppearanceSettings({ previewTheme, previewFont });

  return <InvitationThemeScope themeId={appearance.themeId} fontId={appearance.fontId}>
    <Invitation media={listActiveMedia().map(toPublicMediaAsset)} content={getInvitationContent()} />
    <MusicPlayer settings={getMusicSettings()} />
  </InvitationThemeScope>;
}
