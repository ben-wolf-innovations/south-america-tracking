import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import { useDataRefresh, triggerRefresh } from '../hooks/useDataRefresh'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [footerStats, setFooterStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Also covers the first render, so there is no separate mount fetch.
  useEffect(() => {
    loadFooterStats()
  }, [location.pathname])

  // Listen for trip update events
  useEffect(() => {
    const handleTripUpdate = () => {
      loadFooterStats()
    }
    window.addEventListener('tripUpdated', handleTripUpdate)
    return () => window.removeEventListener('tripUpdated', handleTripUpdate)
  }, [])

  const loadFooterStats = async () => {
    try {
      const [tripRes, locationsRes] = await Promise.all([
        api.get('/trips/1'),
        api.get('/locations')
      ])

      const trip = tripRes.data.data
      const locations = locationsRes.data.data

      // Exclude travel overnight locations from location and country counts
      const realLocations = locations.filter(l => !l.is_travel_overnight)
      
      setFooterStats({
        startDate: trip.start_date,
        endDate: trip.end_date,
        totalLocations: realLocations.length,
        totalDays: locations.reduce((sum, l) => sum + (l.nights || 0), 0),
        countries: [...new Set(realLocations.map(l => l.country).filter(Boolean))].length
      })
    } catch (err) {
      console.error('Failed to load footer stats:', err)
    }
  }

  useDataRefresh(loadFooterStats)

  // Saved to the home screen there is no browser reload button, so this is the
  // only way to pull fresh data without closing the app.
  const handleRefresh = () => {
    setRefreshing(true)
    triggerRefresh()
    setTimeout(() => setRefreshing(false), 600)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="dashboard">
      <div className="dashboard-chrome">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="header-title">
            <span className="icon">🌎</span>
            South America 2026
          </h1>
          <div className="header-actions">
            <span className="user-badge">
              {user?.accessLevel === 'admin' ? '👤 Admin' : '👥 Family'}
            </span>
            <div className="header-buttons">
              <button
                onClick={handleRefresh}
                className={`header-refresh ${refreshing ? 'spinning' : ''}`}
                title="Refresh data"
                aria-label="Refresh data"
              >
                &#8635;
              </button>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-content">
          <Link to="/" className="nav-link">
            Overview
          </Link>
          <Link to="/map" className="nav-link">
            Map
          </Link>
          <Link to="/itinerary" className="nav-link">
            Itinerary
          </Link>
          {isAdmin() && (
            <Link to="/locations" className="nav-link">
              Locations
            </Link>
          )}
          {isAdmin() && (
            <Link to="/costs" className="nav-link">
              Costs
            </Link>
          )}
          {isAdmin() && (
            <Link to="/packing" className="nav-link">
              Packing
            </Link>
          )}
          <Link to="/blog" className="nav-link">
            Blog
          </Link>
          <Link to="/info" className="nav-link">
            Useful Info
          </Link>
        </div>
      </nav>
      </div>

      <main className="dashboard-main">
        <Outlet />
      </main>

      <footer className="dashboard-footer">
        {footerStats ? (
          <p>
            Nov 2026 - April 2027 | 
            {' '}{footerStats.countries} Countries | 
            {' '}{footerStats.totalLocations} Locations | 
            {' '}{footerStats.totalDays} Days
          </p>
        ) : (
          <p>Loading trip info...</p>
        )}
      </footer>
    </div>
  )
}
