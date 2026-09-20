import { useState, useEffect } from 'react'
import api from '../config/api'
import { useDataRefresh } from '../hooks/useDataRefresh'
import './Itinerary.css'

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Actual dates once a stop is booked or visited, otherwise the projection.
function stopDates(location) {
  const arrival = location.arrival_date || location.estimated_arrival_date
  const departure = location.departure_date || location.estimated_departure_date
  if (!arrival && !departure) return null

  return {
    estimated: !location.arrival_date && !location.departure_date,
    text: [arrival, departure].filter(Boolean).map(formatDate).join(' - ')
  }
}

// A plain read-only itinerary: where we are, where we stay, and what we are
// doing. Deliberately carries no travel or cost detail.
export default function Itinerary() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadItinerary()
  }, [])

  const loadItinerary = async () => {
    try {
      setLoading(true)
      const response = await api.get('/locations')
      setLocations(response.data.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load itinerary:', err)
      setError(`Failed to load itinerary: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useDataRefresh(loadItinerary)

  if (loading) {
    return (
      <div className="itinerary-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading itinerary...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="itinerary-page">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadItinerary} className="retry-button">Retry</button>
        </div>
      </div>
    )
  }

  const stops = locations.filter(l => l.is_travel_overnight !== 1)
  const countries = [...new Set(stops.map(l => l.country).filter(Boolean))]

  return (
    <div className="itinerary-page">
      <div className="itinerary-header">
        <h2>Itinerary</h2>
        <p className="subtitle">
          {stops.length} stops across {countries.length} countries
        </p>
      </div>

      <ol className="itinerary-list">
        {locations.map((location) => {
          const isOvernight = location.is_travel_overnight === 1
          const dates = stopDates(location)

          return (
            <li
              key={location.id}
              className={`itinerary-item ${isOvernight ? 'overnight' : ''} ${location.is_current === 1 ? 'current' : ''}`}
            >
              <div className="itinerary-item-header">
                <h3>
                  {isOvernight ? '🌙 Overnight travel' : location.name}
                  {location.is_current === 1 && <span className="here-badge">We're here</span>}
                  {location.visited === 1 && location.is_current !== 1 && (
                    <span className="been-badge">Been</span>
                  )}
                </h3>
                {!isOvernight && location.country && (
                  <p className="itinerary-country">{location.country}</p>
                )}
              </div>

              <dl className="itinerary-details">
                {dates && (
                  <div className="itinerary-detail">
                    <dt>{dates.estimated ? 'Expected dates' : 'Dates'}</dt>
                    <dd>{dates.text}</dd>
                  </div>
                )}
                {location.nights > 0 && (
                  <div className="itinerary-detail">
                    <dt>Nights</dt>
                    <dd>{location.nights}</dd>
                  </div>
                )}
                {location.accommodation_name && (
                  <div className="itinerary-detail">
                    <dt>Staying at</dt>
                    <dd>{location.accommodation_name}</dd>
                  </div>
                )}
                {location.activities && (
                  <div className="itinerary-detail wide">
                    <dt>Activities</dt>
                    <dd>{location.activities}</dd>
                  </div>
                )}
                {location.notes && (
                  <div className="itinerary-detail wide">
                    <dt>Notes</dt>
                    <dd>{location.notes}</dd>
                  </div>
                )}
              </dl>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
