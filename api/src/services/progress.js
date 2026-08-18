import { get, all, run, transaction } from '../shared/turso.js'
import { ValidationError } from '../shared/errors.js'
import { estimateLocationDates } from '../shared/estimateDates.js'

export async function checkIn(locationId) {
  if (!locationId) throw new ValidationError('Location ID is required')

  const location = await get('SELECT * FROM locations WHERE id = ?', [locationId])
  if (!location) return null

  if (location.visited === 1) {
    throw new ValidationError(`${location.name} (stop #${location.sequence}) has already been visited`)
  }

  const firstUnvisitedPrevious = await get(
    `SELECT * FROM locations
     WHERE trip_id = ? AND sequence < ? AND visited = 0
     AND (is_travel_overnight IS NULL OR is_travel_overnight = 0)
     ORDER BY sequence ASC LIMIT 1`,
    [location.trip_id, location.sequence]
  )

  if (firstUnvisitedPrevious) {
    throw new ValidationError(
      `You must check in to ${firstUnvisitedPrevious.name} (stop #${firstUnvisitedPrevious.sequence}) before checking in here (stop #${location.sequence})`
    )
  }

  let arrivalDate = location.arrival_date
  let departureDate = location.departure_date

  if (!arrivalDate || !departureDate) {
    const trip = await get('SELECT * FROM trips WHERE id = ?', [location.trip_id])
    const tripStartDate = trip?.start_date ? new Date(trip.start_date) : null

    if (tripStartDate) {
      const allLocations = await all(
        `SELECT * FROM locations WHERE trip_id = ? ORDER BY sequence ASC`,
        [location.trip_id]
      )

      const estimated = estimateLocationDates(allLocations, tripStartDate)
      const target = estimated.find(loc => loc.id === location.id)

      if (!arrivalDate) arrivalDate = target.estimated_arrival_date
      if (!departureDate) departureDate = target.estimated_departure_date
    }
  }

  await transaction([
    { sql: 'UPDATE locations SET is_current = 0 WHERE trip_id = ?', params: [location.trip_id] },
    { sql: 'UPDATE locations SET is_current = 1, visited = 1, visited_date = ?, arrival_date = ?, departure_date = ? WHERE id = ?', params: [new Date().toISOString().split('T')[0], arrivalDate, departureDate, locationId] }
  ])

  const updatedLocation = await get('SELECT * FROM locations WHERE id = ?', [locationId])

  return { message: `Checked in to ${location.name}!`, location: updatedLocation }
}

export async function clearVisited(tripId) {
  await run(
    `UPDATE locations
     SET visited = 0, is_current = 0, visited_date = NULL, arrival_date = NULL, departure_date = NULL
     WHERE trip_id = ?`,
    [tripId]
  )
}

export async function undoLastVisited(tripId) {
  const lastVisited = await get(
    `SELECT * FROM locations
     WHERE trip_id = ? AND visited = 1
     ORDER BY sequence DESC LIMIT 1`,
    [tripId]
  )

  if (!lastVisited) return null

  await run(
    `UPDATE locations
     SET visited = 0, is_current = 0, visited_date = NULL, arrival_date = NULL, departure_date = NULL
     WHERE id = ?`,
    [lastVisited.id]
  )

  return `Undid check-in for ${lastVisited.name}`
}

export async function getCurrentLocation(tripId) {
  return get('SELECT * FROM locations WHERE trip_id = ? AND is_current = 1', [tripId])
}

export async function getProgressStats(tripId) {
  const stats = await get(
    `SELECT
      COUNT(*) as total_locations,
      SUM(CASE WHEN visited = 1 THEN 1 ELSE 0 END) as visited_count,
      SUM(CASE WHEN is_current = 1 THEN 1 ELSE 0 END) as current_count
     FROM locations
     WHERE trip_id = ?`,
    [tripId]
  )

  return {
    total: stats.total_locations || 0,
    visited: stats.visited_count || 0,
    current: stats.current_count || 0,
    remaining: (stats.total_locations || 0) - (stats.visited_count || 0)
  }
}
