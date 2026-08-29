import { InvitationThemeScope } from "@/components/invitation-theme-scope";
import { Invitation } from "@/components/invitation";
import { resolveAppearanceThemeId } from "@/lib/appearance-store";
import { getInvitationContent } from "@/lib/invitation-content-store";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ previewTheme?: string | string[] }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const previewTheme = Array.isArray(query.previewTheme) ? query.previewTheme[0] : query.previewTheme;
  const themeId = resolveAppearanceThemeId(previewTheme);

  return <InvitationThemeScope themeId={themeId}>
    <Invitation media={listActiveMedia().map(toPublicMediaAsset)} content={getInvitationContent()} />
  </InvitationThemeScope>;
}
