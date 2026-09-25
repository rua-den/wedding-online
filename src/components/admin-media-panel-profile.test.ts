import { describe, expect, it } from "vitest";

import { imageUploadPurposeForSlot } from "./admin-media-panel";

describe("imageUploadPurposeForSlot", () => {
  it("maps every media slot to its intended web delivery profile", () => {
    expect(imageUploadPurposeForSlot("hero")).toBe("hero");
    expect(imageUploadPurposeForSlot("groom")).toBe("portrait");
    expect(imageUploadPurposeForSlot("bride")).toBe("portrait");
    expect(imageUploadPurposeForSlot("story")).toBe("story");
    expect(imageUploadPurposeForSlot("venue")).toBe("venue");
    expect(imageUploadPurposeForSlot("gallery")).toBe("gallery");
  });
});
