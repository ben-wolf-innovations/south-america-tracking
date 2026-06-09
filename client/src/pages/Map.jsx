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
    loadLocations().catch(err => {
      console.error('Initial load failed:', err)
      // Error state already set by loadLocations
    })
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
      throw err  // Re-throw so calling functions know it failed
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
  // Also ensure the current/most recent location appears on top (rendered last)
  const locationsWithOffsets = validLocations.map((loc, index, arr) => {
    // Find all locations at the same coordinates
    const sameCoordLocations = arr.filter(l => 
      Math.abs(l.latitude - loc.latitude) < 0.0001 && 
      Math.abs(l.longitude - loc.longitude) < 0.0001
    )
    
    if (sameCoordLocations.length > 1) {
      // Sort by priority: current location > visited (by sequence desc) > planned (by sequence)
      // This ensures the most relevant location gets the highest render order
      const sortedLocations = [...sameCoordLocations].sort((a, b) => {
        // Current location has lowest priority number (renders last = on top)
        if (a.is_current === 1 && b.is_current !== 1) return -1
        if (b.is_current === 1 && a.is_current !== 1) return 1
        
        // Among visited or planned, higher sequence = more recent = lower priority number
        if (a.visited === 1 && b.visited === 1) return b.sequence - a.sequence
        if (a.visited === 1 && b.visited !== 1) return -1
        if (b.visited === 1 && a.visited !== 1) return 1
        
        // For planned locations, higher sequence is next in journey
        return b.sequence - a.sequence
      })
      
      // Find this location's index in the sorted array (for offset positioning)
      const duplicateIndex = sortedLocations.findIndex(l => l.id === loc.id)
      
      // Offset in a circle pattern (0.002 degrees ≈ 200m)
      const offsetRadius = 0.002
      const angle = (duplicateIndex / sortedLocations.length) * 2 * Math.PI
      
      return {
        ...loc,
        displayLatitude: loc.latitude + Math.cos(angle) * offsetRadius,
        displayLongitude: loc.longitude + Math.sin(angle) * offsetRadius,
        renderOrder: duplicateIndex // Store for sorting later
      }
    }
    
    return {
      ...loc,
      displayLatitude: loc.latitude,
      displayLongitude: loc.longitude,
      renderOrder: 0
    }
  })

  // Sort by render order so current/most recent locations render last (appear on top)
  // Render order: planned (oldest first) -> visited (oldest first) -> current
  const sortedLocations = [...locationsWithOffsets].sort((a, b) => {
    // Group by coordinates first
    const sameCoords = Math.abs(a.latitude - b.latitude) < 0.0001 && 
                       Math.abs(a.longitude - b.longitude) < 0.0001
    
    if (sameCoords) {
      const aIsCurrent = a.is_current === 1
      const bIsCurrent = b.is_current === 1
      const aIsVisited = a.visited === 1
      const bIsVisited = b.visited === 1
      
      // Current location always renders last (on top)
      if (aIsCurrent && !bIsCurrent) return 1
      if (bIsCurrent && !aIsCurrent) return -1
      
      // Among visited, higher sequence renders last (most recent on top)
      if (aIsVisited && bIsVisited) return a.sequence - b.sequence
      
      // Visited renders after planned (visited on top of planned)
      if (aIsVisited && !bIsVisited) return 1
      if (bIsVisited && !aIsVisited) return -1
      
      // Among planned, lower sequence renders last (next location on top)
      return b.sequence - a.sequence
    }
    
    // Different coordinates: maintain original order
    return 0
  })

  // Get route coordinates for polyline (use original coordinates, not offset)
  const routeCoordinates = validLocations.map(loc => [loc.latitude, loc.longitude])

  // Create route segments with colors based on visited status
  const routeSegments = []
  for (let i = 0; i < validLocations.length - 1; i++) {
    const fromLoc = validLocations[i]
    const toLoc = validLocations[i + 1]
    
    // Determine segment color
    let segmentColor = '#2563eb' // Default blue for planned
    let segmentOpacity = 0.7
    
    if (toLoc.is_current === 1) {
      // Segment leading to current location = red
      segmentColor = '#ef4444'
      segmentOpacity = 0.9
    } else if (fromLoc.visited === 1 && toLoc.visited === 1) {
      // Both visited = green
      segmentColor = '#10b981'
      segmentOpacity = 0.8
    } else if (fromLoc.visited === 1 || toLoc.visited === 1) {
      // One visited, one planned = transition (could be yellow/orange)
      segmentColor = '#f59e0b'
      segmentOpacity = 0.8
    }
    
    routeSegments.push({
      positions: [[fromLoc.latitude, fromLoc.longitude], [toLoc.latitude, toLoc.longitude]],
      color: segmentColor,
      opacity: segmentOpacity
    })
  }

  // Calculate center and bounds
  const center = sortedLocations.length > 0
    ? [sortedLocations[0].latitude, sortedLocations[0].longitude]
    : [-12.0464, -77.0428] // Lima as default

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h2>Route Map</h2>
          <p className="subtitle">{sortedLocations.length} locations across South America</p>
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
          <div className="legend-icon next-journey"></div>
          <span>Next Journey</span>
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

          {/* Route polyline segments with colored paths */}
          {routeSegments.map((segment, index) => (
            <Polyline
              key={`segment-${index}`}
              positions={segment.positions}
              pathOptions={{
                color: segment.color,
                weight: 3,
                opacity: segment.opacity,
                dashArray: '10, 10'
              }}
            />
          ))}

          {/* Location markers */}
          {sortedLocations.map((location) => {
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
                      
                      {/* Show dates: actual for visited, estimated for unvisited */}
                      {(location.arrival_date || location.departure_date || location.estimated_arrival_date || location.estimated_departure_date) && (
                        <p className="detail">
                          <strong>{isVisited ? 'Dates' : 'Est. Dates'}:</strong>{' '}
                          {(isVisited && location.arrival_date) 
                            ? new Date(location.arrival_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : (location.estimated_arrival_date 
                                ? new Date(location.estimated_arrival_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'TBD')
                          }
                          {' - '}
                          {(isVisited && location.departure_date) 
                            ? new Date(location.departure_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : (location.estimated_departure_date 
                                ? new Date(location.estimated_departure_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'TBD')
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
