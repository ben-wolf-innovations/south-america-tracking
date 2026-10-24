import { useState, useEffect } from 'react'
import {
  utcOffsetMinutes, formatUtcOffset, formatUkDifference, formatLocalTime, formatLocalDay,
} from '../../utils/timeZones'

const UK_ZONE = 'Europe/London'
const TICK_MS = 15 * 1000

// Live local time for each place on the trip, with its offset from UTC and the UK.
export default function TimeZonesSection({ zones }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  const ukOffset = utcOffsetMinutes(UK_ZONE, now)

  return (
    <section className="info-section">
      <div className="section-heading">
        <h3>Time Zones</h3>
      </div>
      <p className="section-subtext">Local time now, and the difference from the UK</p>

      <div className="compact-grid">
        {zones.map((tz) => {
          const offset = utcOffsetMinutes(tz.zone, now)
          return (
            <div key={tz.zone} className="compact-card">
              <div className="compact-country">{tz.place}</div>
              <div className="tz-time">{formatLocalTime(tz.zone, now)}</div>
              <div className="tz-day">{formatLocalDay(tz.zone, now)}</div>
              <div className="compact-value">{formatUtcOffset(offset)}, {formatUkDifference(offset, ukOffset)}</div>
              {tz.note && <div className="compact-note">{tz.note}</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
