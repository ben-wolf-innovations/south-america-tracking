import { app } from '@azure/functions'
import { withAuth, requireAdmin } from '../shared/auth.js'
import { getTrip, updateTrip } from '../services/trips.js'
import { ValidationError } from '../shared/errors.js'

app.http('getTrip', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'trips/{id}',
  handler: withAuth(async (request, context) => {
    try {
      const id = request.params.id
      const trip = await getTrip(id)
      if (!trip) {
        return { status: 404, jsonBody: { success: false, error: 'Trip not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: trip } }
    } catch (error) {
      context.error('Error fetching trip:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('updateTrip', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'trips/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()
      const updated = await updateTrip(id, updates)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'Trip not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error updating trip:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
