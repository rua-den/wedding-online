import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { getInvitationContent, updateInvitationContent } from "@/lib/invitation-content-store";
import { pruneOrphanUploads } from "@/lib/media-prune";
import { listAdminMedia } from "@/lib/media-store";
import { removeMediaFile } from "@/lib/media-upload";
import type { InvitationContent } from "@/types/invitation-content";

export const dynamic = "force-dynamic";

function milestoneImages(content: InvitationContent): Set<string> {
  return new Set(content.story.milestones.flatMap((milestone) => milestone.imageSrc ? [milestone.imageSrc] : []));
}

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  try {
    return noStoreJson({ content: getInvitationContent() });
  } catch {
    return noStoreJson({ message: "Không thể tải nội dung thiệp." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null);
  try {
    const before = getInvitationContent();
    const content = updateInvitationContent(body);
    const retained = milestoneImages(content);
    const protectedMedia = new Set(listAdminMedia().map((asset) => asset.src));
    const staleImages = [...milestoneImages(before)].filter((src) => !retained.has(src) && !protectedMedia.has(src));
    await Promise.allSettled(staleImages.map((src) => removeMediaFile(src)));
    await pruneOrphanUploads().catch((error) => console.warn("Upload prune skipped after content save:", error instanceof Error ? error.message : error));
    return noStoreJson({ content });
  } catch (error) {
    return noStoreJson({ message: error instanceof Error ? error.message : "Không thể lưu nội dung thiệp." }, { status: 400 });
  }
}
