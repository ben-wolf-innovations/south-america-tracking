import { useState } from 'react'

// Edits the times, booking details and notes of an entry built from a stop.
// These are saved on the stop itself; its dates stay in Locations.
export default function StopEntryForm({ entry, onSave, onCancel }) {
  const isTransport = entry.type === 'transport'

  const [form, setForm] = useState({
    start_time: entry.start_time || '',
    end_time: entry.end_time || '',
    booked: entry.booked,
    booking_ref: entry.booking_ref || '',
    notes: entry.notes || '',
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // Maps the form onto the stop's own columns.
  const handleSubmit = (e) => {
    e.preventDefault()
    const updates = isTransport
      ? {
          transport_depart_time: form.start_time,
          transport_arrive_time: form.end_time,
          transport_booked: form.booked ? 1 : 0,
          transport_notes: form.notes,
        }
      : {
          [entry.type === 'checkin' ? 'checkin_time' : 'checkout_time']: form.start_time,
          accommodation_booked: form.booked ? 1 : 0,
          accommodation_booking_ref: form.booking_ref,
          accommodation_notes: form.notes,
        }
    onSave(entry.location_id, updates)
  }

  return (
    <form onSubmit={handleSubmit} className="plan-form">
      <div className="plan-form-grid">
        <label className="plan-field">
          <span>{isTransport ? 'Departs' : entry.type === 'checkin' ? 'Check-in time' : 'Check-out time'}</span>
          <input type="time" name="start_time" value={form.start_time} onChange={handleChange} />
        </label>
        {isTransport ? (
          <label className="plan-field">
            <span>Arrives</span>
            <input type="time" name="end_time" value={form.end_time} onChange={handleChange} />
          </label>
        ) : (
          <label className="plan-field">
            <span>Booking ref</span>
            <input name="booking_ref" value={form.booking_ref} onChange={handleChange} />
          </label>
        )}
        <label className="plan-check">
          <input type="checkbox" name="booked" checked={form.booked} onChange={handleChange} />
          <span>Booked</span>
        </label>
        <label className="plan-field full">
          <span>Notes</span>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows="3"
            placeholder={isTransport ? 'Meeting point, terminal, what to bring...' : 'Address, how to get there, key collection...'}
          />
        </label>
      </div>
      <p className="plan-form-note">
        {isTransport
          ? 'Saved on the stop. Change the date or method in Locations.'
          : 'Saved on the stop. Booking ref and notes are shared by its check-in and check-out. Change dates in Locations.'}
      </p>
      <div className="plan-form-actions">
        <button type="button" onClick={onCancel} className="plan-btn secondary">Cancel</button>
        <button type="submit" className="plan-btn primary">Save</button>
      </div>
    </form>
  )
}
