/** Formats a track length as `m:ss`. Rounds total seconds first so 119,600 ms is `2:00`, not `1:60`. */
export function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/** Formats an ISO timestamp as a time of day (e.g. `10:32 PM`) in the viewer's time zone. */
export function formatTimeOfDay(iso: string | null | undefined) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

/** Sorts ISO timestamps ascending; missing or invalid values go last. */
export function compareTimestamps(a: string | null | undefined, b: string | null | undefined) {
  const timeA = a ? Date.parse(a) : NaN
  const timeB = b ? Date.parse(b) : NaN
  if (Number.isNaN(timeA)) return Number.isNaN(timeB) ? 0 : 1
  if (Number.isNaN(timeB)) return -1
  return timeA - timeB
}
