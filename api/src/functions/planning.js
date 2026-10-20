import { app } from '@azure/functions'
import { requireAdmin } from '../shared/auth.js'
import { getTimeline, createPlanItem, updatePlanItem, deletePlanItem } from '../services/planning.js'
import { ValidationError } from '../shared/errors.js'

app.http('getPlanning', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'planning',
  handler: requireAdmin(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const timeline = await getTimeline(tripId)
      return { status: 200, jsonBody: { success: true, data: timeline } }
    } catch (error) {
      context.error('Error fetching planning timeline:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('createPlanItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'planning',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const item = await createPlanItem(body)
      return { status: 201, jsonBody: { success: true, data: item } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error creating plan item:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('updatePlanItem', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'planning/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const updated = await updatePlanItem(request.params.id, body)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'Plan item not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error updating plan item:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('deletePlanItem', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'planning/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const deleted = await deletePlanItem(request.params.id)
      if (!deleted) {
        return { status: 404, jsonBody: { success: false, error: 'Plan item not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: 'Plan item deleted' } }
    } catch (error) {
      context.error('Error deleting plan item:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
