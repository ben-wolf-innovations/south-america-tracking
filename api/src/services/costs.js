import { get, all, run } from '../shared/turso.js'
import { ValidationError } from '../shared/errors.js'

const CATEGORIES = ['accommodation', 'activities', 'food', 'travel', 'other']

export async function getCosts(tripId, { location_id, category } = {}) {
  let sql = 'SELECT * FROM costs WHERE trip_id = ?'
  const params = [tripId]

  if (location_id) {
    sql += ' AND location_id = ?'
    params.push(location_id)
  }

  if (category) {
    sql += ' AND category = ?'
    params.push(category)
  }

  sql += ' ORDER BY date DESC, created_at DESC'

  return all(sql, params)
}

export async function createCost({ trip_id = 1, location_id, category, description, amount_actual, currency = 'USD', date }) {
  if (!category || !amount_actual) throw new ValidationError('Category and amount are required')
  if (!CATEGORIES.includes(category)) throw new ValidationError('Invalid category')

  const result = await run(
    `INSERT INTO costs (trip_id, location_id, category, description, amount_actual, currency, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [trip_id, location_id || null, category, description || null, amount_actual, currency, date || new Date().toISOString().split('T')[0]]
  )

  return get('SELECT * FROM costs WHERE id = ?', [result.lastID])
}

export async function getCostsSummary(tripId) {
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
    [tripId]
  )

  const plannedCosts = await get(
    `SELECT
      SUM(accommodation_cost_planned * nights) as accommodation_planned,
      SUM(activities_cost_planned) as activities_planned,
      SUM(food_drink_cost_planned * (nights + 1)) as food_planned,
      SUM(travel_cost_planned) as travel_planned
     FROM locations
     WHERE trip_id = ?`,
    [tripId]
  )

  const categoryPlanned = {
    accommodation: plannedCosts?.accommodation_planned || 0,
    activities: plannedCosts?.activities_planned || 0,
    food: plannedCosts?.food_planned || 0,
    travel: plannedCosts?.travel_planned || 0
  }

  const categoriesMap = {}

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

  Object.keys(categoryPlanned).forEach(category => {
    if (!categoriesMap[category] && categoryPlanned[category] > 0) {
      categoriesMap[category] = {
        category,
        count: 0,
        total_actual: 0,
        total_planned: categoryPlanned[category],
        currency: 'GBP'
      }
    }
  })

  const summary = Object.values(categoriesMap)

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
    [tripId]
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
    [tripId, tripId]
  )

  const countryMap = {}

  countryBudgets.forEach(countryRow => {
    const countryName = countryRow.country || 'Unknown'
    const categories = {}

    CATEGORIES.forEach(key => {
      categories[key] = { budgeted: 0, actual: 0, count: 0 }
    })

    categories.accommodation.budgeted = parseFloat(countryRow.accommodation_planned || 0)
    categories.activities.budgeted = parseFloat(countryRow.activities_planned || 0)
    categories.food.budgeted = parseFloat(countryRow.food_planned || 0)
    categories.travel.budgeted = parseFloat(countryRow.travel_planned || 0)

    countryMap[countryName] = { country: countryName, categories }
  })

  countryActuals.forEach(item => {
    const countryName = item.country || 'Unknown'
    if (!countryMap[countryName]) {
      const categories = {}
      CATEGORIES.forEach(key => {
        categories[key] = { budgeted: 0, actual: 0, count: 0 }
      })
      countryMap[countryName] = { country: countryName, categories }
    }

    const categoryKey = CATEGORIES.includes(item.category) ? item.category : 'other'
    countryMap[countryName].categories[categoryKey].actual += parseFloat(item.total_actual || 0)
    countryMap[countryName].categories[categoryKey].count += parseInt(item.count || 0, 10)
  })

  const byCountry = Object.values(countryMap)

  const locationBudgets = await get(
    `SELECT
      SUM(accommodation_cost_planned * nights) + SUM(activities_cost_planned) +
      SUM(food_drink_cost_planned * (nights + 1)) + SUM(travel_cost_planned) as total_planned
     FROM locations
     WHERE trip_id = ?`,
    [tripId]
  )

  const locationActuals = await get(
    `SELECT
      SUM(COALESCE(accommodation_cost_actual, 0)) + SUM(COALESCE(activities_cost_actual, 0)) +
      SUM(COALESCE(food_drink_cost_actual, 0)) + SUM(COALESCE(travel_cost_actual, 0)) as total_actual
     FROM locations
     WHERE trip_id = ?`,
    [tripId]
  )

  return {
    by_category: summary,
    by_country: byCountry,
    location_budgets: locationBudgets,
    location_actuals: locationActuals
  }
}

export async function updateCost(id, updates) {
  const existing = await get('SELECT * FROM costs WHERE id = ?', [id])
  if (!existing) return null

  const allowedFields = ['location_id', 'category', 'description', 'amount_actual', 'currency', 'date']
  const fields = []
  const values = []

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`)
      values.push(value === '' ? null : value)
    }
  }

  if (fields.length === 0) throw new ValidationError('No valid fields to update')

  values.push(id)
  await run(`UPDATE costs SET ${fields.join(', ')} WHERE id = ?`, values)

  return get('SELECT * FROM costs WHERE id = ?', [id])
}

export async function deleteCost(id) {
  const cost = await get('SELECT * FROM costs WHERE id = ?', [id])
  if (!cost) return false

  await run('DELETE FROM costs WHERE id = ?', [id])
  return true
}
