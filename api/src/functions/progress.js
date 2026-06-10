import { app } from '@azure/functions'
import { withAuth, requireAdmin } from '../shared/auth.js'
import { checkIn, clearVisited, undoLastVisited, getCurrentLocation, getProgressStats } from '../services/progress.js'
import { ValidationError } from '../shared/errors.js'

app.http('progressCheckin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'progress/checkin',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const result = await checkIn(body.location_id)
      if (!result) {
        return { status: 404, jsonBody: { success: false, error: 'Location not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: result.message, data: result.location } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error checking in:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('progressClearVisited', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'progress/clear-visited',
  handler: requireAdmin(async (request, context) => {
    try {
      let body = {}
      try { body = await request.json() } catch (e) { /* empty body is okay */ }
      await clearVisited(body.trip_id || 1)
      return { status: 200, jsonBody: { success: true, message: 'All visited flags cleared' } }
    } catch (error) {
      context.error('Error clearing visited flags:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('progressUndoLastVisited', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'progress/undo-last-visited',
  handler: requireAdmin(async (request, context) => {
    try {
      let body = {}
      try { body = await request.json() } catch (e) { /* empty body is okay */ }
      const message = await undoLastVisited(body.trip_id || 1)
      if (!message) {
        return { status: 404, jsonBody: { success: false, error: 'No visited locations to undo' } }
      }
      return { status: 200, jsonBody: { success: true, message } }
    } catch (error) {
      context.error('Error undoing last visited:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('progressGetCurrent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'progress/current',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const currentLocation = await getCurrentLocation(tripId)
      if (!currentLocation) {
        return { status: 200, jsonBody: { success: true, data: null, message: 'No current location set' } }
      }
      return { status: 200, jsonBody: { success: true, data: currentLocation } }
    } catch (error) {
      context.error('Error getting current location:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('progressGetStats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'progress/stats',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const data = await getProgressStats(tripId)
      return { status: 200, jsonBody: { success: true, data } }
    } catch (error) {
      context.error('Error getting progress stats:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
