export const CURRENT_INVITATION_CONTENT_SCHEMA_VERSION = 4;

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
  return { ...input, story: { ...story, milestones: story.milestones.map((milestone) => !isRecord(milestone) || "imageSrc" in milestone ? milestone : { ...milestone, imageSrc: null }) } };
}

function migrateV2ToV3(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const event = isRecord(input.event) ? input.event : {};
  const rsvp = isRecord(input.rsvp) ? input.rsvp : {};
  const couple = isRecord(input.couple) ? input.couple : {};
  const groom = typeof couple.shortGroomName === "string" ? couple.shortGroomName : "Huy";
  const bride = typeof couple.shortBrideName === "string" ? couple.shortBrideName : "Nhi";
  return {
    ...input,
    event: { ...event, timeHeading: event.timeHeading ?? "Thời gian", venueHeading: event.venueHeading ?? "Địa điểm", directionsLabel: event.directionsLabel ?? "Xem chỉ đường" },
    rsvp: {
      ...rsvp,
      greetingPrefix: rsvp.greetingPrefix ?? "Thân mời",
      attendanceQuestion: rsvp.attendanceQuestion ?? "Bạn có thể tham dự cùng chúng mình không?",
      attendingLabel: rsvp.attendingLabel ?? "Sẽ tham dự",
      declinedLabel: rsvp.declinedLabel ?? "Rất tiếc, không thể tham dự",
      guestCountLabel: rsvp.guestCountLabel ?? "Số người tham dự",
      guestCountSuffix: rsvp.guestCountSuffix ?? "người",
      messageLabel: rsvp.messageLabel ?? "Lời nhắn",
      messagePlaceholder: rsvp.messagePlaceholder ?? `Gửi lời chúc tới ${groom} & ${bride}`,
      submitLabel: rsvp.submitLabel ?? "Gửi xác nhận",
      submittingLabel: rsvp.submittingLabel ?? "Đang gửi...",
      closedMessage: rsvp.closedMessage ?? "Đã hết hạn xác nhận tham dự.",
      successMessage: rsvp.successMessage ?? "Cảm ơn bạn đã xác nhận tham dự!",
    },
  };
}

function migrateV3ToV4(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const story = input.story;
  if (!isRecord(story) || !Array.isArray(story.milestones)) return input;
  return {
    ...input,
    story: {
      ...story,
      milestones: story.milestones.map((milestone) => isRecord(milestone) ? {
        ...milestone,
        imageFocusX: milestone.imageFocusX ?? 50,
        imageFocusY: milestone.imageFocusY ?? 50,
        imageZoom: milestone.imageZoom ?? 1,
      } : milestone),
    },
  };
}

const migrations: Record<number, (input: unknown) => unknown> = { 1: migrateV1ToV2, 2: migrateV2ToV3, 3: migrateV3ToV4 };

export function migrateInvitationContent(input: unknown, storedVersion: number): { content: unknown; version: number } {
  if (!Number.isInteger(storedVersion) || storedVersion < 1) throw new Error("Invitation content schema version is invalid.");
  if (storedVersion > CURRENT_INVITATION_CONTENT_SCHEMA_VERSION) throw new FutureInvitationContentVersionError(storedVersion);
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
