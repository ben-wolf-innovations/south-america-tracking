import { get, all, run, transaction } from '../shared/turso.js'
import { ValidationError } from '../shared/errors.js'

export async function getLocations(tripId) {
  const trip = await get('SELECT * FROM trips WHERE id = ?', [tripId])
  const tripStartDate = trip?.start_date ? new Date(trip.start_date) : null

  const locations = await all(
    `SELECT * FROM locations WHERE trip_id = ? ORDER BY sequence ASC`,
    [tripId]
  )

  const allCosts = await all(
    `SELECT c.location_id, c.category, SUM(c.amount_actual) as total
     FROM costs c
     JOIN locations l ON c.location_id = l.id
     WHERE l.trip_id = ?
     GROUP BY c.location_id, c.category`,
    [tripId]
  )

  const costsMap = {}
  allCosts.forEach(cost => {
    if (!costsMap[cost.location_id]) costsMap[cost.location_id] = {}
    costsMap[cost.location_id][cost.category] = cost.total || 0
  })

  for (const location of locations) {
    const costs = costsMap[location.id] || {}
    location.accommodation_cost_actual = costs.accommodation || 0
    location.travel_cost_actual = costs.travel || 0
    location.activities_cost_actual = costs.activities || 0
    location.food_drink_cost_actual = costs.food || 0
  }

  if (tripStartDate && locations.length > 0) {
    const lastVisited = locations
      .filter(loc => loc.visited === 1)
      .sort((a, b) => b.sequence - a.sequence)[0]

    let baseDate = null
    let startFromSequence = 1

    if (lastVisited) {
      if (lastVisited.departure_date) {
        baseDate = new Date(lastVisited.departure_date)
      } else if (lastVisited.arrival_date) {
        baseDate = new Date(lastVisited.arrival_date)
        baseDate.setDate(baseDate.getDate() + (lastVisited.nights || 0))
      } else {
        baseDate = new Date(tripStartDate)
      }
      startFromSequence = lastVisited.sequence + 1
    } else {
      baseDate = new Date(tripStartDate)
    }

    let cumulativeDays = 0

    locations.forEach(location => {
      if (location.sequence < startFromSequence) {
        const tempDate = new Date(tripStartDate)
        tempDate.setDate(tempDate.getDate() + cumulativeDays)
        location.estimated_arrival_date = tempDate.toISOString().split('T')[0]

        const tempDeparture = new Date(tempDate)
        tempDeparture.setDate(tempDeparture.getDate() + (location.nights || 0))
        location.estimated_departure_date = tempDeparture.toISOString().split('T')[0]
      } else {
        const daysSinceBase = locations
          .filter(loc => loc.sequence >= startFromSequence && loc.sequence < location.sequence)
          .reduce((sum, loc) => sum + (loc.nights || 0), 0)

        const estimatedArrival = new Date(baseDate)
        estimatedArrival.setDate(estimatedArrival.getDate() + daysSinceBase)

        const estimatedDeparture = new Date(estimatedArrival)
        estimatedDeparture.setDate(estimatedDeparture.getDate() + (location.nights || 0))

        location.estimated_arrival_date = estimatedArrival.toISOString().split('T')[0]
        location.estimated_departure_date = estimatedDeparture.toISOString().split('T')[0]
      }

      cumulativeDays += (location.nights || 0)
    })
  }

  return locations
}

export async function getLocation(id) {
  return get('SELECT * FROM locations WHERE id = ?', [id])
}

export async function createLocation(body) {
  const {
    trip_id = 1, name, country, latitude, longitude, nights = 1,
    arrival_date, departure_date, accommodation_name, accommodation_cost_planned,
    accommodation_cost_actual, accommodation_notes, accommodation_booking_ref, accommodation_booked = false,
    activities, activities_cost_planned, activities_cost_actual,
    food_drink_cost_planned, food_drink_cost_actual, travel_method,
    travel_cost_planned, travel_cost_actual, transport_booked = false, sequence, is_travel_overnight = false,
    notes, travel_duration
  } = body

  if (!name) throw new ValidationError('Name is required')
  if (!is_travel_overnight && !country) throw new ValidationError('Country is required for regular locations')

  let finalSequence = sequence

  if (!sequence) {
    const maxSeq = await get('SELECT MAX(sequence) as max FROM locations WHERE trip_id = ?', [trip_id])
    finalSequence = (Number(maxSeq?.max) || 0) + 1
  }

  const insertSql = `INSERT INTO locations (
    trip_id, sequence, name, country, latitude, longitude, nights,
    arrival_date, departure_date, accommodation_name, accommodation_cost_planned,
    accommodation_cost_actual, accommodation_notes, accommodation_booking_ref, accommodation_booked,
    activities, activities_cost_planned, activities_cost_actual,
    food_drink_cost_planned, food_drink_cost_actual, travel_method,
    travel_cost_planned, travel_cost_actual, transport_booked, is_travel_overnight, notes, travel_duration
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

  const insertParams = [
    trip_id, finalSequence, name, country || null, latitude || null, longitude || null, nights,
    arrival_date || null, departure_date || null, accommodation_name || null,
    accommodation_cost_planned || null, accommodation_cost_actual || null,
    accommodation_notes || null, accommodation_booking_ref || null, accommodation_booked ? 1 : 0,
    activities || null, activities_cost_planned || null,
    activities_cost_actual || null, food_drink_cost_planned || null,
    food_drink_cost_actual || null, travel_method || null,
    travel_cost_planned || null, travel_cost_actual || null, transport_booked ? 1 : 0, is_travel_overnight ? 1 : 0,
    notes || null, travel_duration || null
  ]

  if (sequence) {
    await transaction([
      { sql: 'UPDATE locations SET sequence = sequence + 1 WHERE trip_id = ? AND sequence >= ?', params: [trip_id, sequence] },
      { sql: insertSql, params: insertParams }
    ])
    return get('SELECT * FROM locations WHERE trip_id = ? AND sequence = ?', [trip_id, finalSequence])
  }

  const result = await run(insertSql, insertParams)
  return get('SELECT * FROM locations WHERE id = ?', [result.lastID])
}

export async function updateLocation(id, updates) {
  const existing = await get('SELECT * FROM locations WHERE id = ?', [id])
  if (!existing) return null

  const allowedFields = [
    'name', 'country', 'latitude', 'longitude', 'nights', 'arrival_date', 'departure_date',
    'accommodation_name', 'accommodation_cost_planned', 'accommodation_cost_actual',
    'accommodation_notes', 'accommodation_booking_ref', 'accommodation_booked',
    'activities', 'activities_cost_planned', 'activities_cost_actual',
    'food_drink_cost_planned', 'food_drink_cost_actual', 'travel_method',
    'travel_cost_planned', 'travel_cost_actual', 'transport_booked', 'is_travel_overnight',
    'notes', 'travel_duration'
  ]

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
  await run(`UPDATE locations SET ${fields.join(', ')} WHERE id = ?`, values)

  return get('SELECT * FROM locations WHERE id = ?', [id])
}

export async function reorderLocation(id, newSequence) {
  if (!newSequence || typeof newSequence !== 'number') {
    throw new ValidationError('new_sequence is required and must be a number')
  }

  const location = await get('SELECT * FROM locations WHERE id = ?', [id])
  if (!location) return null

  const oldSequence = location.sequence

  if (oldSequence === newSequence) {
    return 'Location sequence unchanged'
  }

  const shiftStatement = newSequence < oldSequence
    ? { sql: 'UPDATE locations SET sequence = sequence + 1 WHERE trip_id = ? AND sequence >= ? AND sequence < ?', params: [location.trip_id, newSequence, oldSequence] }
    : { sql: 'UPDATE locations SET sequence = sequence - 1 WHERE trip_id = ? AND sequence > ? AND sequence <= ?', params: [location.trip_id, oldSequence, newSequence] }

  await transaction([
    shiftStatement,
    { sql: 'UPDATE locations SET sequence = ? WHERE id = ?', params: [newSequence, id] }
  ])

  return 'Location reordered'
}

export async function deleteLocation(id) {
  const location = await get('SELECT * FROM locations WHERE id = ?', [id])
  if (!location) return false

  await run('DELETE FROM locations WHERE id = ?', [id])
  await run(
    'UPDATE locations SET sequence = sequence - 1 WHERE trip_id = ? AND sequence > ?',
    [location.trip_id, location.sequence]
  )

  return true
}
