import { useState, useEffect } from 'react'
import api from '../config/api'
import TimeZonesSection from '../components/usefulInfo/TimeZonesSection'
import './UsefulInfo.css'

// Family & Friends version of Useful Info: just the live local times.
export default function TimeZones() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadZones = async () => {
    try {
      setError(null)
      const res = await api.get('/info/time-zones')
      setZones(res.data.data)
    } catch (err) {
      console.error('Failed to load time zones:', err)
      setError('Failed to load time zones. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadZones()
  }, [])

  return (
    <div className="useful-info-page">
      {loading && (
        <div className="rates-loading">
          <div className="spinner"></div>
          <p>Loading time zones…</p>
        </div>
      )}

      {error && (
        <div className="info-error">
          <p>{error}</p>
          <button onClick={loadZones} className="retry-button">Retry</button>
        </div>
      )}

      {!loading && !error && <TimeZonesSection zones={zones} />}
    </div>
  )
}
