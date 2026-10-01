import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultInvitationContent } from "@/config/invitation-content";
import { getInvitationContent, updateInvitationContent } from "./invitation-content-store";
import { mediaUploadPath, saveMediaFile } from "./media-upload";
import { closeDatabaseForTests, initializeDatabase } from "./sqlite";
import { replaceStoryMilestoneWithOptimizedFile } from "./story-image-optimization";

let directory: string;

function bytes(base64: string): ArrayBuffer {
  const value = Buffer.from(base64, "base64");
  return Uint8Array.from(value).buffer;
}

const png = bytes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=");
const webp = bytes("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA");

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "story-image-optimize-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
  process.env.MEDIA_UPLOAD_DIRECTORY = join(directory, "uploads");
  vi.stubEnv("NODE_ENV", "test");
  initializeDatabase();
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  delete process.env.SQLITE_PATH;
  delete process.env.MEDIA_UPLOAD_DIRECTORY;
  rmSync(directory, { recursive: true, force: true });
});

describe("love-story image optimization", () => {
  it("replaces only imageSrc and preserves milestone content and crop", async () => {
    const originalUpload = await saveMediaFile(new File([png], "original.png", { type: "image/png" }));
    const content = defaultInvitationContent();
    content.story.milestones[0] = {
      ...content.story.milestones[0],
      title: "Mốc cần giữ nguyên",
      imageSrc: originalUpload.src,
      imageFocusX: 23,
      imageFocusY: 71,
      imageZoom: 1.4,
      imagePosition: "left",
    };
    updateInvitationContent(content);

    const replacement = await replaceStoryMilestoneWithOptimizedFile(
      0,
      new File([webp], "optimized.webp", { type: "image/webp" }),
    );

    expect(replacement.imageSrc).toMatch(/^\/uploads\/.+\.webp$/);
    expect(replacement.imageSrc).not.toBe(originalUpload.src);
    expect(replacement.title).toBe("Mốc cần giữ nguyên");
    expect(replacement.imageFocusX).toBe(23);
    expect(replacement.imageFocusY).toBe(71);
    expect(replacement.imageZoom).toBe(1.4);
    expect(replacement.imagePosition).toBe("left");
    expect(getInvitationContent().story.milestones[0]).toEqual(replacement);

    const originalPath = mediaUploadPath(originalUpload.src.replace("/uploads/", ""));
    const replacementPath = mediaUploadPath(replacement.imageSrc!.replace("/uploads/", ""));
    expect(originalPath && existsSync(originalPath)).toBe(false);
    expect(replacementPath && existsSync(replacementPath)).toBe(true);
  });
});
