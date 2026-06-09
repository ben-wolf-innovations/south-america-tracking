import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import './Costs.css'

const CATEGORIES = [
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activities', label: 'Activities' },
  { value: 'food', label: 'Food & Drink' },
  { value: 'travel', label: 'Transport' },
  { value: 'other', label: 'Other' }
]

const getCategoryLabel = (value) => {
  const category = CATEGORIES.find(cat => cat.value === value)
  return category ? category.label : value
}

export default function Costs() {
  const { isAdmin } = useAuth()
  const [costs, setCosts] = useState([])
  const [locations, setLocations] = useState([])
  const [summary, setSummary] = useState([])
  const [countrySummary, setCountrySummary] = useState([])
  const [locationBudgets, setLocationBudgets] = useState({ total_planned: 0 })
  const [locationActuals, setLocationActuals] = useState({ total_actual: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const addFormRef = useRef(null)
  const [editingCost, setEditingCost] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  // Filters
  const [filterLocation, setFilterLocation] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    location_id: '',
    category: '',
    description: '',
    amount_actual: '',
    date: ''
  })

  useEffect(() => {
    loadData().catch(err => {
      console.error('Initial load failed:', err)
      // Error state already set by loadData
    })
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [costsRes, locationsRes, summaryRes] = await Promise.all([
        api.get('/costs'),
        api.get('/locations'),
        api.get('/costs/summary')
      ])
      setCosts(costsRes.data.data)
      setLocations(locationsRes.data.data)
      setSummary(summaryRes.data.data.by_category || [])
      setCountrySummary(summaryRes.data.data.by_country || [])
      setLocationBudgets(summaryRes.data.data.location_budgets || { total_planned: 0 })
      setLocationActuals(summaryRes.data.data.location_actuals || { total_actual: 0 })
      setError(null)
    } catch (err) {
      console.error('Failed to load costs:', err)
      setError('Failed to load costs data')
      throw err  // Re-throw so calling functions know it failed
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      location_id: '',
      category: '',
      description: '',
      amount_actual: '',
      date: ''
    })
    setShowAddForm(false)
    setEditingCost(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddCost = async (e) => {
    e.preventDefault()
    try {
      const scrollPos = window.scrollY
      const payload = {
        category: formData.category,
        description: formData.description,
        // Round to 2 decimal places to avoid floating point precision issues
        amount_actual: formData.amount_actual ? Math.round(parseFloat(formData.amount_actual) * 100) / 100 : 0,
        date: formData.date || null
      }
      
      // Only include location_id if one was selected
      if (formData.location_id) {
        payload.location_id = parseInt(formData.location_id)
      }

      console.log('Submitting cost payload:', payload)
      await api.post('/costs', payload)
      
      // Reload data to show the new cost
      await loadData()
      
      resetForm()
      setTimeout(() => window.scrollTo(0, scrollPos), 0)
    } catch (err) {
      console.error('Failed to add cost:', err)
      const errorMsg = err.response?.data?.error || err.message
      alert(`Failed to add cost: ${errorMsg}`)
    }
  }

  const handleEditCost = async (e) => {
    e.preventDefault()
    try {
      const scrollPos = window.scrollY
      const payload = {
        category: formData.category,
        description: formData.description,
        // Round to 2 decimal places to avoid floating point precision issues
        amount_actual: formData.amount_actual ? Math.round(parseFloat(formData.amount_actual) * 100) / 100 : 0,
        date: formData.date || null
      }
      
      // Only include location_id if one was selected
      if (formData.location_id) {
        payload.location_id = parseInt(formData.location_id)
      }

      console.log('Updating cost payload:', payload)
      await api.put(`/costs/${editingCost.id}`, payload)
      
      // Reload data to show the updated cost
      await loadData()
      
      resetForm()
      setTimeout(() => window.scrollTo(0, scrollPos), 0)
    } catch (err) {
      console.error('Failed to update cost:', err)
      const errorMsg = err.response?.data?.error || err.message
      alert(`Failed to update cost: ${errorMsg}`)
    }
  }

  const startEdit = (cost) => {
    setFormData({
      location_id: cost.location_id || '',
      category: cost.category || '',
      description: cost.description || '',
      amount_actual: cost.amount_actual || '',
      date: cost.date || ''
    })
    setEditingCost(cost)
    setShowAddForm(false)
  }

  const handleDelete = async (id) => {
    try {
      const scrollPos = window.scrollY
      await api.delete(`/costs/${id}`)
      
      // Reload data to remove the deleted cost
      await loadData()
      
      setDeleteConfirm(null)
      setTimeout(() => window.scrollTo(0, scrollPos), 0)
    } catch (err) {
      console.error('Failed to delete cost:', err)
      const errorMsg = err.response?.data?.error || err.message
      alert(`Failed to delete cost: ${errorMsg}`)
    }
  }

  // Filter costs
  const filteredCosts = costs.filter(cost => {
    if (filterLocation && cost.location_id !== parseInt(filterLocation)) return false
    if (filterCategory && cost.category !== filterCategory) return false
    return true
  })

  // Calculate totals (using integer cents to avoid floating point errors)
  const totalPlanned = parseFloat(locationBudgets.total_planned || 0)
  const summaryMap = new Map(summary.map(item => [item.category, item]))
  const categorySummary = CATEGORIES.map((category) => {
    const data = summaryMap.get(category.value) || {}
    return {
      category: category.value,
      total_planned: parseFloat(data.total_planned || 0),
      total_actual: parseFloat(data.total_actual || 0),
      count: parseInt(data.count || 0, 10)
    }
  })
  const totalActualCents = categorySummary.reduce((sum, item) => sum + Math.round(parseFloat(item.total_actual || 0) * 100), 0)
  const totalActual = totalActualCents / 100

  if (loading) {
    return (
      <div className="costs-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading costs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="costs-page">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="costs-page">
      <div className="costs-header">
        <div>
          <h2>Cost Tracker</h2>
          <p className="subtitle">Plan and track your travel expenses</p>
        </div>
        {isAdmin() && !showAddForm && !editingCost && (
          <button
            onClick={() => {
              setShowAddForm(true)
              setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
            }}
            className="add-button"
          >
            Add Cost
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-card total">
          <div className="summary-icon"></div>
          <div className="summary-content">
            <div className="summary-label">Total Budget</div>
            <div className="summary-amounts">
              <div className="amount planned">
                <span className="label">Budget (from locations):</span>
                <span className="value">£{totalPlanned.toFixed(2)}</span>
              </div>
              <div className="amount actual">
                <span className="label">Actual Spent:</span>
                <span className="value">£{totalActual.toFixed(2)}</span>
              </div>
              <div className="amount difference">
                <span className="label">Difference:</span>
                <span className={`value ${totalActual > totalPlanned ? 'over' : 'under'}`}>
                  £{Math.abs(totalActual - totalPlanned).toFixed(2)}
                  {totalActual > totalPlanned ? ' over budget' : ' under budget'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="category-breakdown">
          <h3>Actual Spending by Category</h3>
          <div className="category-grid">
            {categorySummary.map(item => {
              const actual = parseFloat(item.total_actual || 0)
              
              return (
                <div key={item.category} className="category-summary-card">
                  <div className="category-name">{getCategoryLabel(item.category)}</div>
                  <div className="category-amounts">
                    <div className="amount-row">
                      <span>Budgeted:</span>
                      <span className="planned-amount">£{parseFloat(item.total_planned || 0).toFixed(2)}</span>
                    </div>
                    <div className="amount-row">
                      <span>Actual Spent:</span>
                      <span className="actual-amount">£{actual.toFixed(2)}</span>
                    </div>
                    <div className="amount-row">
                      <span>Count:</span>
                      <span>{item.count} {item.count === 1 ? 'item' : 'items'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="country-breakdown">
          <h3>Actual Spending by Country</h3>
          <div className="country-grid">
            {countrySummary.map((countryItem) => {
              const countryTotals = CATEGORIES.reduce((acc, category) => {
                const categoryData = countryItem.categories?.[category.value] || { budgeted: 0, actual: 0 }
                acc.budgeted += parseFloat(categoryData.budgeted || 0)
                acc.actual += parseFloat(categoryData.actual || 0)
                return acc
              }, { budgeted: 0, actual: 0 })

              return (
                <div key={countryItem.country} className="country-summary-card">
                  <div className="country-name">{countryItem.country}</div>
                  <div className="country-category-list">
                    {CATEGORIES.map((category) => {
                      const categoryData = countryItem.categories?.[category.value] || {
                        budgeted: 0,
                        actual: 0,
                        count: 0
                      }

                      return (
                        <div key={`${countryItem.country}-${category.value}`} className="country-category-row">
                          <div className="country-category-name">{category.label}</div>
                          <div className="country-category-amounts">
                            <span className="country-budgeted">B: £{parseFloat(categoryData.budgeted || 0).toFixed(2)}</span>
                            <span className="country-actual">A: £{parseFloat(categoryData.actual || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="country-total-row">
                    <span className="country-total-label">Total</span>
                    <span className="country-total-values">
                      <span className="country-budgeted">B: £{countryTotals.budgeted.toFixed(2)}</span>
                      <span className="country-actual">A: £{countryTotals.actual.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingCost) && (
        <div className="cost-form-container" ref={addFormRef}>
          <div className="cost-form-header">
            <h3>{editingCost ? 'Edit Cost' : 'Add New Cost'}</h3>
            <button onClick={resetForm} className="close-button">&times;</button>
          </div>
          <form onSubmit={editingCost ? handleEditCost : handleAddCost} className="cost-form">
            <div className="form-grid">
              <div className="form-field">
                <label>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Location</label>
                <select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleInputChange}
                >
                  <option value="">General / Not location-specific</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      #{loc.sequence} {loc.name}, {loc.country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field full-width">
                <label>Description *</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Hostel accommodation, bus ticket, etc."
                />
              </div>

              <div className="form-field">
                <label>Amount (£) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount_actual"
                  value={formData.amount_actual}
                  onChange={handleInputChange}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="form-field">
                <label>Date Incurred</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button">
                {editingCost ? 'Update Cost' : 'Add Cost'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filter Costs</h3>
        <div className="filters-grid">
          <div className="filter-field">
            <label>Location:</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  #{loc.sequence} {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {(filterLocation || filterCategory) && (
            <button
              onClick={() => {
                setFilterLocation('')
                setFilterCategory('')
              }}
              className="clear-filters-button"
            >
              Clear Filters
            </button>
          )}
        </div>
        <p className="filter-results">
          Showing {filteredCosts.length} of {costs.length} costs
        </p>
      </div>

      {/* Costs List */}
      <div className="costs-list">
        {filteredCosts.length === 0 ? (
          <div className="empty-state">
            <p>No costs found</p>
            {isAdmin() && (
              <button onClick={() => {
                setShowAddForm(true)
                setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
              }} className="add-button">
                Add Your First Cost
              </button>
            )}
          </div>
        ) : (
          filteredCosts.map((cost) => {
            const location = locations.find(loc => loc.id === cost.location_id)
            const actual = parseFloat(cost.amount_actual || 0)

            return (
              <div key={cost.id} className="cost-card">
                <div className="cost-card-header">
                  <div className="cost-main">
                    <h4>{cost.description}</h4>
                    <div className="cost-meta">
                      <span className="category-badge">{getCategoryLabel(cost.category)}</span>
                      {location ? (
                        <span className="location-badge">
                          #{location.sequence} {location.name}
                        </span>
                      ) : (
                        <span className="location-badge general">
                          General
                        </span>
                      )}
                      {cost.date && (
                        <span className="date-badge">
                          {new Date(cost.date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {isAdmin() && !showAddForm && !editingCost && (
                    <div className="cost-actions">
                      <button
                        onClick={() => startEdit(cost)}
                        className="edit-button"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cost.id)}
                        className="delete-button"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="cost-amounts">
                  <div className="amount-item actual-only">
                    <span className="label">Amount:</span>
                    <span className="value">£{actual.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Cost?</h3>
            <p>Are you sure you want to delete this cost entry? This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={() => setDeleteConfirm(null)} className="cancel-button">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="delete-confirm-button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
