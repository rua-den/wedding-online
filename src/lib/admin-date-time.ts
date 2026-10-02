const datetimeLocalPrefix = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/;

export function vietnamIsoToDatetimeLocal(value: string): string {
  const instant = new Date(value);
  if (!value || Number.isNaN(instant.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function datetimeLocalToVietnamIso(value: string): string {
  const normalized = value.match(datetimeLocalPrefix)?.[1];
  if (!normalized) return "";
  return `${normalized}:00+07:00`;
}
