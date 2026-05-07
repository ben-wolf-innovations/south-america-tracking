import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import './PackingList.css'

export default function PackingList() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('Ben')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    budget_amount: '',
    actual_amount: ''
  })

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await api.get('/packing')
      setItems(response.data.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load packing items:', err)
      setError('Failed to load packing list')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      budget_amount: '',
      actual_amount: ''
    })
    setShowAddForm(false)
    setEditingItem(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingItem) {
        // Update existing item
        await api.put(`/packing/${editingItem.id}`, formData)
      } else {
        // Create new item
        await api.post('/packing', {
          ...formData,
          owner: activeTab
        })
      }
      
      await loadItems()
      resetForm()
    } catch (err) {
      console.error('Failed to save packing item:', err)
      alert('Failed to save item: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      budget_amount: item.budget_amount,
      actual_amount: item.actual_amount
    })
    setShowAddForm(true)
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      await api.delete(`/packing/${itemId}`)
      await loadItems()
    } catch (err) {
      console.error('Failed to delete item:', err)
      alert('Failed to delete item')
    }
  }

  const handleToggleComplete = async (item) => {
    try {
      await api.put(`/packing/${item.id}`, {
        completed: item.completed ? 0 : 1
      })
      await loadItems()
    } catch (err) {
      console.error('Failed to update item:', err)
      alert('Failed to update item')
    }
  }

  if (!isAdmin()) {
    return (
      <div className="packing-list-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Only administrators can access the packing list.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="packing-list-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading packing list...</p>
        </div>
      </div>
    )
  }

  // Filter items by active tab
  const filteredItems = items.filter(item => item.owner === activeTab)

  // Calculate totals for current tab
  const totalBudget = filteredItems.reduce((sum, item) => sum + parseFloat(item.budget_amount || 0), 0)
  const totalActual = filteredItems.reduce((sum, item) => sum + parseFloat(item.actual_amount || 0), 0)
  const completedCount = filteredItems.filter(item => item.completed).length
  const totalItems = filteredItems.length

  return (
    <div className="packing-list-page">
      <div className="packing-header">
        <div>
          <h2>Packing List</h2>
          <p className="subtitle">Track items and expenses for the trip</p>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="add-button">
            Add Item
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['Ben', 'El', 'Both'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab)
              resetForm()
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="packing-summary">
        <div className="summary-card">
          <div className="summary-label">Items</div>
          <div className="summary-value">{completedCount} / {totalItems}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Budget</div>
          <div className="summary-value">£{totalBudget.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Actual</div>
          <div className="summary-value">£{totalActual.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Difference</div>
          <div className={`summary-value ${totalActual > totalBudget ? 'over-budget' : 'under-budget'}`}>
            £{Math.abs(totalActual - totalBudget).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="form-card">
          <div className="form-header">
            <h3>{editingItem ? 'Edit Item' : `Add Item for ${activeTab}`}</h3>
            <button onClick={resetForm} className="close-button">✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Item Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g., Backpack, Hiking Boots"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Budget Amount (£)</label>
                <input
                  type="number"
                  name="budget_amount"
                  value={formData.budget_amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Actual Amount (£)</label>
                <input
                  type="number"
                  name="actual_amount"
                  value={formData.actual_amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      {error && <div className="error-message">{error}</div>}
      
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <p>No items in {activeTab}'s packing list yet.</p>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            Add First Item
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map(item => (
            <div key={item.id} className={`item-card ${item.completed ? 'completed' : ''}`}>
              <div className="item-header">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={item.completed === 1}
                    onChange={() => handleToggleComplete(item)}
                  />
                  <span className="checkmark"></span>
                </label>
                <h3 className="item-title">{item.title}</h3>
              </div>

              <div className="item-details">
                <div className="detail-row">
                  <span className="detail-label">Budget:</span>
                  <span className="detail-value">£{parseFloat(item.budget_amount).toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Actual:</span>
                  <span className="detail-value">£{parseFloat(item.actual_amount).toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Difference:</span>
                  <span className={`detail-value ${parseFloat(item.actual_amount) > parseFloat(item.budget_amount) ? 'over-budget' : 'under-budget'}`}>
                    £{Math.abs(parseFloat(item.actual_amount) - parseFloat(item.budget_amount)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="item-actions">
                <button onClick={() => handleEdit(item)} className="btn-edit">
                  Edit
                </button>
                <button onClick={() => handleDelete(item.id)} className="btn-delete">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
