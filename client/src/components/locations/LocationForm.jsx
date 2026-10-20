// The add and edit form for a stop. Add mode can insert at a position; edit
// mode also shows the stop's estimated dates and the actual costs logged
// against it on the Costs page.

export const EMPTY_LOCATION_FORM = {
  name: '',
  country: '',
  latitude: '',
  longitude: '',
  nights: 0,
  accommodation_name: '',
  accommodation_cost_planned: '',
  accommodation_booking_ref: '',
  accommodation_booked: false,
  arrival_date: '',
  departure_date: '',
  activities: '',
  activities_cost_planned: '',
  food_drink_cost_planned: '',
  travel_method: '',
  travel_cost_planned: '',
  travel_duration: '',
  transport_booked: false,
  notes: '',
  sequence: '',
  is_travel_overnight: false
}

export function locationToForm(location) {
  return {
    name: location.name || '',
    country: location.country || '',
    latitude: location.latitude || '',
    longitude: location.longitude || '',
    nights: location.nights || 0,
    accommodation_name: location.accommodation_name || '',
    accommodation_cost_planned: location.accommodation_cost_planned || '',
    accommodation_booking_ref: location.accommodation_booking_ref || '',
    accommodation_booked: location.accommodation_booked === 1,
    arrival_date: location.arrival_date || '',
    departure_date: location.departure_date || '',
    activities: location.activities || '',
    activities_cost_planned: location.activities_cost_planned || '',
    food_drink_cost_planned: location.food_drink_cost_planned || '',
    travel_method: location.travel_method || '',
    travel_cost_planned: location.travel_cost_planned || '',
    travel_duration: location.travel_duration || '',
    transport_booked: location.transport_booked === 1,
    notes: location.notes || '',
    sequence: '',
    is_travel_overnight: location.is_travel_overnight === 1
  }
}

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const formatActual = (value) => (value ? `£${parseFloat(value).toFixed(2)}` : '£0.00')

function DateField({ label, name, value, onChange, onClear }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <div className="date-input-group">
        <input type="date" name={name} value={value} onChange={onChange} />
        {value && (
          <button type="button" className="clear-date-btn" onClick={() => onClear(name)} title="Clear date">
            &times;
          </button>
        )}
      </div>
    </div>
  )
}

function ActualCostField({ label, value }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        type="text"
        value={formatActual(value)}
        disabled
        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
      />
      <small style={{ color: '#666', fontSize: '0.85em' }}>Auto-calculated from Costs page</small>
    </div>
  )
}

export default function LocationForm({ mode, formData, location, maxSequence, onChange, onClearDate, onSubmit, onCancel }) {
  const isEdit = mode === 'edit'
  const hasEstimate = isEdit && (location?.estimated_arrival_date || location?.estimated_departure_date)

  return (
    <form onSubmit={onSubmit} className={`location-form ${isEdit ? 'inline' : ''}`}>
      <div className="form-section">
        <h4>Basic Information</h4>
        <div className="form-grid">
          <div className="form-field">
            <label>Location Name *</label>
            <input type="text" name="name" value={formData.name} onChange={onChange} required placeholder="e.g., Lima" />
          </div>
          <div className="form-field">
            <label>Country *</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={onChange}
              required={!formData.is_travel_overnight}
              placeholder="e.g., Peru"
            />
          </div>
          <div className="form-field">
            <label>Latitude *</label>
            <input type="number" step="any" name="latitude" value={formData.latitude} onChange={onChange} required placeholder="-12.0464" />
          </div>
          <div className="form-field">
            <label>Longitude *</label>
            <input type="number" step="any" name="longitude" value={formData.longitude} onChange={onChange} required placeholder="-77.0428" />
          </div>
          <div className="form-field">
            <label>Nights</label>
            <input type="number" name="nights" value={formData.nights} onChange={onChange} min="0" placeholder="2" />
          </div>
          {!isEdit && (
            <div className="form-field">
              <label>Insert at Position</label>
              <input
                type="number"
                name="sequence"
                value={formData.sequence}
                onChange={onChange}
                min="1"
                max={maxSequence}
                placeholder={`Leave empty for end (${maxSequence})`}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <h4>Dates</h4>
        {hasEstimate && (
          <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>
            <strong>Estimated:</strong>{' '}
            {location.estimated_arrival_date && formatDate(location.estimated_arrival_date)}
            {' - '}
            {location.estimated_departure_date && formatDate(location.estimated_departure_date)}
            <br />
            <em>Leave blank to use estimated dates, or enter actual dates below</em>
          </p>
        )}
        <div className="form-grid">
          <DateField label="Arrival Date" name="arrival_date" value={formData.arrival_date} onChange={onChange} onClear={onClearDate} />
          <DateField label="Departure Date" name="departure_date" value={formData.departure_date} onChange={onChange} onClear={onClearDate} />
        </div>
      </div>

      <div className="form-section">
        <h4>Accommodation</h4>
        <div className="form-grid">
          <div className="form-field">
            <label>Name</label>
            <input type="text" name="accommodation_name" value={formData.accommodation_name} onChange={onChange} placeholder="Hostel/Hotel name" />
          </div>
          <div className="form-field">
            <label>Budget (£ per night)</label>
            <input type="number" step="0.01" name="accommodation_cost_planned" value={formData.accommodation_cost_planned} onChange={onChange} placeholder="50.00" />
          </div>
          {isEdit && <ActualCostField label="Actual Cost (£ total for stay)" value={location?.accommodation_cost_actual} />}
          <div className="form-field">
            <label>Booking Ref</label>
            <input type="text" name="accommodation_booking_ref" value={formData.accommodation_booking_ref} onChange={onChange} />
          </div>
          <div className="form-field">
            <label className="checkbox-label">
              <input type="checkbox" name="accommodation_booked" checked={formData.accommodation_booked} onChange={onChange} />
              <span>Accommodation Booked</span>
            </label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Travel Details</h4>
        <div className="form-grid">
          <div className="form-field">
            <label>Method</label>
            <input type="text" name="travel_method" value={formData.travel_method} onChange={onChange} placeholder="Bus/Flight/Train" />
          </div>
          <div className="form-field">
            <label>Budget (£ total)</label>
            <input type="number" step="0.01" name="travel_cost_planned" value={formData.travel_cost_planned} onChange={onChange} placeholder="25.00" />
          </div>
          {isEdit && <ActualCostField label="Actual Cost (£ total)" value={location?.travel_cost_actual} />}
          <div className="form-field">
            <label>Duration (hours)</label>
            <input type="number" step="0.1" name="travel_duration" value={formData.travel_duration} onChange={onChange} placeholder="4.5" />
          </div>
          <div className="form-field">
            <label className="checkbox-label">
              <input type="checkbox" name="transport_booked" checked={formData.transport_booked} onChange={onChange} />
              <span>Transport Booked</span>
            </label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Budget Planning</h4>
        <div className="form-grid">
          <div className="form-field">
            <label>Activities Budget (£ total)</label>
            <input type="number" step="0.01" name="activities_cost_planned" value={formData.activities_cost_planned} onChange={onChange} placeholder="100.00" />
          </div>
          <div className="form-field">
            <label>Food & Drink Budget (£ per day)</label>
            <input type="number" step="0.01" name="food_drink_cost_planned" value={formData.food_drink_cost_planned} onChange={onChange} placeholder="30.00" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Additional Details</h4>
        <div className="form-field full-width">
          <label>Activities</label>
          <textarea name="activities" value={formData.activities} onChange={onChange} rows="3" placeholder="Things to do here..." />
        </div>
        <div className="form-field full-width">
          <label>Notes</label>
          <textarea name="notes" value={formData.notes} onChange={onChange} rows="3" placeholder="Any additional notes..." />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-button">Cancel</button>
        <button type="submit" className="submit-button">{isEdit ? 'Update Location' : 'Add Location'}</button>
      </div>
    </form>
  )
}
