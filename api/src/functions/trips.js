import { app } from '@azure/functions'
import { get, run } from '../shared/database.js'
import { withAuth, requireAdmin } from '../shared/auth.js'

/**
 * GET /api/trips/:id
 * Get trip details
 */
app.http('getTrip', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'trips/{id}',
  handler: withAuth(async (request, context) => {
    try {
      const id = request.params.id
      const trip = await get('SELECT * FROM trips WHERE id = ?', [id])
      
      if (!trip) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Trip not found' }
        }
      }

      return {
        status: 200,
        jsonBody: { success: true, data: trip }
      }
    } catch (error) {
      context.error('Error fetching trip:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * PUT /api/trips/:id
 * Update trip (admin only)
 */
app.http('updateTrip', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'trips/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()

      const existing = await get('SELECT * FROM trips WHERE id = ?', [id])
      if (!existing) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Trip not found' }
        }
      }

      const allowedFields = ['name', 'description', 'start_date', 'end_date', 'status']
      const fields = []
      const values = []

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          values.push(value)
        }
      }

      if (fields.length === 0) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'No valid fields to update' }
        }
      }

      fields.push('updated_at = datetime("now")')
      values.push(id)

      await run(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`, values)

      const updated = await get('SELECT * FROM trips WHERE id = ?', [id])
      
      return {
        status: 200,
        jsonBody: { success: true, data: updated }
      }
    } catch (error) {
      context.error('Error updating trip:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})
