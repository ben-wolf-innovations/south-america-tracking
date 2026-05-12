import express from 'express'
import { get, all, run } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * Helper function to sync cost changes back to location
 * Updates location's actual cost fields when accommodation, travel, activities, or food/drink costs are modified
 * Recalculates based on non-deleted costs only
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

  // Sum all costs for this category and location
  const total = get(
    `SELECT SUM(amount_actual) as total
     FROM costs
     WHERE location_id = ? AND category = ?`,
    [cost.location_id, cost.category]
  )

  run(
    `UPDATE locations 
     SET ${fieldName} = ? 
     WHERE id = ?`,
    [total?.total || null, cost.location_id]
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
    const categoryKeys = ['accommodation', 'activities', 'food', 'travel', 'other']

    // Get actual costs from costs table (non-deleted only)
    const actualCosts = all(
      `SELECT 
        category,
        COUNT(*) as count,
        SUM(amount_actual) as total_actual,
        currency
       FROM costs
       WHERE trip_id = ?
       GROUP BY category, currency
       ORDER BY category`,   
      [trip_id]
    )

    // Get planned costs by category from locations table (non-deleted only)
    // Note: accommodation costs are per night (multiply by nights)
    // Food/drink is daily allowance (multiply by nights + 1 for arrival and departure days)
    const plannedCosts = get(
      `SELECT 
        SUM(accommodation_cost_planned * nights) as accommodation_planned,
        SUM(activities_cost_planned) as activities_planned,
        SUM(food_drink_cost_planned * (nights + 1)) as food_planned,
        SUM(travel_cost_planned) as travel_planned
       FROM locations
       WHERE trip_id = ?`,  
      [trip_id]
    )

    // Map planned costs to category structure
    const categoryPlanned = {
      'accommodation': plannedCosts?.accommodation_planned || 0,
      'activities': plannedCosts?.activities_planned || 0,
      'food': plannedCosts?.food_planned || 0,
      'travel': plannedCosts?.travel_planned || 0
    }

    // Merge actual and planned by category
    const categoriesMap = {}
    
    // Add actual costs
    actualCosts.forEach(item => {
      if (!categoriesMap[item.category]) {
        categoriesMap[item.category] = {
          category: item.category,
          count: 0,
          total_actual: 0,
          total_planned: categoryPlanned[item.category] || 0,
          currency: item.currency
        }
      }
      categoriesMap[item.category].count += parseInt(item.count || 0, 10)
      categoriesMap[item.category].total_actual += parseFloat(item.total_actual || 0)
    })

    // Add categories with planned but no actual costs yet
    Object.keys(categoryPlanned).forEach(category => {
      if (!categoriesMap[category] && categoryPlanned[category] > 0) {
        categoriesMap[category] = {
          category: category,
          count: 0,
          total_actual: 0,
          total_planned: categoryPlanned[category],
          currency: 'GBP'
        }
      }
    })

    const summary = Object.values(categoriesMap)

    // Build country-level budget vs actual breakdown for each category
    const countryBudgets = all(
      `SELECT
        country,
        SUM(COALESCE(accommodation_cost_planned, 0) * COALESCE(nights, 0)) as accommodation_planned,
        SUM(COALESCE(activities_cost_planned, 0)) as activities_planned,
        SUM(COALESCE(food_drink_cost_planned, 0) * (COALESCE(nights, 0) + 1)) as food_planned,
        SUM(COALESCE(travel_cost_planned, 0)) as travel_planned
       FROM locations
       WHERE trip_id = ?
       GROUP BY country
       ORDER BY country`,
      [trip_id]
    )

    const countryActuals = all(
      `SELECT
        l.country as country,
        c.category as category,
        COUNT(*) as count,
        SUM(c.amount_actual) as total_actual
       FROM costs c
       JOIN locations l ON c.location_id = l.id
       WHERE c.trip_id = ?
         AND l.trip_id = ?
       GROUP BY l.country, c.category
       ORDER BY l.country, c.category`,
      [trip_id, trip_id]
    )

    const countryMap = {}

    countryBudgets.forEach((countryRow) => {
      const countryName = countryRow.country || 'Unknown'
      const categories = {}

      categoryKeys.forEach((key) => {
        categories[key] = {
          budgeted: 0,
          actual: 0,
          count: 0
        }
      })

      categories.accommodation.budgeted = parseFloat(countryRow.accommodation_planned || 0)
      categories.activities.budgeted = parseFloat(countryRow.activities_planned || 0)
      categories.food.budgeted = parseFloat(countryRow.food_planned || 0)
      categories.travel.budgeted = parseFloat(countryRow.travel_planned || 0)

      countryMap[countryName] = {
        country: countryName,
        categories
      }
    })

    countryActuals.forEach((item) => {
      const countryName = item.country || 'Unknown'
      if (!countryMap[countryName]) {
        const categories = {}
        categoryKeys.forEach((key) => {
          categories[key] = {
            budgeted: 0,
            actual: 0,
            count: 0
          }
        })

        countryMap[countryName] = {
          country: countryName,
          categories
        }
      }

      const categoryKey = categoryKeys.includes(item.category) ? item.category : 'other'
      countryMap[countryName].categories[categoryKey].actual += parseFloat(item.total_actual || 0)
      countryMap[countryName].categories[categoryKey].count += parseInt(item.count || 0, 10)
    })

    const byCountry = Object.values(countryMap)

    // Get budgeted costs from locations table (non-deleted only)
    // Accommodation: per-night * nights, Food: daily allowance * (nights + 1)
    const locationBudgets = get(
      `SELECT 
        SUM(accommodation_cost_planned * nights) + SUM(activities_cost_planned) + 
        SUM(food_drink_cost_planned * (nights + 1)) + SUM(travel_cost_planned) as total_planned
       FROM locations
       WHERE trip_id = ?`,
      [trip_id]
    )

    // Get actual costs from locations table (synced from costs)
    // Note: accommodation_cost_actual and food_drink_cost_actual are already totals (not per-night)
    // They are synced from costs table as SUM(amount_actual), so do NOT multiply by nights
    const locationActuals = get(
      `SELECT 
        SUM(COALESCE(accommodation_cost_actual, 0)) + SUM(COALESCE(activities_cost_actual, 0)) + 
        SUM(COALESCE(food_drink_cost_actual, 0)) + SUM(COALESCE(travel_cost_actual, 0)) as total_actual
       FROM locations
       WHERE trip_id = ?`,
      [trip_id]
    )

    res.json({ 
      success: true, 
      data: {
        by_category: summary,
        by_country: byCountry,
        location_budgets: locationBudgets,
        location_actuals: locationActuals
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
    const cleanedLocationId = location_id && location_id !== '' ? parseInt(location_id) : null
    // Round to 2 decimal places to avoid floating point precision issues
    const cleanedAmountActual = amount_actual && amount_actual !== '' ? Math.round(parseFloat(amount_actual) * 100) / 100 : null
    const cleanedDate = date && date !== '' ? date : null
    const cleanedNotes = notes && notes !== '' ? notes : null
    
    const sqlParams = [
      trip_id,
      cleanedLocationId,
      category,
      description,
      cleanedAmountActual,
      currency,
      cleanedDate,
      cleanedNotes
    ]
    
    const result = run(
      `INSERT INTO costs (
        trip_id, location_id, category, description,
        amount_actual, currency, date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      sqlParams
    )
    
    const newCost = get('SELECT * FROM costs WHERE id = ?', [result.lastID])
    
    if (!newCost) {
      // Try to see all costs to debug
      const allCosts = all('SELECT * FROM costs ORDER BY id DESC LIMIT 5')
      console.log('Recent costs:', allCosts)
      throw new Error(`Failed to retrieve created cost with ID ${result.lastID}`)
    }
    
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
      'amount_actual', 'currency', 'date', 'notes'
    ]

    const fields = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`)
        // Round monetary values to 2 decimal places to avoid floating point precision issues
        if (key === 'amount_actual' && value != null && value !== '') {
          values.push(Math.round(parseFloat(value) * 100) / 100)
        } else {
          // Convert undefined to null for SQL compatibility
          values.push(value ?? null)
        }
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
 * Hard delete a cost entry (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params

    const existing = get('SELECT * FROM costs WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Cost entry not found' })
    }

    // Hard delete: permanently remove from database
    run('DELETE FROM costs WHERE id = ?', [id])

    // Resync the location's actual costs (recalculate without this cost)
    syncCostToLocation(existing)

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
