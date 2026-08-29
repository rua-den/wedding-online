import { Invitation } from "@/components/invitation";
import { listActiveMedia, toPublicMediaAsset } from "@/lib/media-store";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Invitation media={listActiveMedia().map(toPublicMediaAsset)} settings={getSiteSettings()} />;
}
