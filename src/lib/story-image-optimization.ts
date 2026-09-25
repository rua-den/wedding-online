import { extname } from "node:path";

import { getInvitationContent, updateInvitationContent } from "./invitation-content-store";
import { referencedUploadSources } from "./media-prune";
import {
  canonicalUploadFilename,
  createUploadFilename,
  mediaUploadPath,
  removeMediaFile,
  saveMediaFile,
} from "./media-upload";
import { validateImageFile } from "./media-validation";
import type { LoveStoryMilestoneContent } from "@/types/invitation-content";

const imageContentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export class StoryImageNotFoundError extends Error {}
export class StoryImageSourceUnavailableError extends Error {}

function milestoneAt(index: number): LoveStoryMilestoneContent {
  if (!Number.isInteger(index) || index < 0) throw new StoryImageNotFoundError("Mốc chuyện tình không hợp lệ.");
  const milestone = getInvitationContent().story.milestones[index];
  if (!milestone) throw new StoryImageNotFoundError("Không tìm thấy mốc chuyện tình.");
  return milestone;
}

export function storyMilestoneOptimizationSource(index: number): {
  milestone: LoveStoryMilestoneContent;
  absolutePath: string;
  contentType: string;
} {
  const milestone = milestoneAt(index);
  const filename = milestone.imageSrc ? canonicalUploadFilename(milestone.imageSrc) : null;
  const absolutePath = filename ? mediaUploadPath(filename) : null;
  const contentType = filename ? imageContentTypes[extname(filename).toLowerCase()] : undefined;
  if (!filename || !absolutePath || !contentType) {
    throw new StoryImageSourceUnavailableError("Mốc chuyện tình này không có ảnh upload có thể tối ưu tự động.");
  }
  return { milestone, absolutePath, contentType };
}

export async function replaceStoryMilestoneWithOptimizedFile(index: number, file: File): Promise<LoveStoryMilestoneContent> {
  const original = storyMilestoneOptimizationSource(index).milestone;
  const originalSrc = original.imageSrc;
  if (!originalSrc) throw new StoryImageSourceUnavailableError("Mốc chuyện tình này không có ảnh để tối ưu.");

  const extension = await validateImageFile(file);
  const saved = await saveMediaFile(file, createUploadFilename(file.name, extension));

  let updatedContent;
  try {
    const latest = getInvitationContent();
    const latestMilestone = latest.story.milestones[index];
    if (!latestMilestone || latestMilestone.imageSrc !== originalSrc) {
      throw new Error("Ảnh mốc chuyện tình đã thay đổi trong lúc tối ưu. Hãy tải lại trang và thử lại.");
    }

    updatedContent = updateInvitationContent({
      ...latest,
      story: {
        ...latest.story,
        milestones: latest.story.milestones.map((milestone, milestoneIndex) =>
          milestoneIndex === index ? { ...milestone, imageSrc: saved.src } : milestone,
        ),
      },
    });
  } catch (error) {
    try {
      await removeMediaFile(saved.src);
    } catch {
      // The regular upload pruner can remove an orphan if cleanup fails.
    }
    throw error;
  }

  try {
    if (!referencedUploadSources().has(originalSrc)) await removeMediaFile(originalSrc);
  } catch (error) {
    console.warn("Optimized story image replaced but old upload cleanup failed:", error instanceof Error ? error.message : error);
  }

  const updated = updatedContent.story.milestones[index];
  if (!updated) throw new StoryImageNotFoundError("Không thể đọc mốc chuyện tình vừa tối ưu.");
  return updated;
}
