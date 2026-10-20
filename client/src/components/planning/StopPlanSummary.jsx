import { Link } from 'react-router-dom'
import { TYPE_LABELS, formatTimes } from '../../utils/planning'
import './StopPlanSummary.css'

// Short one-line label: "Check-in 15:00", "Bus 08:30 - 14:00", "Rainbow Mountain".
function chipLabel(entry) {
  const name = entry.type === 'checkin' || entry.type === 'checkout' ? TYPE_LABELS[entry.type] : entry.title
  const times = formatTimes(entry)
  return times ? `${name} ${times}` : name
}

// A booked check-in with no time says nothing new, so the summary only shows
// entries with a time, anything not booked yet, and added plans.
const worthShowing = (entry) => entry.start_time || !entry.booked || entry.source === 'plan'

// Brief view of a stop's plans for the Itinerary, linking to the full planner.
export default function StopPlanSummary({ locationId, entries }) {
  if (entries.length === 0) return null
  const shown = entries.filter(worthShowing)

  return (
    <div className="stop-plan">
      <ul className="stop-plan-chips">
        {shown.map(entry => (
          <li
            key={entry.key}
            className={`stop-plan-chip ${entry.booked ? '' : 'unbooked'}`}
            title={entry.booked ? 'Booked' : 'Not booked'}
          >
            {chipLabel(entry)}
          </li>
        ))}
      </ul>
      <Link to={`/planning?location=${locationId}`} className="stop-plan-link">Open in Planning</Link>
    </div>
  )
}
