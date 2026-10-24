// Minutes ahead of UTC for a time zone at a given moment (negative if behind).
// Works out the zone's wall-clock time and compares it with UTC, so it follows
// daylight saving changes without any hard-coded offsets.
export function utcOffsetMinutes(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
  }).formatToParts(date)
  const part = (type) => Number(parts.find(p => p.type === type).value)
  const localAsUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'))
  const wholeMinute = Math.floor(date.getTime() / 60000) * 60000
  return Math.round((localAsUtc - wholeMinute) / 60000)
}

// 180 -> "3", 330 -> "5:30"
function formatHours(minutes) {
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return mins ? `${hours}:${String(mins).padStart(2, '0')}` : `${hours}`
}

// "UTC-3", "UTC+5:30", "UTC"
export function formatUtcOffset(minutes) {
  if (minutes === 0) return 'UTC'
  return `UTC${minutes < 0 ? '-' : '+'}${formatHours(minutes)}`
}

// "3h behind UK", "1h ahead of UK", "Same as UK"
export function formatUkDifference(minutes, ukMinutes) {
  const diff = minutes - ukMinutes
  if (diff === 0) return 'Same as UK'
  return `${formatHours(diff)}h ${diff < 0 ? 'behind' : 'ahead of'} UK`
}

export function formatLocalTime(timeZone, date) {
  return date.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' })
}

export function formatLocalDay(timeZone, date) {
  return date.toLocaleDateString('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' })
}
