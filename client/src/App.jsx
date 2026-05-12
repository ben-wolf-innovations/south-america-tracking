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
import PackingList from './pages/PackingList'
import UsefulInfo from './pages/UsefulInfo'
import './App.css'

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
          <Route path="locations" element={
            <ProtectedRoute requireAdmin>
              <Locations />
            </ProtectedRoute>
          } />
          <Route path="costs" element={
            <ProtectedRoute requireAdmin>
              <Costs />
            </ProtectedRoute>
          } />
          <Route path="packing" element={
            <ProtectedRoute requireAdmin>
              <PackingList />
            </ProtectedRoute>
          } />
          <Route path="blog" element={<Blog />} />
          <Route path="info" element={<UsefulInfo />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
