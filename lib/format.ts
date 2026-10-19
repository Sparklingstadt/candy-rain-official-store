const orderDateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

// Pin the locale and time zone so server-rendered dates do not depend on the host.
export function formatOrderDateTime(date: Date): string {
  return orderDateTimeFormat.format(date)
}
