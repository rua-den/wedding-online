export function formatWeddingHeroDate(eventTime: string) {
  const date = new Date(eventTime);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const valueFor = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return { day: valueFor("day"), month: `THÁNG ${valueFor("month")}`, year: valueFor("year") };
}
