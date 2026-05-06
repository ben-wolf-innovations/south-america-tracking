import { useState, useEffect } from 'react'
import api from '../config/api'
import { useAuth } from '../context/AuthContext'
import './Overview.css'

export default function Overview() {
  const { isAdmin } = useAuth()
  const [trip, setTrip] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingStartDate, setEditingStartDate] = useState(false)
  const [startDate, setStartDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Fetch trip details
      const tripRes = await api.get('/trips/1')
      setTrip(tripRes.data.data)
      setStartDate(tripRes.data.data.start_date || '')
      
      // Fetch stats
      const locationsRes = await api.get('/locations')
      const costsRes = await api.get('/costs/summary')
      
      const locations = locationsRes.data.data
      const costsSummary = costsRes.data.data
      
      setStats({
        totalLocations: locations.length,
        visitedLocations: locations.filter(l => l.visited).length,
        currentLocation: locations.find(l => l.is_current),
        totalDays: locations.reduce((sum, l) => sum + (l.nights || 0), 0),
        countries: [...new Set(locations.map(l => l.country))].length,
        costsSummary
      })
      
      setError(null)
    } catch (err) {
      console.error('Failed to load overview:', err)
      setError('Failed to load trip data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStartDate = async () => {
    try {
      await api.put('/trips/1', { start_date: startDate })
      await loadData()
      setEditingStartDate(false)
      // Notify Dashboard to refresh footer
      window.dispatchEvent(new CustomEvent('tripUpdated'))
    } catch (err) {
      console.error('Failed to update start date:', err)
      alert('Failed to update start date: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return (
      <div className="overview-loading">
        <div className="spinner"></div>
        <p>Loading trip overview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="overview-error">
        <p>{error}</p>
        <button onClick={loadData} className="retry-button">Retry</button>
      </div>
    )
  }

  const budgetPercentage = stats?.costsSummary?.total_planned 
    ? ((stats.costsSummary.total_actual || 0) / stats.costsSummary.total_planned * 100).toFixed(1)
    : 0

  const progressPercentage = stats?.totalLocations
    ? ((stats.visitedLocations / stats.totalLocations) * 100).toFixed(1)
    : 0

  // Calculate days elapsed from trip start date
  const calculateDaysElapsed = () => {
    if (!trip?.start_date) return 0
    const startDate = new Date(trip.start_date)
    const today = new Date()
    if (startDate > today) return 0 // Trip hasn't started yet
    const diffTime = Math.abs(today - startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysElapsed = calculateDaysElapsed()

  return (
    <div className="overview">
      <div className="overview-header">
        <h2>Trip Overview</h2>
        <p className="subtitle">Track your South American adventure</p>
      </div>

      {/* Trip Info Card with Start Date */}
      {trip && (
        <div className="trip-info-card">
          <h3>{trip.name}</h3>
          <p className="trip-description">{trip.description}</p>
          <div className="trip-dates">
            <div className="date-field">
              <label>Start Date:</label>
              {editingStartDate && isAdmin() ? (
                <div className="date-edit-group">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <button onClick={handleUpdateStartDate} className="btn-save">Save</button>
                  <button onClick={() => {
                    setStartDate(trip.start_date || '')
                    setEditingStartDate(false)
                  }} className="btn-cancel">Cancel</button>
                </div>
              ) : (
                <div className="date-display">
                  <span>{trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}</span>
                  {isAdmin() && (
                    <button onClick={() => setEditingStartDate(true)} className="btn-edit">✏️</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.visitedLocations || 0} / {stats?.totalLocations || 0}</div>
            <div className="stat-label">Locations Visited</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🗓️</div>
          <div className="stat-content">
            <div className="stat-value">{daysElapsed} / {stats?.totalDays || 0}</div>
            <div className="stat-label">Days Elapsed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.countries || 0}</div>
            <div className="stat-label">Countries</div>
          </div>
        </div>

        {isAdmin() && (
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">
                £{(stats?.costsSummary?.total_actual || 0).toFixed(0)} / £{(stats?.costsSummary?.total_planned || 0).toFixed(0)}
              </div>
              <div className="stat-label">Budget Spent</div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${budgetPercentage > 100 ? 'over-budget' : ''}`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {stats?.currentLocation && (
        <div className="current-location-card">
          <h3>📌 Current Location</h3>
          <div className="location-info">
            <h4>{stats.currentLocation.name}</h4>
            <p className="country">{stats.currentLocation.country}</p>
            {stats.currentLocation.accommodation_name && (
              <p className="accommodation">
                🏨 {stats.currentLocation.accommodation_name}
              </p>
            )}
            {stats.currentLocation.arrival_date && (
              <p className="dates">
                📅 {new Date(stats.currentLocation.arrival_date).toLocaleDateString()}
                {stats.currentLocation.departure_date && 
                  ` - ${new Date(stats.currentLocation.departure_date).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
        </div>
      )}

      {isAdmin() && stats?.costsSummary?.by_category && stats.costsSummary.by_category.length > 0 && (
        <div className="costs-breakdown">
          <h3>💵 Cost Breakdown by Category</h3>
          <div className="costs-list">
            {stats.costsSummary.by_category.map((cat) => (
              <div key={cat.category} className="cost-item">
                <div className="cost-header">
                  <span className="cost-category">{cat.category}</span>
                  <span className="cost-amount">
                    £{(cat.total_actual || 0).toFixed(0)} / £{(cat.total_planned || 0).toFixed(0)}
                  </span>
                </div>
                <div className="cost-bar">
                  <div 
                    className="cost-fill"
                    style={{ 
                      width: `${Math.min((cat.total_actual || 0) / (cat.total_planned || 1) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
