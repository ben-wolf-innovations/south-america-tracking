import express from 'express'
import { get, all, run } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * Helper function to sync cost changes back to location
 * Updates location's actual cost fields when accommodation, travel, activities, or food/drink costs are modified
 */
function syncCostToLocation(cost) {
  if (!cost.location_id) return // Only sync costs linked to locations

  const categoryFieldMap = {
    'accommodation': 'accommodation_cost_actual',
    'travel': 'travel_cost_actual',
    'activities': 'activities_cost_actual',
    'food': 'food_drink_cost_actual'
  }

  const fieldName = categoryFieldMap[cost.category]
  if (!fieldName) return // Only sync supported categories

  run(
    `UPDATE locations 
     SET ${fieldName} = ? 
     WHERE id = ?`,
    [cost.amount_actual || null, cost.location_id]
  )
}

/**
 * GET /api/costs
 * Get all costs, optionally filtered by trip_id or location_id
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const { trip_id = 1, location_id, category } = req.query
    
    let sql = 'SELECT * FROM costs WHERE trip_id = ?'
    const params = [trip_id]

    if (location_id) {
      sql += ' AND location_id = ?'
      params.push(location_id)
    }

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }

    sql += ' ORDER BY date DESC, created_at DESC'

    const costs = all(sql, params)
    res.json({ success: true, data: costs })
  } catch (error) {
    console.error('Error fetching costs:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/costs/summary
 * Get cost summary (planned vs actual by category)
 */
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const { trip_id = 1 } = req.query

    const summary = all(
      `SELECT 
        category,
        COUNT(*) as count,
        SUM(amount_planned) as total_planned,
        SUM(amount_actual) as total_actual,
        currency
       FROM costs
       WHERE trip_id = ?
       GROUP BY category, currency
       ORDER BY category`,
      [trip_id]
    )

    // Also get location-based costs from locations table
    const locationCosts = get(
      `SELECT 
        SUM(accommodation_cost_planned) + SUM(activities_cost_planned) + 
        SUM(food_drink_cost_planned * nights) + SUM(travel_cost_planned) as total_planned,
        SUM(COALESCE(accommodation_cost_actual, 0)) + SUM(COALESCE(activities_cost_actual, 0)) + 
        SUM(COALESCE(food_drink_cost_actual, 0) * nights) + SUM(COALESCE(travel_cost_actual, 0)) as total_actual
       FROM locations
       WHERE trip_id = ?`,
      [trip_id]
    )

    res.json({ 
      success: true, 
      data: {
        by_category: summary,
        location_costs: locationCosts
      }
    })
  } catch (error) {
    console.error('Error fetching cost summary:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/costs/:id
 * Get a single cost entry
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const cost = get('SELECT * FROM costs WHERE id = ?', [req.params.id])
    
    if (!cost) {
      return res.status(404).json({ success: false, error: 'Cost entry not found' })
    }
    
    res.json({ success: true, data: cost })
  } catch (error) {
    console.error('Error fetching cost:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/costs
 * Create a new cost entry (admin only)
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    console.log('Full request body:', JSON.stringify(req.body, null, 2))
    
    const {
      trip_id = 1,
      location_id,
      category,
      description,
      amount_planned,
      amount_actual,
      currency = 'GBP',
      date,
      notes
    } = req.body

    // Validate required fields
    if (!category || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category and description are required' 
      })
    }

    const validCategories = ['accommodation', 'activities', 'food', 'travel', 'other']
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        error: `Category must be one of: ${validCategories.join(', ')}` 
      })
    }

    // Convert undefined and empty strings to null for SQL compatibility
    console.log('Received data:', { location_id, amount_planned, amount_actual, date, notes })
    
    const cleanedLocationId = location_id && location_id !== '' ? parseInt(location_id) : null
    const cleanedAmountPlanned = amount_planned && amount_planned !== '' ? parseFloat(amount_planned) : 0
    const cleanedAmountActual = amount_actual && amount_actual !== '' ? parseFloat(amount_actual) : null
    const cleanedDate = date && date !== '' ? date : null
    const cleanedNotes = notes && notes !== '' ? notes : null
    
    console.log('Cleaned data:', { cleanedLocationId, cleanedAmountPlanned, cleanedAmountActual, cleanedDate, cleanedNotes })
    
    const sqlParams = [
      trip_id,
      cleanedLocationId,
      category,
      description,
      cleanedAmountPlanned,
      cleanedAmountActual,
      currency,
      cleanedDate,
      cleanedNotes
    ]
    
    console.log('SQL Parameters:', sqlParams)
    console.log('SQL Parameters types:', sqlParams.map(p => typeof p))
    
    const result = run(
      `INSERT INTO costs (
        trip_id, location_id, category, description,
        amount_planned, amount_actual, currency, date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sqlParams
    )

    const newCost = get('SELECT * FROM costs WHERE id = ?', [result.lastID])
    
    // Sync to location if applicable
    syncCostToLocation(newCost)
    
    res.status(201).json({ success: true, data: newCost })
  } catch (error) {
    console.error('Error creating cost:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/costs/:id
 * Update a cost entry (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Check if cost exists
    const existing = get('SELECT * FROM costs WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Cost entry not found' })
    }

    // Build dynamic UPDATE query
    const allowedFields = [
      'location_id', 'category', 'description',
      'amount_planned', 'amount_actual', 'currency', 'date', 'notes'
    ]

    const fields = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`)
        // Convert undefined to null for SQL compatibility
        values.push(value ?? null)
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' })
    }

    values.push(id)

    run(`UPDATE costs SET ${fields.join(', ')} WHERE id = ?`, values)

    const updated = get('SELECT * FROM costs WHERE id = ?', [id])
    
    // Sync to location if applicable
    syncCostToLocation(updated)
    
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating cost:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/costs/:id
 * Delete a cost entry (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params

    const existing = get('SELECT * FROM costs WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Cost entry not found' })
    }

    run('DELETE FROM costs WHERE id = ?', [id])

    res.json({ 
      success: true, 
      message: 'Cost entry deleted successfully',
      deleted_id: id 
    })
  } catch (error) {
    console.error('Error deleting cost:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
