import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

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
            📊 Overview
          </Link>
          <Link to="/map" className="nav-link">
            🗺️ Map
          </Link>
          <Link to="/locations" className="nav-link">
            📍 Locations
          </Link>
          <Link to="/costs" className="nav-link">
            💰 Costs
          </Link>
          <Link to="/blog" className="nav-link">
            📝 Blog
          </Link>
          {isAdmin() && (
            <Link to="/progress" className="nav-link">
              🎯 Progress
            </Link>
          )}
        </div>
      </nav>

      <main className="dashboard-main">
        <Outlet />
      </main>

      <footer className="dashboard-footer">
        <p>Sep 2026 - Dec 2026 | 5 Countries | 43 Locations | 103 Days</p>
      </footer>
    </div>
  )
}
