export type LoveStoryMilestone = {
  date: string;
  title: string;
  description: string;
};

export const wedding = {
  couple: {
    groom: "Nguyễn Hải Khánh Huy",
    bride: "Nguyễn Thị Phượng Nhi",
    shortGroomName: "Huy",
    shortBrideName: "Nhi",
  },
  event: {
    dateTime: "2027-12-19T10:30:00+07:00",
    dateLabel: "Chủ Nhật, ngày 19 tháng 12 năm 2027",
    timeLabel: "10:30 sáng",
    rsvpDeadline: "2027-12-05T23:59:59+07:00",
    venue: "The Garden Wedding Venue",
    address: "123 Đường Hoa Nắng, Quận 2, Thành phố Hồ Chí Minh",
    mapsUrl: "https://maps.google.com/?q=The+Garden+Wedding+Venue",
  },
  cover: {
    eyebrow: "Trân trọng kính mời",
    message: "Cùng chúng mình đánh dấu một khởi đầu dịu dàng và đầy thương mến.",
  },
  story: [
    { date: "Mùa thu 2020", title: "Lần đầu gặp gỡ", description: "Một cuộc trò chuyện tình cờ đã mở ra hành trình của hai người xa lạ." },
    { date: "Mùa hè 2022", title: "Chúng mình chính thức", description: "Từ những điều bình dị mỗi ngày, Huy và Nhi nhận ra đã tìm thấy nhau." },
    { date: "Mùa xuân 2025", title: "Lời hứa bên nhau", description: "Giữa những người thân yêu, một lời hứa được trao bằng tất cả chân thành." },
    { date: "Mùa đông 2027", title: "Ngày chung đôi", description: "Và bây giờ, chúng mình mong được đón khoảnh khắc này cùng bạn." },
  ] satisfies LoveStoryMilestone[],
} as const;
