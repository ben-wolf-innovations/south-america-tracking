import { useState, useEffect } from 'react'
import api from '../config/api'
import './Overview.css'

export default function Overview() {
  const [progress, setProgress] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Fetch progress data
      const progressRes = await api.get('/progress')
      setProgress(progressRes.data.data)
      
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

  return (
    <div className="overview">
      <div className="overview-header">
        <h2>Trip Overview</h2>
        <p className="subtitle">Track your South American adventure</p>
      </div>

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
            <div className="stat-value">{progress?.current_day || 0} / {stats?.totalDays || 0}</div>
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

      {stats?.costsSummary?.by_category && stats.costsSummary.by_category.length > 0 && (
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
