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
      
      // Exclude travel overnight locations from location and country counts
      const realLocations = locations.filter(l => !l.is_travel_overnight)
      
      setStats({
        totalLocations: realLocations.length,
        visitedLocations: realLocations.filter(l => l.visited).length,
        currentLocation: locations.find(l => l.is_current),
        totalDays: locations.reduce((sum, l) => sum + (l.nights || 0), 0),
        countries: [...new Set(realLocations.map(l => l.country).filter(Boolean))].length,
        costsSummary
      })
      
      setError(null)
    } catch (err) {
      console.error('Failed to load overview:', err)
      setError('Failed to load trip data')
    } finally {
      setLoading(false)
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

  const totalPlanned = parseFloat(stats?.costsSummary?.location_budgets?.total_planned || 0)
  const totalActual = parseFloat(stats?.costsSummary?.location_actuals?.total_actual || 0)
  const budgetPercentage = totalPlanned
    ? (totalActual / totalPlanned * 100).toFixed(1)
    : 0

  const CATEGORIES = [
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'activities', label: 'Activities' },
    { value: 'food', label: 'Food & Drink' },
    { value: 'travel', label: 'Transport' },
    { value: 'other', label: 'Other' }
  ]
  const categorySummary = CATEGORIES.map(cat => {
    const data = (stats?.costsSummary?.by_category || []).find(c => c.category === cat.value) || {}
    return {
      ...cat,
      total_planned: parseFloat(data.total_planned || 0),
      total_actual: parseFloat(data.total_actual || 0),
      count: parseInt(data.count || 0, 10)
    }
  })
  const countrySummary = stats?.costsSummary?.by_country || []

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
                    <button onClick={() => setEditingStartDate(true)} className="btn-edit">Edit</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon locations-icon"></div>
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
          <div className="stat-icon calendar-icon"></div>
          <div className="stat-content">
            <div className="stat-value">{daysElapsed} / {stats?.totalDays || 0}</div>
            <div className="stat-label">Days Elapsed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon globe-icon"></div>
          <div className="stat-content">
            <div className="stat-value">{stats?.countries || 0}</div>
            <div className="stat-label">Countries</div>
          </div>
        </div>

        {isAdmin() && (
          <div className="stat-card">
            <div className="stat-icon money-icon"></div>
            <div className="stat-content">
              <div className="stat-value">
                £{totalActual.toFixed(0)} / £{totalPlanned.toFixed(0)}
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
          <h3>Current Location</h3>
          <div className="location-info">
            <h4>{stats.currentLocation.name}</h4>
            <p className="country">{stats.currentLocation.country}</p>
            {stats.currentLocation.accommodation_name && (
              <p className="accommodation">
                <strong>Hotel:</strong> {stats.currentLocation.accommodation_name}
              </p>
            )}
            {stats.currentLocation.arrival_date && (
              <p className="dates">
                <strong>Dates:</strong> {new Date(stats.currentLocation.arrival_date).toLocaleDateString()}
                {stats.currentLocation.departure_date && 
                  ` - ${new Date(stats.currentLocation.departure_date).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
        </div>
      )}

      {isAdmin() && (
        <div className="overview-budget-section">
          <div className="overview-total-budget-card">
            <div className="summary-label">Total Budget</div>
            <div className="overview-summary-amounts">
              <div className="overview-amount planned">
                <span className="label">Budget (from locations):</span>
                <span className="value">£{totalPlanned.toFixed(2)}</span>
              </div>
              <div className="overview-amount actual">
                <span className="label">Actual Spent:</span>
                <span className="value">£{totalActual.toFixed(2)}</span>
              </div>
              <div className="overview-amount difference">
                <span className="label">Difference:</span>
                <span className={`value ${totalActual > totalPlanned ? 'over' : 'under'}`}>
                  £{Math.abs(totalActual - totalPlanned).toFixed(2)}
                  {totalActual > totalPlanned ? ' over budget' : ' under budget'}
                </span>
              </div>
            </div>
          </div>

          <div className="overview-category-breakdown">
            <h3>Spending by Category</h3>
            <div className="overview-category-grid">
              {categorySummary.map(item => (
                <div key={item.value} className="overview-category-card">
                  <div className="overview-category-name">{item.label}</div>
                  <div className="overview-category-amounts">
                    <div className="overview-amount-row">
                      <span>Budgeted:</span>
                      <span className="planned-amount">£{item.total_planned.toFixed(2)}</span>
                    </div>
                    <div className="overview-amount-row">
                      <span>Actual Spent:</span>
                      <span className="actual-amount">£{item.total_actual.toFixed(2)}</span>
                    </div>
                    <div className="overview-amount-row">
                      <span>Count:</span>
                      <span>{item.count} {item.count === 1 ? 'item' : 'items'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overview-country-breakdown">
            <h3>Spending by Country</h3>
            <div className="overview-country-grid">
              {countrySummary.map(countryItem => {
                const totals = CATEGORIES.reduce((acc, cat) => {
                  const d = countryItem.categories?.[cat.value] || { budgeted: 0, actual: 0 }
                  acc.budgetedCents += Math.round(parseFloat(d.budgeted || 0) * 100)
                  acc.actualCents += Math.round(parseFloat(d.actual || 0) * 100)
                  return acc
                }, { budgetedCents: 0, actualCents: 0 })
                
                const totalsFormatted = {
                  budgeted: totals.budgetedCents / 100,
                  actual: totals.actualCents / 100
                }

                return (
                  <div key={countryItem.country} className="overview-country-card">
                    <div className="overview-country-name">{countryItem.country}</div>
                    <div className="overview-country-category-list">
                      {CATEGORIES.map(cat => {
                        const d = countryItem.categories?.[cat.value] || { budgeted: 0, actual: 0 }
                        return (
                          <div key={cat.value} className="overview-country-category-row">
                            <div className="overview-country-category-name">{cat.label}</div>
                            <div className="overview-country-category-amounts">
                              <span className="country-budgeted">B: £{parseFloat(d.budgeted || 0).toFixed(2)}</span>
                              <span className="country-actual">A: £{parseFloat(d.actual || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="overview-country-total-row">
                      <span className="country-total-label">Total</span>
                      <span className="country-total-values">
                        <span className="country-budgeted">B: £{totalsFormatted.budgeted.toFixed(2)}</span>
                        <span className="country-actual">A: £{totalsFormatted.actual.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
