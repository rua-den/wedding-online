export type LoveStoryMilestoneContent = {
  date: string;
  title: string;
  description: string;
  imageSrc: string | null;
};

export type InvitationContent = {
  couple: {
    groom: string;
    bride: string;
    shortGroomName: string;
    shortBrideName: string;
    groomBio: string;
    brideBio: string;
  };
  cover: {
    eyebrow: string;
    message: string;
    scrollCue: string;
  };
  coupleSection: {
    eyebrow: string;
    title: string;
    groomRole: string;
    brideRole: string;
  };
  countdown: {
    eyebrow: string;
    title: string;
  };
  story: {
    eyebrow: string;
    title: string;
    milestones: LoveStoryMilestoneContent[];
  };
  event: {
    eyebrow: string;
    title: string;
    dateTime: string;
    dateLabel: string;
    timeLabel: string;
    rsvpDeadline: string;
    venue: string;
    address: string;
    mapsUrl: string;
    timeHeading: string;
    venueHeading: string;
    directionsLabel: string;
  };
  gallery: {
    eyebrow: string;
    title: string;
  };
  personal: {
    eyebrow: string;
    message: string;
  };
  rsvp: {
    eyebrow: string;
    title: string;
    intro: string;
    greetingPrefix: string;
    attendanceQuestion: string;
    attendingLabel: string;
    declinedLabel: string;
    guestCountLabel: string;
    guestCountSuffix: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    closedMessage: string;
    successMessage: string;
  };
  footer: {
    title: string;
    message: string;
  };
};
