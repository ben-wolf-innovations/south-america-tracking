export const TYPE_LABELS = {
  checkin: 'Check-in',
  checkout: 'Check-out',
  transport: 'Transport',
  tour: 'Tour',
  other: 'Other',
}

// Types that can be added by hand. The rest come from Locations.
export const PLAN_ITEM_TYPES = ['tour', 'transport', 'other']

// Today as YYYY-MM-DD in the viewer's local time, to compare with entry dates.
export function localToday() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// Dates are plain YYYY-MM-DD, so build them at midday to avoid any timezone
// shift moving them to the previous day.
function toDate(value) {
  return new Date(`${value}T12:00:00`)
}

export function formatDayHeading(value) {
  return toDate(value).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatShortDate(value) {
  return toDate(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// The end time, with "+1" when it falls on the next day (an overnight bus).
export function formatEndTime(entry) {
  const { start_time: start, end_time: end } = entry
  if (!end) return null
  return start && end < start ? `${end} +1` : end
}

// "08:30", "08:30 - 14:00", or "22:00 - 07:00 +1".
export function formatTimes(entry) {
  const end = formatEndTime(entry)
  if (!entry.start_time && !end) return null
  if (!end) return entry.start_time
  return `${entry.start_time || '?'} - ${end}`
}

// Stop names repeat (Cusco twice), so pickers show the arrival date too.
export function stopLabel(stop) {
  return stop.arrival ? `${stop.name} (${formatShortDate(stop.arrival)})` : stop.name
}

export function entryPlace(entry) {
  if (entry.type === 'transport' && entry.source === 'location') {
    return entry.from_name ? `${entry.from_name} to ${entry.location_name}` : `To ${entry.location_name}`
  }
  return entry.location_name
}
