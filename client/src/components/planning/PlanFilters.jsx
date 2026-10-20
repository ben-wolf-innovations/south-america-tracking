import { TYPE_LABELS, stopLabel } from '../../utils/planning'

export const EMPTY_FILTERS = { type: '', locationId: '', notBooked: false, showPast: false }

export default function PlanFilters({ filters, stops, onChange }) {
  const set = (name, value) => onChange({ ...filters, [name]: value })
  const active = filters.type || filters.locationId || filters.notBooked || filters.showPast

  return (
    <div className="plan-filters">
      <select value={filters.type} onChange={(e) => set('type', e.target.value)} aria-label="Filter by type">
        <option value="">All types</option>
        {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select value={filters.locationId} onChange={(e) => set('locationId', e.target.value)} aria-label="Filter by stop">
        <option value="">All stops</option>
        {stops.map(stop => <option key={stop.id} value={stop.id}>{stopLabel(stop)}</option>)}
      </select>
      <label className="plan-check">
        <input type="checkbox" checked={filters.notBooked} onChange={(e) => set('notBooked', e.target.checked)} />
        <span>Not booked</span>
      </label>
      <label className="plan-check">
        <input type="checkbox" checked={filters.showPast} onChange={(e) => set('showPast', e.target.checked)} />
        <span>Show past days</span>
      </label>
      {active && (
        <button onClick={() => onChange(EMPTY_FILTERS)} className="plan-btn secondary">Clear</button>
      )}
    </div>
  )
}
