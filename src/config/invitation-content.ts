import { wedding } from "@/config/wedding";
import type { InvitationContent } from "@/types/invitation-content";

export function defaultInvitationContent(): InvitationContent {
  return {
    couple: {
      groom: wedding.couple.groom,
      bride: wedding.couple.bride,
      shortGroomName: wedding.couple.shortGroomName,
      shortBrideName: wedding.couple.shortBrideName,
      groomBio: "Một người luôn tin rằng những điều đẹp nhất được tạo nên từ sự chân thành.",
      brideBio: "Một người mang theo nụ cười ấm áp, làm mỗi ngày thường cũng trở nên đặc biệt.",
    },
    cover: { eyebrow: wedding.cover.eyebrow, message: wedding.cover.message, scrollCue: "Khám phá thiệp mời" },
    coupleSection: { eyebrow: "Cô dâu & chú rể", title: "Một tình yêu, một mái nhà", groomRole: "Chú rể", brideRole: "Cô dâu" },
    countdown: { eyebrow: "Save the date", title: "Ngày chung đôi đang đến gần" },
    story: {
      eyebrow: "Hành trình yêu thương",
      title: "Chuyện của chúng mình",
      milestones: wedding.story.map((item) => ({ ...item, imageSrc: null, imageFocusX: 50, imageFocusY: 50, imageZoom: 1 })),
    },
    event: {
      eyebrow: "Lễ thành hôn",
      title: "Hẹn gặp bạn trong ngày vui của chúng mình",
      dateTime: wedding.event.dateTime,
      dateLabel: wedding.event.dateLabel,
      timeLabel: wedding.event.timeLabel,
      rsvpDeadline: wedding.event.rsvpDeadline,
      venue: wedding.event.venue,
      address: wedding.event.address,
      mapsUrl: wedding.event.mapsUrl,
      timeHeading: "Thời gian",
      venueHeading: "Địa điểm",
      directionsLabel: "Xem chỉ đường",
    },
    gallery: { eyebrow: "Những khoảnh khắc", title: "Ngày vui của chúng mình" },
    personal: {
      eyebrow: "Thiệp mời dành riêng cho",
      message: `${wedding.couple.shortGroomName} & ${wedding.couple.shortBrideName} rất hân hạnh được đón tiếp bạn trong ngày vui của chúng mình.`,
    },
    rsvp: {
      eyebrow: "Xác nhận tham dự",
      title: "Chúng mình mong được gặp bạn",
      intro: "Vui lòng phản hồi trước ngày",
      greetingPrefix: "Thân mời",
      attendanceQuestion: "Bạn có thể tham dự cùng chúng mình không?",
      attendingLabel: "Sẽ tham dự",
      declinedLabel: "Rất tiếc, không thể tham dự",
      guestCountLabel: "Số người tham dự",
      guestCountSuffix: "người",
      messageLabel: "Lời nhắn",
      messagePlaceholder: `Gửi lời chúc tới ${wedding.couple.shortGroomName} & ${wedding.couple.shortBrideName}`,
      submitLabel: "Gửi xác nhận",
      submittingLabel: "Đang gửi...",
      closedMessage: "Đã hết hạn xác nhận tham dự.",
      successMessage: "Cảm ơn bạn đã xác nhận tham dự!",
    },
    footer: { title: `${wedding.couple.shortGroomName} & ${wedding.couple.shortBrideName}`, message: "Rất hân hạnh được đón tiếp bạn." },
  };
}
