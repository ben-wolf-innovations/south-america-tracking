import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [footerStats, setFooterStats] = useState(null)

  useEffect(() => {
    loadFooterStats()
  }, [])

  // Reload footer stats when route changes (in case data was updated)
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

      setFooterStats({
        startDate: trip.start_date,
        endDate: trip.end_date,
        totalLocations: locations.length,
        totalDays: locations.reduce((sum, l) => sum + (l.nights || 0), 0),
        countries: [...new Set(locations.map(l => l.country))].length
      })
    } catch (err) {
      console.error('Failed to load footer stats:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="dashboard">
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
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
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
          <Link to="/blog" className="nav-link">
            Blog
          </Link>
        </div>
      </nav>

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
