import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import { useDataRefresh } from '../hooks/useDataRefresh'
import * as progress from '../services/progress'
import LocationForm, { EMPTY_LOCATION_FORM, locationToForm } from '../components/locations/LocationForm'
import './Locations.css'

export default function Locations() {
  const { isAdmin } = useAuth()
  const [locations, setLocations] = useState([])
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTravelOvernightForm, setShowTravelOvernightForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [status, setStatus] = useState(null)

  // Form state for add/edit
  const [formData, setFormData] = useState(EMPTY_LOCATION_FORM)

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      const [locationsRes, costsRes] = await Promise.all([
        api.get('/locations'),
        api.get('/costs')
      ])
      setLocations(locationsRes.data.data)
      setCosts(costsRes.data.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load locations:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      setError(`Failed to load locations: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useDataRefresh(loadLocations)

  // Helper function to calculate "other" costs for a location (using integer cents to avoid floating point errors)
  const getOtherCostsForLocation = (locationId) => {
    const totalCents = costs
      .filter(cost => cost.location_id === locationId && cost.category === 'other')
      .reduce((sum, cost) => sum + Math.round(parseFloat(cost.amount_actual || 0) * 100), 0)
    return totalCents / 100
  }

  const resetForm = () => {
    setFormData(EMPTY_LOCATION_FORM)
    setShowAddForm(false)
    setShowTravelOvernightForm(false)
    setEditingLocation(null)
  }

  const handleAddTravelOvernight = () => {
    setFormData({
      ...EMPTY_LOCATION_FORM,
      name: 'Travel Overnight',
      country: 'Peru',
      nights: 1,
      is_travel_overnight: true
    })
    setShowTravelOvernightForm(true)
    setShowAddForm(false)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const clearDateField = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: ''
    }))
  }

  const handleAddLocation = async (e) => {
    e.preventDefault()
    try {
      // Remove empty fields and convert types
      const payload = {}
      Object.keys(formData).forEach(key => {
        const value = formData[key]
        
        // Always include these fields
        if (key === 'is_travel_overnight') {
          payload[key] = value ? 1 : 0
          return
        }
        if (key === 'name') {
          payload[key] = value || 'Travel Overnight'
          return
        }
        if (key === 'country') {
          payload[key] = value || 'Peru'
          return
        }
        
        // Skip empty values for other fields
        if (value !== '' && value !== null && value !== false) {
          if (['nights', 'sequence'].includes(key)) {
            payload[key] = parseInt(value) || 0
          } else if (['latitude', 'longitude', 'accommodation_cost_planned', 'activities_cost_planned', 'food_drink_cost_planned', 'travel_cost_planned', 'travel_duration'].includes(key)) {
            // Round cost values to 2 decimal places to avoid floating point precision issues
            const costFields = ['accommodation_cost_planned', 'activities_cost_planned', 'food_drink_cost_planned', 'travel_cost_planned']
            if (costFields.includes(key)) {
              payload[key] = Math.round(parseFloat(value) * 100) / 100 || 0
            } else {
              payload[key] = parseFloat(value) || 0
            }
          } else if (typeof value === 'boolean') {
            payload[key] = value ? 1 : 0
          } else {
            payload[key] = value
          }
        }
      })

      const response = await api.post('/locations', payload)
      const newLocationId = response.data.data.id
      
      // Reload locations to show the new entry
      await loadLocations()
      
      resetForm()
      // Scroll to the newly created location
      setTimeout(() => {
        const el = document.getElementById(`location-${newLocationId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    } catch (err) {
      console.error('Failed to add location:', err)
      const errorMsg = err.response?.data?.error || err.message
      alert(`Failed to add location: ${errorMsg}`)
    }
  }

  const handleEditLocation = async (e) => {
    e.preventDefault()
    try {
      const payload = {}
      const textFields = ['notes', 'activities', 'accommodation_notes', 'travel_notes', 'accommodation_name', 'accommodation_booking_ref', 'travel_method']
      Object.keys(formData).forEach(key => {
        // Always include date fields (even if empty, send as null to clear them)
        if (key === 'arrival_date' || key === 'departure_date') {
          payload[key] = formData[key] || null
        }
        // Always include text fields (even if empty, send empty string to clear them)
        else if (textFields.includes(key)) {
          payload[key] = formData[key] || ''
        }
        // For other fields, only include if not empty
        else if (formData[key] !== '' && formData[key] !== null && key !== 'sequence') {
          if (['nights'].includes(key)) {
            payload[key] = parseInt(formData[key]) || 0
          } else if (['latitude', 'longitude', 'accommodation_cost_planned', 'activities_cost_planned', 'food_drink_cost_planned', 'travel_cost_planned', 'travel_duration'].includes(key)) {
            // Round cost values to 2 decimal places to avoid floating point precision issues
            const costFields = ['accommodation_cost_planned', 'activities_cost_planned', 'food_drink_cost_planned', 'travel_cost_planned']
            if (costFields.includes(key)) {
              payload[key] = Math.round(parseFloat(formData[key]) * 100) / 100 || 0
            } else {
              payload[key] = parseFloat(formData[key]) || 0
            }
          } else {
            payload[key] = formData[key]
          }
        }
      })

      const locationId = editingLocation.id
      await api.put(`/locations/${locationId}`, payload)
      
      // Reload locations to show the updated data
      await loadLocations()
      
      resetForm()
      // Scroll back to the location card after saving
      setTimeout(() => {
        const el = document.getElementById(`location-${locationId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    } catch (err) {
      console.error('Failed to update location:', err)
      const errorMsg = err.response?.data?.error || err.message
      alert(`Failed to update location: ${errorMsg}`)
    }
  }

  const startEdit = (location) => {
    setFormData(locationToForm(location))
    setEditingLocation(location)
    setShowAddForm(false)
  }

  const handleDelete = async (id) => {
    try {
      const scrollPos = window.scrollY
      await api.delete(`/locations/${id}`)
      
      // Reload locations to remove the deleted entry
      await loadLocations()
      
      setDeleteConfirm(null)
      setTimeout(() => window.scrollTo(0, scrollPos), 0)
    } catch (err) {
      console.error('Failed to delete location:', err)
      const errorMsg = err.response?.data?.error || err.message
      alert(`Failed to delete location: ${errorMsg}`)
    }
  }

  const handleCheckIn = async (location) => {
    try {
      const message = await progress.checkIn(location.id)
      await loadLocations()
      setStatus({ type: 'success', text: message })
    } catch (err) {
      console.error('Failed to check in:', err)
      setStatus({ type: 'error', text: progress.errorMessage(err) })
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
      
      // Scroll to the moved location after reload
      setTimeout(() => {
        const element = document.getElementById(`location-${locationId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
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

  // Filter locations by search query
  const filteredLocations = locations.filter(location => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      location.name?.toLowerCase().includes(query) ||
      location.country?.toLowerCase().includes(query) ||
      location.accommodation_name?.toLowerCase().includes(query) ||
      location.activities?.toLowerCase().includes(query) ||
      location.notes?.toLowerCase().includes(query) ||
      location.travel_method?.toLowerCase().includes(query)
    )
  })

  const nextSequence = progress.nextCheckInSequence(locations)

  // Calculate totals (exclude travel overnight from location count)
  const totalNights = locations.reduce((sum, loc) => sum + (parseInt(loc.nights) || 0), 0)
  const totalLocations = locations.filter(loc => !loc.is_travel_overnight).length

  return (
    <div className="locations-page">
      <div className="locations-header">
        <div>
          <h2>Locations</h2>
          <p className="subtitle">{locations.length} stops on your journey</p>
        </div>
        <div className="header-stats">
          <div className="stat-card-small">
            <div className="stat-label">Total Locations</div>
            <div className="stat-value">{totalLocations}</div>
          </div>
          <div className="stat-card-small">
            <div className="stat-label">Total Nights</div>
            <div className="stat-value">{totalNights}</div>
          </div>
        </div>
        {isAdmin() && !showAddForm && !showTravelOvernightForm && (
          <div className="header-actions">
            <button
              onClick={() => setShowAddForm(true)}
              className="add-button"
            >
              Add Location
            </button>
            <button
              onClick={handleAddTravelOvernight}
              className="add-button secondary"
            >
              + Travel Overnight
            </button>
          </div>
        )}
      </div>

      {/* Travel Overnight Form */}
      {showTravelOvernightForm && (
        <div className="location-form-container travel-overnight">
          <div className="location-form-header">
            <h3>Add Travel Overnight</h3>
            <button onClick={resetForm} className="close-button">&times;</button>
          </div>
          <form onSubmit={handleAddLocation} className="location-form">
            <div className="form-section">
              <p className="info-text">Creates a placeholder for overnight travel (bus, train, etc.) without accommodation costs.</p>
              <div className="form-grid">
                <div className="form-field">
                  <label>Nights *</label>
                  <input
                    type="number"
                    name="nights"
                    value={formData.nights}
                    onChange={handleInputChange}
                    min="1"
                    required
                    placeholder="1"
                  />
                </div>
                <div className="form-field">
                  <label>Insert At Position (Optional)</label>
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
              <div className="form-field full-width">
                <label>Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="e.g., Overnight bus from Lima to Cusco"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button">
                Add Travel Overnight
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Form Only */}
      {showAddForm && (
        <div className="location-form-container">
          <div className="location-form-header">
            <h3>Add New Location</h3>
            <button onClick={resetForm} className="close-button">&times;</button>
          </div>
          <LocationForm
            mode="add"
            formData={formData}
            maxSequence={locations.length + 1}
            onChange={handleInputChange}
            onClearDate={clearDateField}
            onSubmit={handleAddLocation}
            onCancel={resetForm}
          />
        </div>
      )}

      {/* Search Bar */}
      {!showAddForm && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="clear-search">✕</button>
          )}
        </div>
      )}

      {status && (
        <div className={`status-banner ${status.type}`}>
          <span>{status.text}</span>
          <button onClick={() => setStatus(null)} className="status-dismiss">&times;</button>
        </div>
      )}

      {/* Locations List */}
      <div className="locations-list">
        {filteredLocations.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <p>No locations found matching "{searchQuery}"</p>
            ) : (
              <p>No locations added yet.</p>
            )}
          </div>
        ) : (
          filteredLocations.map((location, index) => {
          const isEditing = editingLocation?.id === location.id
          
          return (
          <div key={location.id} id={`location-${location.id}`} className={`location-card ${isEditing ? 'editing' : ''} ${location.is_travel_overnight === 1 ? 'travel-overnight' : ''}`}>
            <div className="location-card-header">
              <div className="location-sequence">#{location.sequence}</div>
              <div className="location-main">
                <h3>
                  {location.name}
                  {location.is_travel_overnight === 1 && <span className="overnight-badge">🌙 Travel</span>}
                  {location.is_current === 1 && <span className="current-badge">Current</span>}
                  {location.visited === 1 && location.is_current !== 1 && (
                    <span className="visited-badge">Visited</span>
                  )}
                </h3>
                {location.is_travel_overnight !== 1 && (
                  <p className="country">{location.country || 'In Transit'}</p>
                )}
              </div>
              {isAdmin() && !showAddForm && (
                <div className="location-actions">
                  {progress.canCheckIn(location, nextSequence) && (
                    <button
                      onClick={() => handleCheckIn(location)}
                      className="checkin-button"
                      disabled={isEditing}
                      title={`Check in to ${location.name}`}
                    >
                      Check In
                    </button>
                  )}
                  <button
                    onClick={() => handleReorder(location.id, 'up')}
                    disabled={index === 0 || isEditing}
                    className="reorder-button"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleReorder(location.id, 'down')}
                    disabled={index === locations.length - 1 || isEditing}
                    className="reorder-button"
                    title="Move down"
                  >
                    ↓
                  </button>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(location)}
                      className="edit-button"
                      title="Edit"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(location.id)}
                    className="delete-button"
                    title="Delete"
                    disabled={isEditing}
                  >
                    Delete
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
                    <span className="info-label">Nights:</span>
                    <span className="info-value">{location.nights}</span>
                  </div>
                )}
                {/* Show actual dates if available, otherwise show estimated dates */}
                {(location.arrival_date || location.estimated_arrival_date) && (
                  <div className="info-item">
                    <span className="info-label">
                      {location.arrival_date ? 'Arrival:' : 'Est. Arrival:'}
                    </span>
                    <span className="info-value">
                      {new Date(location.arrival_date || location.estimated_arrival_date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
                {(location.departure_date || location.estimated_departure_date) && (
                  <div className="info-item">
                    <span className="info-label">
                      {location.departure_date ? 'Departure:' : 'Est. Departure:'}
                    </span>
                    <span className="info-value">
                      {new Date(location.departure_date || location.estimated_departure_date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
                {location.accommodation_name && (
                  <div className="info-item">
                    <span className="info-label">Accommodation:</span>
                    <span className="info-value">
                      {location.accommodation_name}
                      {location.accommodation_booked === 1 && <span className="status-badge booked">Booked</span>}
                    </span>
                  </div>
                )}
                {(location.accommodation_cost_planned > 0 || location.accommodation_cost_actual > 0) && (
                  <div className="info-item">
                    <span className="info-label">Accom. Cost:</span>
                    <span className="info-value">
                      {location.accommodation_cost_planned > 0 ? `£${parseFloat(location.accommodation_cost_planned).toFixed(2)}/night budgeted` : ''}
                      {location.accommodation_cost_actual > 0 ? ` (£${parseFloat(location.accommodation_cost_actual).toFixed(2)} total actual)` : ''}
                    </span>
                  </div>
                )}
                {location.travel_method && (
                  <div className="info-item">
                    <span className="info-label">Method:</span>
                    <span className="info-value">
                      {location.travel_method}
                      {location.transport_booked === 1 && <span className="status-badge booked">Booked</span>}
                    </span>
                  </div>
                )}
                {(location.travel_cost_planned > 0 || location.travel_cost_actual > 0) && (
                  <div className="info-item">
                    <span className="info-label">Travel Cost:</span>
                    <span className="info-value">
                      {location.travel_cost_planned > 0 ? `£${parseFloat(location.travel_cost_planned).toFixed(2)} budgeted` : ''}
                      {location.travel_cost_actual > 0 ? ` (£${parseFloat(location.travel_cost_actual).toFixed(2)} actual)` : ''}
                    </span>
                  </div>
                )}
                {location.travel_duration && (
                  <div className="info-item">
                    <span className="info-label">Duration:</span>
                    <span className="info-value">{location.travel_duration}h</span>
                  </div>
                )}
              </div>
              {(location.food_drink_cost_planned > 0 || location.food_drink_cost_actual > 0) && (
                <div className="info-item">
                  <span className="info-label">Food & Drink Budget:</span>
                  <span className="info-value">
                    {location.food_drink_cost_planned > 0 ? `£${parseFloat(location.food_drink_cost_planned).toFixed(2)}/day budgeted` : ''}
                    {location.food_drink_cost_actual > 0 ? ` (£${parseFloat(location.food_drink_cost_actual).toFixed(2)} actual)` : ''}
                  </span>
                </div>
              )}
              {getOtherCostsForLocation(location.id) > 0 && (
                <div className="info-item">
                  <span className="info-label">📦 Other Costs:</span>
                  <span className="info-value">
                    £{getOtherCostsForLocation(location.id).toFixed(2)} actual
                  </span>
                </div>
              )}
              {location.notes && (
                <div className="location-notes">
                  <strong>Notes:</strong> {location.notes}
                </div>
              )}
              {location.activities && (
                <div className="location-activities">
                  <strong>Activities:</strong> {location.activities}
                </div>
              )}
              {(location.activities_cost_planned > 0 || location.activities_cost_actual > 0) && (
                <div className="info-item">
                  <span className="info-label">Activities Budget:</span>
                  <span className="info-value">
                    {location.activities_cost_planned > 0 ? `£${parseFloat(location.activities_cost_planned).toFixed(2)} budgeted` : ''}
                    {location.activities_cost_actual > 0 ? ` (£${parseFloat(location.activities_cost_actual).toFixed(2)} actual)` : ''}
                  </span>
                </div>
              )}
              <div className="location-coordinates">
                <small>🌐 {location.latitude}, {location.longitude}</small>
              </div>
            </div>
            ) : (
            // Edit form inline
            <div className="location-card-body editing-form">
              <LocationForm
                mode="edit"
                formData={formData}
                location={editingLocation}
                onChange={handleInputChange}
                onClearDate={clearDateField}
                onSubmit={handleEditLocation}
                onCancel={resetForm}
              />
            </div>
            )}
          </div>
          )
        })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Location?</h3>
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
