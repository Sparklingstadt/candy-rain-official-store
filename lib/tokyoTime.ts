// Japan has no daylight saving time, so Asia/Tokyo is always UTC+9.
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000

// The start of `now`'s day and month in Japan time, as instants. The server runs in UTC, so the boundaries are computed explicitly.
export function tokyoPeriodStarts(now: Date): { dayStart: Date, monthStart: Date } {
  const tokyo = new Date(now.getTime() + TOKYO_OFFSET_MS)
  const year = tokyo.getUTCFullYear()
  const month = tokyo.getUTCMonth()
  return {
    dayStart: new Date(Date.UTC(year, month, tokyo.getUTCDate()) - TOKYO_OFFSET_MS),
    monthStart: new Date(Date.UTC(year, month, 1) - TOKYO_OFFSET_MS),
  }
}
