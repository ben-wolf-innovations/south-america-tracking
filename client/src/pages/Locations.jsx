import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import './Locations.css'

export default function Locations() {
  const { isAdmin } = useAuth()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    latitude: '',
    longitude: '',
    nights: 0,
    accommodation_name: '',
    accommodation_type: '',
    accommodation_cost_planned: '',
    arrival_date: '',
    departure_date: '',
    activities: '',
    activities_cost_planned: '',
    food_drink_cost_planned: '',
    travel_from: '',
    travel_method: '',
    travel_cost_planned: '',
    travel_duration: '',
    notes: '',
    sequence: ''
  })

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/locations')
      setLocations(response.data.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load locations:', err)
      setError('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      country: '',
      latitude: '',
      longitude: '',
      nights: 0,
      accommodation_name: '',
      accommodation_type: '',
      accommodation_cost_planned: '',
      arrival_date: '',
      departure_date: '',
      activities: '',
      activities_cost_planned: '',
      food_drink_cost_planned: '',
      travel_from: '',
      travel_method: '',
      travel_cost_planned: '',
      travel_duration: '',
      notes: '',
      sequence: ''
    })
    setShowAddForm(false)
    setEditingLocation(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddLocation = async (e) => {
    e.preventDefault()
    try {
      // Remove empty fields and convert types
      const payload = {}
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null) {
          if (['nights', 'sequence'].includes(key)) {
            payload[key] = parseInt(formData[key]) || 0
          } else if (['latitude', 'longitude', 'accommodation_cost_planned', 'activities_cost_planned', 'food_drink_cost_planned', 'travel_cost_planned', 'travel_duration'].includes(key)) {
            payload[key] = parseFloat(formData[key]) || 0
          } else {
            payload[key] = formData[key]
          }
        }
      })

      await api.post('/locations', payload)
      await loadLocations()
      resetForm()
    } catch (err) {
      console.error('Failed to add location:', err)
      alert('Failed to add location: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleEditLocation = async (e) => {
    e.preventDefault()
    try {
      const payload = {}
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null && key !== 'sequence') {
          if (['nights'].includes(key)) {
            payload[key] = parseInt(formData[key]) || 0
          } else if (['latitude', 'longitude', 'accommodation_cost_planned', 'activities_cost_planned', 'food_drink_cost_planned', 'travel_cost_planned', 'travel_duration'].includes(key)) {
            payload[key] = parseFloat(formData[key]) || 0
          } else {
            payload[key] = formData[key]
          }
        }
      })

      await api.put(`/locations/${editingLocation.id}`, payload)
      await loadLocations()
      resetForm()
    } catch (err) {
      console.error('Failed to update location:', err)
      alert('Failed to update location: ' + (err.response?.data?.error || err.message))
    }
  }

  const startEdit = (location) => {
    setFormData({
      name: location.name || '',
      country: location.country || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      nights: location.nights || 0,
      accommodation_name: location.accommodation_name || '',
      accommodation_type: location.accommodation_type || '',
      accommodation_cost_planned: location.accommodation_cost_planned || '',
      arrival_date: location.arrival_date || '',
      departure_date: location.departure_date || '',
      activities: location.activities || '',
      activities_cost_planned: location.activities_cost_planned || '',
      food_drink_cost_planned: location.food_drink_cost_planned || '',
      travel_from: location.travel_from || '',
      travel_method: location.travel_method || '',
      travel_cost_planned: location.travel_cost_planned || '',
      travel_duration: location.travel_duration || '',
      notes: location.notes || '',
      sequence: ''
    })
    setEditingLocation(location)
    setShowAddForm(false)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/locations/${id}`)
      await loadLocations()
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete location:', err)
      alert('Failed to delete location: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleReorder = async (locationId, direction) => {
    try {
      const currentIndex = locations.findIndex(loc => loc.id === locationId)
      if (direction === 'up' && currentIndex === 0) return
      if (direction === 'down' && currentIndex === locations.length - 1) return

      const newSequence = direction === 'up'
        ? locations[currentIndex - 1].sequence
        : locations[currentIndex + 1].sequence

      await api.put(`/locations/${locationId}/reorder`, { new_sequence: newSequence })
      await loadLocations()
    } catch (err) {
      console.error('Failed to reorder location:', err)
      alert('Failed to reorder location: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return (
      <div className="locations-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading locations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="locations-page">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadLocations} className="retry-button">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="locations-page">
      <div className="locations-header">
        <div>
          <h2>📍 Locations</h2>
          <p className="subtitle">{locations.length} stops on your journey</p>
        </div>
        {isAdmin() && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="add-button"
          >
            ➕ Add Location
          </button>
        )}
      </div>

      {/* Add Form Only */}
      {showAddForm && (
        <div className="location-form-container">
          <div className="location-form-header">
            <h3>➕ Add New Location</h3>
            <button onClick={resetForm} className="close-button">✕</button>
          </div>
          <form onSubmit={handleAddLocation} className="location-form">
            <div className="form-section">
              <h4>Basic Information</h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>Location Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Lima"
                  />
                </div>
                <div className="form-field">
                  <label>Country *</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Peru"
                  />
                </div>
                <div className="form-field">
                  <label>Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    required
                    placeholder="-12.0464"
                  />
                </div>
                <div className="form-field">
                  <label>Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    required
                    placeholder="-77.0428"
                  />
                </div>
                <div className="form-field">
                  <label>Nights</label>
                  <input
                    type="number"
                    name="nights"
                    value={formData.nights}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="2"
                  />
                </div>
                <div className="form-field">
                  <label>Insert at Position</label>
                  <input
                    type="number"
                    name="sequence"
                    value={formData.sequence}
                    onChange={handleInputChange}
                    min="1"
                    max={locations.length + 1}
                    placeholder={`Leave empty for end (${locations.length + 1})`}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Dates</h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>Arrival Date</label>
                  <input
                    type="date"
                    name="arrival_date"
                    value={formData.arrival_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-field">
                  <label>Departure Date</label>
                  <input
                    type="date"
                    name="departure_date"
                    value={formData.departure_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Accommodation</h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name</label>
                  <input
                    type="text"
                    name="accommodation_name"
                    value={formData.accommodation_name}
                    onChange={handleInputChange}
                    placeholder="Hostel/Hotel name"
                  />
                </div>
                <div className="form-field">
                  <label>Type</label>
                  <input
                    type="text"
                    name="accommodation_type"
                    value={formData.accommodation_type}
                    onChange={handleInputChange}
                    placeholder="Hostel/Hotel/Airbnb"
                  />
                </div>
                <div className="form-field">
                  <label>Budget (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="accommodation_cost_planned"
                    value={formData.accommodation_cost_planned}
                    onChange={handleInputChange}
                    placeholder="50.00"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Travel Details</h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>From</label>
                  <input
                    type="text"
                    name="travel_from"
                    value={formData.travel_from}
                    onChange={handleInputChange}
                    placeholder="Previous location"
                  />
                </div>
                <div className="form-field">
                  <label>Method</label>
                  <input
                    type="text"
                    name="travel_method"
                    value={formData.travel_method}
                    onChange={handleInputChange}
                    placeholder="Bus/Flight/Train"
                  />
                </div>
                <div className="form-field">
                  <label>Budget (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="travel_cost_planned"
                    value={formData.travel_cost_planned}
                    onChange={handleInputChange}
                    placeholder="25.00"
                  />
                </div>
                <div className="form-field">
                  <label>Duration</label>
                  <input
                    type="number"
                    step="0.1"
                    name="travel_duration"
                    value={formData.travel_duration}
                    onChange={handleInputChange}
                    placeholder="4.5 hours"
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="form-section">
              <h4>Budget Planning</h4>
              <div className="form-grid">
                <div className="form-field">
                  <label>Activities Budget (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="activities_cost_planned"
                    value={formData.activities_cost_planned}
                    onChange={handleInputChange}
                    placeholder="100.00"
                  />
                </div>
                <div className="form-field">
                  <label>Food & Drink Budget (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="food_drink_cost_planned"
                    value={formData.food_drink_cost_planned}
                    onChange={handleInputChange}
                    placeholder="150.00"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Additional Details</h4>
              <div className="form-field full-width">
                <label>Activities</label>
                <textarea
                  name="activities"
                  value={formData.activities}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Things to do here..."
                />
              </div>
              <div className="form-field full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button">
                Add Location
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations List */}
      <div className="locations-list">
        {locations.map((location, index) => {
          const isEditing = editingLocation?.id === location.id
          
          return (
          <div key={location.id} className={`location-card ${isEditing ? 'editing' : ''}`}>
            <div className="location-card-header">
              <div className="location-sequence">#{location.sequence}</div>
              <div className="location-main">
                <h3>
                  {location.name}
                  {location.is_current === 1 && <span className="current-badge">Current</span>}
                </h3>
                <p className="country">📍 {location.country}</p>
              </div>
              {isAdmin() && !showAddForm && (
                <div className="location-actions">
                  <button
                    onClick={() => handleReorder(location.id, 'up')}
                    disabled={index === 0 || isEditing}
                    className="reorder-button"
                    title="Move up"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => handleReorder(location.id, 'down')}
                    disabled={index === locations.length - 1 || isEditing}
                    className="reorder-button"
                    title="Move down"
                  >
                    ⬇️
                  </button>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(location)}
                      className="edit-button"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(location.id)}
                    className="delete-button"
                    title="Delete"
                    disabled={isEditing}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

            {/* Show view mode or edit mode */}
            {!isEditing ? (
            <div className="location-card-body">
              <div className="location-info-grid">
                {location.nights > 0 && (
                  <div className="info-item">
                    <span className="info-label">🛏️ Nights:</span>
                    <span className="info-value">{location.nights}</span>
                  </div>
                )}
                {location.arrival_date && (
                  <div className="info-item">
                    <span className="info-label">📅 Arrival:</span>
                    <span className="info-value">{new Date(location.arrival_date).toLocaleDateString()}</span>
                  </div>
                )}
                {location.departure_date && (
                  <div className="info-item">
                    <span className="info-label">📅 Departure:</span>
                    <span className="info-value">{new Date(location.departure_date).toLocaleDateString()}</span>
                  </div>
                )}
                {location.accommodation_name && (
                  <div className="info-item">
                    <span className="info-label">🏨 Accommodation:</span>
                    <span className="info-value">{location.accommodation_name}</span>
                  </div>
                )}
                {location.accommodation_type && (
                  <div className="info-item">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{location.accommodation_type}</span>
                  </div>
                )}
                {(location.accommodation_cost_planned || location.accommodation_cost_actual) && (
                  <div className="info-item">
                    <span className="info-label">💰 Accom. Cost:</span>
                    <span className="info-value">
                      {location.accommodation_cost_planned ? `£${parseFloat(location.accommodation_cost_planned).toFixed(2)} budgeted` : ''}
                      {location.accommodation_cost_actual && ` (£${parseFloat(location.accommodation_cost_actual).toFixed(2)} actual)`}
                    </span>
                  </div>
                )}
                {location.travel_from && (
                  <div className="info-item">
                    <span className="info-label">🚌 From:</span>
                    <span className="info-value">{location.travel_from}</span>
                  </div>
                )}
                {location.travel_method && (
                  <div className="info-item">
                    <span className="info-label">Method:</span>
                    <span className="info-value">{location.travel_method}</span>
                  </div>
                )}
                {(location.travel_cost_planned || location.travel_cost_actual) && (
                  <div className="info-item">
                    <span className="info-label">💸 Travel Cost:</span>
                    <span className="info-value">
                      {location.travel_cost_planned ? `£${parseFloat(location.travel_cost_planned).toFixed(2)} budgeted` : ''}
                      {location.travel_cost_actual && ` (£${parseFloat(location.travel_cost_actual).toFixed(2)} actual)`}
                    </span>
                  </div>
                )}
                {location.travel_duration && (
                  <div className="info-item">
                    <span className="info-label">⏱️ Duration:</span>
                    <span className="info-value">{location.travel_duration}h</span>
                  </div>
                )}
              </div>
              {location.activities && (
                <div className="location-activities">
                  <strong>✨ Activities:</strong> {location.activities}
                </div>
              )}
              {(location.activities_cost_planned || location.activities_cost_actual) && (
                <div className="info-item">
                  <span className="info-label">🎯 Activities Budget:</span>
                  <span className="info-value">
                    {location.activities_cost_planned ? `£${parseFloat(location.activities_cost_planned).toFixed(2)} budgeted` : ''}
                    {location.activities_cost_actual && ` (£${parseFloat(location.activities_cost_actual).toFixed(2)} actual)`}
                  </span>
                </div>
              )}
              {(location.food_drink_cost_planned || location.food_drink_cost_actual) && (
                <div className="info-item">
                  <span className="info-label">🍽️ Food & Drink Budget:</span>
                  <span className="info-value">
                    {location.food_drink_cost_planned ? `£${parseFloat(location.food_drink_cost_planned).toFixed(2)} budgeted` : ''}
                    {location.food_drink_cost_actual && ` (£${parseFloat(location.food_drink_cost_actual).toFixed(2)} actual)`}
                  </span>
                </div>
              )}
              {location.notes && (
                <div className="location-notes">
                  <strong>📝 Notes:</strong> {location.notes}
                </div>
              )}
              <div className="location-coordinates">
                <small>🌐 {location.latitude}, {location.longitude}</small>
              </div>
            </div>
            ) : (
            // Edit form inline
            <div className="location-card-body editing-form">
              <form onSubmit={handleEditLocation} className="location-form inline">
                <div className="form-section">
                  <h4>Basic Information</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Location Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Lima"
                      />
                    </div>
                    <div className="form-field">
                      <label>Country *</label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Peru"
                      />
                    </div>
                    <div className="form-field">
                      <label>Latitude *</label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        required
                        placeholder="-12.0464"
                      />
                    </div>
                    <div className="form-field">
                      <label>Longitude *</label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        required
                        placeholder="-77.0428"
                      />
                    </div>
                    <div className="form-field">
                      <label>Nights</label>
                      <input
                        type="number"
                        name="nights"
                        value={formData.nights}
                        onChange={handleInputChange}
                        min="0"
                        placeholder="2"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Dates</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Arrival Date</label>
                      <input
                        type="date"
                        name="arrival_date"
                        value={formData.arrival_date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-field">
                      <label>Departure Date</label>
                      <input
                        type="date"
                        name="departure_date"
                        value={formData.departure_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Accommodation</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Name</label>
                      <input
                        type="text"
                        name="accommodation_name"
                        value={formData.accommodation_name}
                        onChange={handleInputChange}
                        placeholder="Hostel/Hotel name"
                      />
                    </div>
                    <div className="form-field">
                      <label>Type</label>
                      <input
                        type="text"
                        name="accommodation_type"
                        value={formData.accommodation_type}
                        onChange={handleInputChange}
                        placeholder="Hostel/Hotel/Airbnb"
                      />
                    </div>
                    <div className="form-field">
                      <label>Budget (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="accommodation_cost_planned"
                        value={formData.accommodation_cost_planned}
                        onChange={handleInputChange}
                        placeholder="50.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Travel Details</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>From</label>
                      <input
                        type="text"
                        name="travel_from"
                        value={formData.travel_from}
                        onChange={handleInputChange}
                        placeholder="Previous location"
                      />
                    </div>
                    <div className="form-field">
                      <label>Method</label>
                      <input
                        type="text"
                        name="travel_method"
                        value={formData.travel_method}
                        onChange={handleInputChange}
                        placeholder="Bus/Flight/Train"
                      />
                    </div>
                    <div className="form-field">
                      <label>Budget (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="travel_cost_planned"
                        value={formData.travel_cost_planned}
                        onChange={handleInputChange}
                        placeholder="25.00"
                      />
                    </div>
                    <div className="form-field">
                      <label>Duration (hours)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="travel_duration"
                        value={formData.travel_duration}
                        onChange={handleInputChange}
                        placeholder="4.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Budget Planning</h4>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Activities Budget (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="activities_cost_planned"
                        value={formData.activities_cost_planned}
                        onChange={handleInputChange}
                        placeholder="100.00"
                      />
                    </div>
                    <div className="form-field">
                      <label>Food & Drink Budget (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="food_drink_cost_planned"
                        value={formData.food_drink_cost_planned}
                        onChange={handleInputChange}
                        placeholder="150.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Additional Details</h4>
                  <div className="form-field full-width">
                    <label>Activities</label>
                    <textarea
                      name="activities"
                      value={formData.activities}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Things to do here..."
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={resetForm} className="cancel-button">
                    Cancel
                  </button>
                  <button type="submit" className="submit-button">
                    Update Location
                  </button>
                </div>
              </form>
            </div>
            )}
          </div>
          )
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Delete Location?</h3>
            <p>Are you sure you want to delete this location? This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={() => setDeleteConfirm(null)} className="cancel-button">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="delete-confirm-button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
