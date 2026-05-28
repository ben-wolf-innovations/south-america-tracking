import { app } from '@azure/functions'
import { get, all, run } from '../shared/database.js'
import { withAuth, requireAdmin } from '../shared/auth.js'

/**
 * GET /api/costs
 * Get all costs with optional filters
 */
app.http('getCosts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'costs',
  handler: withAuth(async (request, context) => {
    try {
      const trip_id = request.query.get('trip_id') || '1'
      const location_id = request.query.get('location_id')
      const category = request.query.get('category')
      
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

      const costs = await all(sql, params)
      
      return {
        status: 200,
        jsonBody: { success: true, data: costs }
      }
    } catch (error) {
      context.error('Error fetching costs:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * POST /api/costs
 * Create new cost (admin only)
 */
app.http('createCost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'costs',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const {
        trip_id = 1,
        location_id,
        category,
        description,
        amount_actual,
        currency = 'USD',
        date
      } = body

      if (!category || !amount_actual) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Category and amount are required' }
        }
      }

      const validCategories = ['accommodation', 'travel', 'activities', 'food', 'other']
      if (!validCategories.includes(category)) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Invalid category' }
        }
      }

      const result = await run(
        `INSERT INTO costs (trip_id, location_id, category, description, amount_actual, currency, date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [trip_id, location_id || null, category, description || null, amount_actual, currency, date || new Date().toISOString().split('T')[0]]
      )

      const newCost = await get('SELECT * FROM costs WHERE id = ?', [result.lastID])
      
      return {
        status: 201,
        jsonBody: { success: true, data: newCost }
      }
    } catch (error) {
      context.error('Error creating cost:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * PUT /api/costs/:id
 * Update cost (admin only)
 */
app.http('updateCost', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'costs/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()

      const existing = await get('SELECT * FROM costs WHERE id = ?', [id])
      if (!existing) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Cost not found' }
        }
      }

      const allowedFields = ['location_id', 'category', 'description', 'amount_actual', 'currency', 'date']
      const fields = []
      const values = []

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          values.push(value === '' ? null : value)
        }
      }

      if (fields.length === 0) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'No valid fields to update' }
        }
      }

      values.push(id)
      await run(`UPDATE costs SET ${fields.join(', ')} WHERE id = ?`, values)

      const updated = await get('SELECT * FROM costs WHERE id = ?', [id])
      
      return {
        status: 200,
        jsonBody: { success: true, data: updated }
      }
    } catch (error) {
      context.error('Error updating cost:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * DELETE /api/costs/:id
 * Delete cost (admin only)
 */
app.http('deleteCost', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'costs/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      
      const cost = await get('SELECT * FROM costs WHERE id = ?', [id])
      if (!cost) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Cost not found' }
        }
      }

      await run('DELETE FROM costs WHERE id = ?', [id])

      return {
        status: 200,
        jsonBody: { success: true, message: 'Cost deleted' }
      }
    } catch (error) {
      context.error('Error deleting cost:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * GET /api/costs/summary
 * Get cost summary (planned vs actual by category and country)
 */
app.http('getCostsSummary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'costs/summary',
  handler: withAuth(async (request, context) => {
    try {
      const trip_id = request.query.get('trip_id') || '1'
      const categoryKeys = ['accommodation', 'activities', 'food', 'travel', 'other']

      // Get actual costs from costs table (non-deleted only)
      const actualCosts = await all(
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
      const plannedCosts = await get(
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
      const countryBudgets = await all(
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

      const countryActuals = await all(
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
      const locationBudgets = await get(
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
      const locationActuals = await get(
        `SELECT 
          SUM(COALESCE(accommodation_cost_actual, 0)) + SUM(COALESCE(activities_cost_actual, 0)) + 
          SUM(COALESCE(food_drink_cost_actual, 0)) + SUM(COALESCE(travel_cost_actual, 0)) as total_actual
         FROM locations
         WHERE trip_id = ?`,
        [trip_id]
      )

      return {
        status: 200,
        jsonBody: { 
          success: true, 
          data: {
            by_category: summary,
            by_country: byCountry,
            location_budgets: locationBudgets,
            location_actuals: locationActuals
          }
        }
      }
    } catch (error) {
      context.error('Error fetching cost summary:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})
