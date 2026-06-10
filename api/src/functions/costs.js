import { app } from '@azure/functions'
import { withAuth, requireAdmin } from '../shared/auth.js'
import { getCosts, createCost, getCostsSummary, updateCost, deleteCost } from '../services/costs.js'
import { ValidationError } from '../shared/errors.js'

app.http('getCosts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'costs',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const costs = await getCosts(tripId, {
        location_id: request.query.get('location_id'),
        category: request.query.get('category')
      })
      return { status: 200, jsonBody: { success: true, data: costs } }
    } catch (error) {
      context.error('Error fetching costs:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('createCost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'costs',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const cost = await createCost(body)
      return { status: 201, jsonBody: { success: true, data: cost } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error creating cost:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('getCostsSummary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'costs/summary',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const data = await getCostsSummary(tripId)
      return { status: 200, jsonBody: { success: true, data } }
    } catch (error) {
      context.error('Error fetching cost summary:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('updateCost', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'costs/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()
      const updated = await updateCost(id, updates)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'Cost not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error updating cost:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('deleteCost', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'costs/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const deleted = await deleteCost(id)
      if (!deleted) {
        return { status: 404, jsonBody: { success: false, error: 'Cost not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: 'Cost deleted' } }
    } catch (error) {
      context.error('Error deleting cost:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
