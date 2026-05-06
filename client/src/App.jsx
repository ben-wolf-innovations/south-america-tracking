import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './components/Dashboard'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Map from './pages/Map'
import Locations from './pages/Locations'
import Costs from './pages/Costs'
import Blog from './pages/Blog'
import './App.css'

// Placeholder components - will be implemented next
const ProgressPage = () => <div style={{ padding: '40px' }}><h2>🎯 Progress</h2><p>Coming soon...</p></div>

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }>
          <Route index element={<Overview />} />
          <Route path="map" element={<Map />} />
          <Route path="locations" element={<Locations />} />
          <Route path="costs" element={<Costs />} />
          <Route path="blog" element={<Blog />} />
          <Route path="progress" element={
            <ProtectedRoute requireAdmin>
              <ProgressPage />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
