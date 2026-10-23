import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabaseForTests } from "./sqlite";
import { defaultGuestGuide, getGuestGuide, updateGuestGuide } from "./guest-guide-store";
import { referencedUploadSources } from "./media-prune";

let directory = "";
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "guest-guide-"));
  process.env.SQLITE_PATH = join(directory, "wedding.sqlite");
});
afterEach(() => {
  closeDatabaseForTests();
  delete process.env.SQLITE_PATH;
  rmSync(directory, { recursive: true, force: true });
});
describe("editable guest guide", () => {
  it("starts with concise visitor milestones and hides vendor setup", () => {
    const guide = getGuestGuide();
    expect(guide.agenda.filter((item) => item.active).map((item) => item.time)).toEqual(["16:00", "16:30", "17:00", "18:00"]);
  });
  it("persists reordered events and uploaded layout references", () => {
    const path = "/uploads/1234567890123-layout.jpg";
    const guide = { ...defaultGuestGuide, agenda: [...defaultGuestGuide.agenda].reverse(), layoutImageSrc: path };
    updateGuestGuide(guide);
    expect(getGuestGuide()).toEqual(guide);
    expect(referencedUploadSources().has(path)).toBe(true);
  });
  it("rejects external layout URLs and malformed agendas", () => {
    expect(() => updateGuestGuide({ ...defaultGuestGuide, layoutImageSrc: "https://example.com/image" })).toThrow();
    expect(() => updateGuestGuide({ ...defaultGuestGuide, agenda: [{ time:"", title:"", description:"", active:true }] })).toThrow();
  });
});
