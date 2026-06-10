import { app } from '@azure/functions'
import { withAuth, requireAdmin } from '../shared/auth.js'
import { getLocations, getLocation, createLocation, updateLocation, reorderLocation, deleteLocation } from '../services/locations.js'
import { ValidationError } from '../shared/errors.js'

app.http('getLocations', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'locations',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const locations = await getLocations(tripId)
      return { status: 200, jsonBody: { success: true, data: locations } }
    } catch (error) {
      context.error('Error fetching locations:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('getLocation', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'locations/{id}',
  handler: withAuth(async (request, context) => {
    try {
      const location = await getLocation(request.params.id)
      if (!location) {
        return { status: 404, jsonBody: { success: false, error: 'Location not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: location } }
    } catch (error) {
      context.error('Error fetching location:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('createLocation', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'locations',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const location = await createLocation(body)
      return { status: 201, jsonBody: { success: true, data: location } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error creating location:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('updateLocation', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'locations/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()
      const updated = await updateLocation(id, updates)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'Location not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error updating location:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('reorderLocation', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'locations/{id}/reorder',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const body = await request.json()
      const message = await reorderLocation(id, body.new_sequence)
      if (!message) {
        return { status: 404, jsonBody: { success: false, error: 'Location not found' } }
      }
      return { status: 200, jsonBody: { success: true, message } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error reordering location:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('deleteLocation', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'locations/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const deleted = await deleteLocation(request.params.id)
      if (!deleted) {
        return { status: 404, jsonBody: { success: false, error: 'Location not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: 'Location deleted' } }
    } catch (error) {
      context.error('Error deleting location:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
