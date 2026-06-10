import { app } from '@azure/functions'
import { requireAdmin } from '../shared/auth.js'
import { getPackingItems, createPackingItem, updatePackingItem, deletePackingItem } from '../services/packing.js'
import { ValidationError } from '../shared/errors.js'

app.http('getPackingItems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'packing',
  handler: requireAdmin(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const items = await getPackingItems(tripId)
      return { status: 200, jsonBody: { success: true, data: items } }
    } catch (error) {
      context.error('Error fetching packing items:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('createPackingItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'packing',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const item = await createPackingItem(body)
      return { status: 201, jsonBody: { success: true, data: item } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error creating packing item:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('updatePackingItem', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'packing/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()
      const updated = await updatePackingItem(id, updates)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'Packing item not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error updating packing item:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('deletePackingItem', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'packing/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const deleted = await deletePackingItem(id)
      if (!deleted) {
        return { status: 404, jsonBody: { success: false, error: 'Packing item not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: 'Packing item deleted' } }
    } catch (error) {
      context.error('Error deleting packing item:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
