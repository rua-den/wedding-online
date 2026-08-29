export type LoveStoryMilestoneContent = {
  date: string;
  title: string;
  description: string;
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
  };
  footer: {
    title: string;
    message: string;
  };
};
