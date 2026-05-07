import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import './Map.css'

// Fix default marker icons in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Create custom red icon for current location
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Create custom green icon for visited locations
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Create custom blue icon for planned locations
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function Map() {
  const { isAdmin } = useAuth()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      setError('Failed to load map data')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (locationId) => {
    if (!isAdmin()) {
      alert('Only admin can check in to locations')
      return
    }

    try {
      const response = await api.post('/progress/checkin', { location_id: locationId })
      alert(response.data.message)
      await loadLocations() // Reload to update markers
    } catch (err) {
      console.error('Failed to check in:', err)
      alert('Failed to check in: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleClearVisited = async () => {
    if (!isAdmin()) {
      alert('Only admin can clear visited flags')
      return
    }

    if (!window.confirm('Are you sure you want to clear all visited flags? This will reset your progress.')) {
      return
    }

    try {
      const response = await api.post('/progress/clear-visited')
      alert(response.data.message)
      await loadLocations() // Reload to update markers
    } catch (err) {
      console.error('Failed to clear visited:', err)
      alert('Failed to clear visited: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleUndoLastVisited = async () => {
    if (!isAdmin()) {
      alert('Only admin can undo check-ins')
      return
    }

    if (!window.confirm('Are you sure you want to undo the last check-in?')) {
      return
    }

    try {
      const response = await api.post('/progress/undo-last-visited')
      alert(response.data.message)
      await loadLocations() // Reload to update markers
    } catch (err) {
      console.error('Failed to undo last visited:', err)
      alert('Failed to undo: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return (
      <div className="map-loading">
        <div className="spinner"></div>
        <p>Loading map...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="map-error">
        <p>{error}</p>
        <button onClick={loadLocations} className="retry-button">Retry</button>
      </div>
    )
  }

  // Filter locations with valid coordinates
  const validLocations = locations.filter(loc => loc.latitude && loc.longitude)

  // Add small offsets to markers at the same coordinates so they're all clickable
  const locationsWithOffsets = validLocations.map((loc, index, arr) => {
    // Find all locations at the same coordinates
    const sameCoordLocations = arr.filter(l => 
      Math.abs(l.latitude - loc.latitude) < 0.0001 && 
      Math.abs(l.longitude - loc.longitude) < 0.0001
    )
    
    if (sameCoordLocations.length > 1) {
      // Find this location's index among duplicates
      const duplicateIndex = sameCoordLocations.findIndex(l => l.id === loc.id)
      
      // Offset in a circle pattern (0.002 degrees ≈ 200m)
      const offsetRadius = 0.002
      const angle = (duplicateIndex / sameCoordLocations.length) * 2 * Math.PI
      
      return {
        ...loc,
        displayLatitude: loc.latitude + Math.cos(angle) * offsetRadius,
        displayLongitude: loc.longitude + Math.sin(angle) * offsetRadius
      }
    }
    
    return {
      ...loc,
      displayLatitude: loc.latitude,
      displayLongitude: loc.longitude
    }
  })

  // Get route coordinates for polyline (use original coordinates, not offset)
  const routeCoordinates = validLocations.map(loc => [loc.latitude, loc.longitude])

  // Calculate center and bounds
  const center = locationsWithOffsets.length > 0
    ? [locationsWithOffsets[0].latitude, locationsWithOffsets[0].longitude]
    : [-12.0464, -77.0428] // Lima as default

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h2>Route Map</h2>
          <p className="subtitle">{locationsWithOffsets.length} locations across South America</p>
        </div>
        {isAdmin() && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleUndoLastVisited} 
              className="reload-button" 
              style={{ background: 'linear-gradient(135deg, var(--secondary-color), #ea580c)' }}
              title="Undo the most recent check-in"
            >
              Undo Last Check-In
            </button>
            <button 
              onClick={handleClearVisited} 
              className="reload-button" 
              style={{ background: 'linear-gradient(135deg, var(--danger-color), #dc2626)' }}
              title="Clear all visited flags"
            >
              Clear All Visited
            </button>
          </div>
        )}
      </div>

      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-icon current"></div>
          <span>Current Location</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon visited"></div>
          <span>Visited</span>
        </div>
        <div className="legend-item">
          <div className="legend-icon planned"></div>
          <span>Planned</span>
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={center}
          zoom={4}
          scrollWheelZoom={true}
          className="leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route polyline */}
          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#2563eb',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
              }}
            />
          )}

          {/* Location markers */}
          {locationsWithOffsets.map((location) => {
            const isCurrent = location.is_current === 1
            const isVisited = location.visited === 1
            
            // Determine icon: red for current, green for visited, blue for planned
            let markerIcon = blueIcon // Default: planned (not visited)
            if (isCurrent) {
              markerIcon = redIcon // Current location
            } else if (isVisited) {
              markerIcon = greenIcon // Visited (but not current)
            }
            
            return (
              <Marker
                key={location.id}
                position={[location.displayLatitude, location.displayLongitude]}
                icon={markerIcon}
              >
                <Popup>
                  <div className="location-popup">
                    <h3>{location.name} <span style={{fontSize: '0.85em', color: '#666'}}>(Stop #{location.sequence})</span></h3>
                    <p className="country">{location.country}</p>
                    
                    {isCurrent && (
                      <div className="current-badge">Current Location</div>
                    )}
                    
                    {isVisited && !isCurrent && (
                      <div className="visited-badge">Visited</div>
                    )}
                    
                    <div className="popup-details">
                      {location.nights > 0 && (
                        <p className="detail">
                          <strong>Stay:</strong> {location.nights} night{location.nights > 1 ? 's' : ''}
                        </p>
                      )}
                      
                      {location.accommodation_name && (
                        <p className="detail">
                          <strong>Hotel:</strong> {location.accommodation_name}
                        </p>
                      )}
                      
                      {(location.arrival_date || location.departure_date) && (
                        <p className="detail">
                          <strong>Dates:</strong>{' '}
                          {location.arrival_date 
                            ? new Date(location.arrival_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'TBD'
                          }
                          {' - '}
                          {location.departure_date 
                            ? new Date(location.departure_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'TBD'
                          }
                        </p>
                      )}
                      
                      {location.activities && (
                        <p className="detail activities">
                          <strong>Activities:</strong><br />
                          {location.activities}
                        </p>
                      )}
                    </div>
                    
                    {isAdmin() && !isCurrent && (
                      <button 
                        onClick={() => handleCheckIn(location.id)}
                        className="checkin-button"
                      >
                        Check In Here
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      <div className="map-info">
        <p>
          <strong>Route Distance:</strong> Follow the dashed line showing your journey 
          from Lima, Peru through Ecuador, Bolivia, Chile, and Argentina
        </p>
      </div>
    </div>
  )
}
