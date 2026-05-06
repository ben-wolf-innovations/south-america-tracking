import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
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
    loadData()
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
      setError(null)
    } catch (err) {
      console.error('Failed to load costs:', err)
      setError('Failed to load costs data')
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
      const payload = {
        category: formData.category,
        description: formData.description,
        amount_actual: formData.amount_actual ? parseFloat(formData.amount_actual) : 0,
        date: formData.date || null
      }
      
      // Only include location_id if one was selected
      if (formData.location_id) {
        payload.location_id = parseInt(formData.location_id)
      }

      console.log('Submitting cost payload:', payload)
      await api.post('/costs', payload)
      await loadData()
      resetForm()
    } catch (err) {
      console.error('Failed to add cost:', err)
      alert('Failed to add cost: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleEditCost = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        category: formData.category,
        description: formData.description,
        amount_actual: formData.amount_actual ? parseFloat(formData.amount_actual) : 0,
        date: formData.date || null
      }
      
      // Only include location_id if one was selected
      if (formData.location_id) {
        payload.location_id = parseInt(formData.location_id)
      }

      console.log('Updating cost payload:', payload)
      await api.put(`/costs/${editingCost.id}`, payload)
      await loadData()
      resetForm()
    } catch (err) {
      console.error('Failed to update cost:', err)
      alert('Failed to update cost: ' + (err.response?.data?.error || err.message))
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
      await api.delete(`/costs/${id}`)
      await loadData()
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete cost:', err)
      alert('Failed to delete cost: ' + (err.response?.data?.error || err.message))
    }
  }

  // Filter costs
  const filteredCosts = costs.filter(cost => {
    if (filterLocation && cost.location_id !== parseInt(filterLocation)) return false
    if (filterCategory && cost.category !== filterCategory) return false
    return true
  })

  // Calculate totals
  const totalPlanned = summary.reduce((sum, item) => sum + parseFloat(item.total_planned || 0), 0)
  const totalActual = summary.reduce((sum, item) => sum + parseFloat(item.total_actual || 0), 0)

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
          <h2>💰 Cost Tracker</h2>
          <p className="subtitle">Plan and track your travel expenses</p>
        </div>
        {isAdmin() && !showAddForm && !editingCost && (
          <button
            onClick={() => setShowAddForm(true)}
            className="add-button"
          >
            ➕ Add Cost
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="summary-section">
        <div className="summary-card total">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-label">Total Budget</div>
            <div className="summary-amounts">
              <div className="amount planned">
                <span className="label">Planned:</span>
                <span className="value">£{totalPlanned.toFixed(2)}</span>
              </div>
              <div className="amount actual">
                <span className="label">Actual:</span>
                <span className="value">£{totalActual.toFixed(2)}</span>
              </div>
              <div className="amount difference">
                <span className="label">Difference:</span>
                <span className={`value ${totalActual > totalPlanned ? 'over' : 'under'}`}>
                  £{Math.abs(totalActual - totalPlanned).toFixed(2)}
                  {totalActual > totalPlanned ? ' over' : ' under'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="category-breakdown">
          <h3>📊 By Category</h3>
          <div className="category-grid">
            {summary.map(item => {
              const planned = parseFloat(item.total_planned || 0)
              const actual = parseFloat(item.total_actual || 0)
              const diff = actual - planned
              
              return (
                <div key={item.category} className="category-summary-card">
                  <div className="category-name">{item.category}</div>
                  <div className="category-amounts">
                    <div className="amount-row">
                      <span>Planned:</span>
                      <span className="planned-amount">£{planned.toFixed(2)}</span>
                    </div>
                    <div className="amount-row">
                      <span>Actual:</span>
                      <span className="actual-amount">£{actual.toFixed(2)}</span>
                    </div>
                    <div className={`amount-row diff ${diff > 0 ? 'over' : 'under'}`}>
                      <span>{diff > 0 ? 'Over' : 'Under'}:</span>
                      <span>£{Math.abs(diff).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingCost) && (
        <div className="cost-form-container">
          <div className="cost-form-header">
            <h3>{editingCost ? '✏️ Edit Cost' : '➕ Add New Cost'}</h3>
            <button onClick={resetForm} className="close-button">✕</button>
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
        <h3>🔍 Filter Costs</h3>
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
            <p>📊 No costs found</p>
            {isAdmin() && (
              <button onClick={() => setShowAddForm(true)} className="add-button">
                Add Your First Cost
              </button>
            )}
          </div>
        ) : (
          filteredCosts.map((cost) => {
            const location = locations.find(loc => loc.id === cost.location_id)
            const planned = parseFloat(cost.amount_planned || 0)
            const actual = parseFloat(cost.amount_actual || 0)
            const diff = actual - planned

            return (
              <div key={cost.id} className="cost-card">
                <div className="cost-card-header">
                  <div className="cost-main">
                    <h4>{cost.description}</h4>
                    <div className="cost-meta">
                      <span className="category-badge">{getCategoryLabel(cost.category)}</span>
                      {location && (
                        <span className="location-badge">
                          📍 #{location.sequence} {location.name}
                        </span>
                      )}
                      {cost.date && (
                        <span className="date-badge">
                          📅 {new Date(cost.date).toLocaleDateString()}
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
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(cost.id)}
                        className="delete-button"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                <div className="cost-amounts">
                  <div className="amount-item planned">
                    <span className="label">Planned:</span>
                    <span className="value">£{planned.toFixed(2)}</span>
                  </div>
                  <div className="amount-item actual">
                    <span className="label">Actual:</span>
                    <span className="value">£{actual.toFixed(2)}</span>
                  </div>
                  {diff !== 0 && (
                    <div className={`amount-item diff ${diff > 0 ? 'over' : 'under'}`}>
                      <span className="label">{diff > 0 ? 'Over' : 'Under'}:</span>
                      <span className="value">£{Math.abs(diff).toFixed(2)}</span>
                    </div>
                  )}
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
            <h3>⚠️ Delete Cost?</h3>
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
