import { app } from '@azure/functions'
import { get, all, run, transaction } from '../shared/database.js'
import { withAuth, requireAdmin } from '../shared/auth.js'

/**
 * POST /api/progress/checkin
 * Check in to location (admin only)
 */
app.http('progressCheckin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'progress/checkin',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const { location_id } = body

      if (!location_id) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Location ID is required' }
        }
      }

      const location = await get(
        'SELECT * FROM locations WHERE id = ? AND (deleted IS NULL OR deleted = 0)',
        [location_id]
      )

      if (!location) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Location not found' }
        }
      }

      if (location.visited === 1) {
        return {
          status: 400,
          jsonBody: { 
            success: false,
            error: `${location.name} (stop #${location.sequence}) has already been visited`
          }
        }
      }

      // Check sequential check-in (exclude travel overnight locations)
      const firstUnvisitedPrevious = await get(
        `SELECT * FROM locations 
         WHERE trip_id = ? AND sequence < ? AND visited = 0
         AND (is_travel_overnight IS NULL OR is_travel_overnight = 0)
         AND (deleted IS NULL OR deleted = 0)
         ORDER BY sequence ASC LIMIT 1`,
        [location.trip_id, location.sequence]
      )

      if (firstUnvisitedPrevious) {
        return {
          status: 400,
          jsonBody: { 
            success: false,
            error: `You must check in to ${firstUnvisitedPrevious.name} (stop #${firstUnvisitedPrevious.sequence}) before checking in here (stop #${location.sequence})`
          }
        }
      }

      // Calculate estimated dates if not set
      let arrivalDate = location.arrival_date
      let departureDate = location.departure_date

      if (!arrivalDate || !departureDate) {
        const trip = await get('SELECT * FROM trips WHERE id = ?', [location.trip_id])
        const tripStartDate = trip?.start_date ? new Date(trip.start_date) : null

        if (tripStartDate) {
          const lastVisited = await get(
            `SELECT * FROM locations 
             WHERE trip_id = ? AND sequence < ? AND visited = 1
             ORDER BY sequence DESC LIMIT 1`,
            [location.trip_id, location.sequence]
          )

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

          const intermediateLocations = await all(
            `SELECT * FROM locations 
             WHERE trip_id = ? AND sequence >= ? AND sequence < ?
             ORDER BY sequence ASC`,
            [location.trip_id, startFromSequence, location.sequence]
          )

          const daysSinceBase = intermediateLocations.reduce((sum, loc) => sum + (loc.nights || 0), 0)
          const estimatedArrival = new Date(baseDate)
          estimatedArrival.setDate(estimatedArrival.getDate() + daysSinceBase)

          const estimatedDeparture = new Date(estimatedArrival)
          estimatedDeparture.setDate(estimatedDeparture.getDate() + (location.nights || 0))

          if (!arrivalDate) arrivalDate = estimatedArrival.toISOString().split('T')[0]
          if (!departureDate) departureDate = estimatedDeparture.toISOString().split('T')[0]
        }
      }

      await transaction((runInTransaction) => {
        runInTransaction('UPDATE locations SET is_current = 0 WHERE trip_id = ?', [location.trip_id])
        runInTransaction(
          `UPDATE locations 
           SET is_current = 1, visited = 1, visited_date = ?, arrival_date = ?, departure_date = ?
           WHERE id = ?`,
          [new Date().toISOString().split('T')[0], arrivalDate, departureDate, location_id]
        )
      })

      const updatedLocation = await get('SELECT * FROM locations WHERE id = ?', [location_id])

      return {
        status: 200,
        jsonBody: { 
          success: true,
          message: `Checked in to ${location.name}!`,
          data: updatedLocation
        }
      }
    } catch (error) {
      context.error('Error checking in:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * POST /api/progress/clear-visited
 * Clear all visited flags (admin only)
 */
app.http('progressClearVisited', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'progress/clear-visited',
  handler: requireAdmin(async (request, context) => {
    try {
      let body = {}
      try {
        body = await request.json()
      } catch (e) {
        // Empty body is okay, use defaults
      }
      const tripId = body.trip_id || 1
      
      await run(
        `UPDATE locations 
         SET visited = 0, is_current = 0, visited_date = NULL, arrival_date = NULL, departure_date = NULL
         WHERE trip_id = ?`,
        [tripId]
      )

      return {
        status: 200,
        jsonBody: { success: true, message: 'All visited flags cleared' }
      }
    } catch (error) {
      context.error('Error clearing visited flags:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * POST /api/progress/undo-last-visited
 * Undo last check-in (admin only)
 */
app.http('progressUndoLastVisited', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'progress/undo-last-visited',
  handler: requireAdmin(async (request, context) => {
    try {
      let body = {}
      try {
        body = await request.json()
      } catch (e) {
        // Empty body is okay, use defaults
      }
      const tripId = body.trip_id || 1
      
      const lastVisited = await get(
        `SELECT * FROM locations 
         WHERE trip_id = ? AND visited = 1
         ORDER BY sequence DESC LIMIT 1`,
        [tripId]
      )

      if (!lastVisited) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'No visited locations to undo' }
        }
      }

      await run(
        `UPDATE locations 
         SET visited = 0, is_current = 0, visited_date = NULL, arrival_date = NULL, departure_date = NULL
         WHERE id = ?`,
        [lastVisited.id]
      )

      return {
        status: 200,
        jsonBody: { 
          success: true,
          message: `Undid check-in for ${lastVisited.name}`
        }
      }
    } catch (error) {
      context.error('Error undoing last visited:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * GET /api/progress/current
 * Get current location
 */
app.http('progressGetCurrent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'progress/current',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      
      const currentLocation = await get(
        `SELECT * FROM locations 
         WHERE trip_id = ? AND is_current = 1
         AND (deleted IS NULL OR deleted = 0)`,
        [tripId]
      )

      if (!currentLocation) {
        return {
          status: 200,
          jsonBody: { 
            success: true,
            data: null,
            message: 'No current location set'
          }
        }
      }

      return {
        status: 200,
        jsonBody: { success: true, data: currentLocation }
      }
    } catch (error) {
      context.error('Error getting current location:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * GET /api/progress/stats
 * Get progress statistics
 */
app.http('progressGetStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'progress/stats',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      
      const stats = await get(
        `SELECT 
          COUNT(*) as total_locations,
          SUM(CASE WHEN visited = 1 THEN 1 ELSE 0 END) as visited_count,
          SUM(CASE WHEN is_current = 1 THEN 1 ELSE 0 END) as current_count
         FROM locations 
         WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)`,
        [tripId]
      )

      return {
        status: 200,
        jsonBody: { 
          success: true,
          data: {
            total: stats.total_locations || 0,
            visited: stats.visited_count || 0,
            current: stats.current_count || 0,
            remaining: (stats.total_locations || 0) - (stats.visited_count || 0)
          }
        }
      }
    } catch (error) {
      context.error('Error getting progress stats:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})
