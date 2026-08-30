export const CURRENT_INVITATION_CONTENT_SCHEMA_VERSION = 2;

export class FutureInvitationContentVersionError extends Error {
  constructor(public readonly storedVersion: number) {
    super(`Nội dung thiệp dùng schema version ${storedVersion}, mới hơn version ${CURRENT_INVITATION_CONTENT_SCHEMA_VERSION} mà ứng dụng hiện tại hỗ trợ.`);
    this.name = "FutureInvitationContentVersionError";
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrateV1ToV2(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const story = input.story;
  if (!isRecord(story) || !Array.isArray(story.milestones)) return input;

  return {
    ...input,
    story: {
      ...story,
      milestones: story.milestones.map((milestone) => {
        if (!isRecord(milestone) || "imageSrc" in milestone) return milestone;
        return { ...milestone, imageSrc: null };
      }),
    },
  };
}

const migrations: Record<number, (input: unknown) => unknown> = {
  1: migrateV1ToV2,
};

export function migrateInvitationContent(
  input: unknown,
  storedVersion: number,
): { content: unknown; version: number } {
  if (!Number.isInteger(storedVersion) || storedVersion < 1) {
    throw new Error("Invitation content schema version is invalid.");
  }
  if (storedVersion > CURRENT_INVITATION_CONTENT_SCHEMA_VERSION) {
    throw new FutureInvitationContentVersionError(storedVersion);
  }

  let content = input;
  let version = storedVersion;
  while (version < CURRENT_INVITATION_CONTENT_SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) throw new Error(`Missing invitation content migration for version ${version}.`);
    content = migrate(content);
    version += 1;
  }

  return { content, version };
}
