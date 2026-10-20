import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../config/api'
import { useDataRefresh } from '../hooks/useDataRefresh'
import { localToday, formatDayHeading } from '../utils/planning'
import PlanEntry from '../components/planning/PlanEntry'
import PlanItemForm from '../components/planning/PlanItemForm'
import PlanFilters, { EMPTY_FILTERS } from '../components/planning/PlanFilters'
import './Planning.css'

function matchesFilters(entry, filters, today) {
  if (!filters.showPast && entry.date < today) return false
  if (filters.type && entry.type !== filters.type) return false
  if (filters.notBooked && entry.booked) return false
  if (filters.locationId) {
    const id = Number(filters.locationId)
    if (entry.location_id !== id && entry.from_location_id !== id) return false
  }
  return true
}

function groupByDay(entries) {
  const days = []
  for (const entry of entries) {
    const last = days[days.length - 1]
    if (last?.date === entry.date) last.entries.push(entry)
    else days.push({ date: entry.date, entries: [entry] })
  }
  return days
}

// Admin planner: every check-in, check-out and transport from Locations plus
// tours and other entries, grouped by day in time order.
export default function Planning() {
  const [searchParams] = useSearchParams()
  const [entries, setEntries] = useState([])
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, locationId: searchParams.get('location') || '' })
  // The key of the entry being edited, or 'new' for the add form.
  const [editingKey, setEditingKey] = useState(null)

  useEffect(() => {
    loadPlanning()
  }, [])

  const loadPlanning = async () => {
    try {
      const [planningRes, locationsRes] = await Promise.all([
        api.get('/planning'),
        api.get('/locations')
      ])
      setEntries(planningRes.data.data)
      setStops(locationsRes.data.data
        .filter(l => l.is_travel_overnight !== 1)
        .map(l => ({ id: l.id, name: l.name, arrival: l.arrival_date || l.estimated_arrival_date })))
      setError(null)
    } catch (err) {
      console.error('Failed to load planning:', err)
      setError(`Failed to load planning: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useDataRefresh(loadPlanning)

  const savePlanItem = async (id, data) => {
    try {
      if (id) await api.put(`/planning/${id}`, data)
      else await api.post('/planning', data)
      await loadPlanning()
      setEditingKey(null)
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message))
    }
  }

  const saveStop = async (locationId, updates) => {
    try {
      await api.put(`/locations/${locationId}`, updates)
      await loadPlanning()
      setEditingKey(null)
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message))
    }
  }

  const deletePlanItem = async (entry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return
    try {
      await api.delete(`/planning/${entry.id}`)
      await loadPlanning()
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return <div className="planning-page"><p className="plan-status">Loading planning...</p></div>
  }

  const today = localToday()
  const visible = entries.filter(entry => matchesFilters(entry, filters, today))
  const days = groupByDay(visible)
  const notBookedCount = visible.filter(entry => !entry.booked).length

  const jumpToToday = () => {
    const target = days.find(day => day.date >= today)
    document.getElementById(`plan-day-${target?.date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // A new entry starts on the filtered stop, if there is one.
  const filteredStop = stops.find(stop => String(stop.id) === filters.locationId)
  const newDefaults = filteredStop ? { location_id: String(filteredStop.id), date: filteredStop.arrival || '' } : {}

  return (
    <div className="planning-page">
      <div className="planning-header">
        <div>
          <h2>Planning</h2>
          <p className="subtitle">{visible.length} entries, {notBookedCount} not booked</p>
        </div>
        <div className="planning-header-actions">
          {filters.showPast && (
            <button onClick={jumpToToday} className="plan-btn secondary">Jump to today</button>
          )}
          {editingKey !== 'new' && (
            <button onClick={() => setEditingKey('new')} className="plan-btn primary">Add plan</button>
          )}
        </div>
      </div>

      {error && <p className="plan-error">{error}</p>}

      {editingKey === 'new' && (
        <div className="plan-add">
          <h3>Add a tour or other plan</h3>
          <PlanItemForm
            defaults={newDefaults}
            stops={stops}
            onSave={(data) => savePlanItem(null, data)}
            onCancel={() => setEditingKey(null)}
          />
        </div>
      )}

      <PlanFilters filters={filters} stops={stops} onChange={setFilters} />

      {days.length === 0 ? (
        <p className="plan-status">Nothing planned matches these filters.</p>
      ) : (
        days.map(day => (
          <section key={day.date} id={`plan-day-${day.date}`} className={`plan-day ${day.date < today ? 'past' : ''}`}>
            <h3 className="plan-day-heading">
              {formatDayHeading(day.date)}
              {day.date === today && <span className="plan-today">Today</span>}
            </h3>
            <ul className="plan-entries">
              {day.entries.map(entry => (
                <PlanEntry
                  key={entry.key}
                  entry={entry}
                  stops={stops}
                  editing={editingKey === entry.key}
                  onEdit={() => setEditingKey(entry.key)}
                  onCancel={() => setEditingKey(null)}
                  onSavePlanItem={savePlanItem}
                  onSaveStop={saveStop}
                  onDelete={deletePlanItem}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
