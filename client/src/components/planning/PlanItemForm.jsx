import { useState } from 'react'
import { TYPE_LABELS, PLAN_ITEM_TYPES, stopLabel } from '../../utils/planning'

const EMPTY = {
  type: 'tour', title: '', location_id: '', date: '', start_time: '', end_time: '',
  booked: false, booking_ref: '', address: '', notes: '',
}

// Add or edit a tour, transport or other entry. Picking a stop fills in its
// arrival date when no date is set yet.
export default function PlanItemForm({ entry, defaults, stops, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!entry) return { ...EMPTY, ...defaults }
    return {
      type: entry.type,
      title: entry.title,
      location_id: entry.location_id ? String(entry.location_id) : '',
      date: entry.date,
      start_time: entry.start_time || '',
      end_time: entry.end_time || '',
      booked: entry.booked,
      booking_ref: entry.booking_ref || '',
      address: entry.address || '',
      notes: entry.notes || '',
    }
  })

  const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }))

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    set(name, type === 'checkbox' ? checked : value)
  }

  const handleStopChange = (e) => {
    const locationId = e.target.value
    const stop = stops.find(s => String(s.id) === locationId)
    setForm(prev => ({
      ...prev,
      location_id: locationId,
      date: prev.date || stop?.arrival || '',
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, location_id: form.location_id ? Number(form.location_id) : null })
  }

  return (
    <form onSubmit={handleSubmit} className="plan-form">
      <div className="plan-form-grid">
        <label className="plan-field">
          <span>Type</span>
          <select name="type" value={form.type} onChange={handleChange}>
            {PLAN_ITEM_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="plan-field wide">
          <span>Title *</span>
          <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Rainbow Mountain tour" required />
        </label>
        <label className="plan-field wide">
          <span>Stop</span>
          <select name="location_id" value={form.location_id} onChange={handleStopChange}>
            <option value="">Not linked to a stop</option>
            {stops.map(stop => (
              <option key={stop.id} value={stop.id}>{stopLabel(stop)}</option>
            ))}
          </select>
        </label>
        <label className="plan-field">
          <span>Date *</span>
          <input type="date" name="date" value={form.date} onChange={handleChange} required />
        </label>
        <label className="plan-field">
          <span>Start</span>
          <input type="time" name="start_time" value={form.start_time} onChange={handleChange} />
        </label>
        <label className="plan-field">
          <span>End</span>
          <input type="time" name="end_time" value={form.end_time} onChange={handleChange} />
        </label>
        <label className="plan-field">
          <span>Booking ref</span>
          <input name="booking_ref" value={form.booking_ref} onChange={handleChange} />
        </label>
        <label className="plan-field wide">
          <span>Meeting point / address</span>
          <input name="address" value={form.address} onChange={handleChange} />
        </label>
        <label className="plan-field wide">
          <span>Notes</span>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" />
        </label>
        <label className="plan-check">
          <input type="checkbox" name="booked" checked={form.booked} onChange={handleChange} />
          <span>Booked</span>
        </label>
      </div>
      <div className="plan-form-actions">
        <button type="button" onClick={onCancel} className="plan-btn secondary">Cancel</button>
        <button type="submit" className="plan-btn primary">{entry ? 'Save' : 'Add'}</button>
      </div>
    </form>
  )
}
