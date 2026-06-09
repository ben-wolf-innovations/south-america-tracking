import { app } from '@azure/functions'
import { get, all, run } from '../shared/database.js'
import { requireAdmin } from '../shared/auth.js'

/**
 * GET /api/packing
 * Get all packing items (admin only)
 */
app.http('getPackingItems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'packing',
  handler: requireAdmin(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      
      const items = await all(
        `SELECT * FROM packing_items 
         WHERE trip_id = ? 
         ORDER BY owner, created_at DESC`,
        [tripId]
      )
      
      return {
        status: 200,
        jsonBody: { success: true, data: items }
      }
    } catch (error) {
      context.error('Error fetching packing items:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * POST /api/packing
 * Create packing item (admin only)
 */
app.http('createPackingItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'packing',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const { owner, title, budget_amount, actual_amount, category, trip_id = 1 } = body
      
      if (!owner || !title) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Owner and title are required' }
        }
      }
      
      if (!['Ben', 'Elspeth', 'Both'].includes(owner)) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Owner must be "Ben", "Elspeth", or "Both"' }
        }
      }
      
      const roundedBudget = Math.round(parseFloat(budget_amount || 0) * 100) / 100
      const roundedActual = Math.round(parseFloat(actual_amount || 0) * 100) / 100
      
      const result = await run(
        `INSERT INTO packing_items (trip_id, owner, title, budget_amount, actual_amount, completed, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [trip_id, owner, title, roundedBudget, roundedActual, 0, category || null]
      )

      const newItem = await get('SELECT * FROM packing_items WHERE id = ?', [result.lastID])
      
      return {
        status: 201,
        jsonBody: { success: true, data: newItem }
      }
    } catch (error) {
      context.error('Error creating packing item:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * PUT /api/packing/:id
 * Update packing item (admin only)
 */
app.http('updatePackingItem', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'packing/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()

      const existing = await get('SELECT * FROM packing_items WHERE id = ?', [id])
      if (!existing) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Packing item not found' }
        }
      }

      const allowedFields = ['owner', 'title', 'budget_amount', 'actual_amount', 'completed', 'category']
      const fields = []
      const values = []

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          
          if (key === 'budget_amount' || key === 'actual_amount') {
            values.push(Math.round(parseFloat(value || 0) * 100) / 100)
          } else if (key === 'completed') {
            values.push(value ? 1 : 0)
          } else {
            values.push(value)
          }
        }
      }

      if (fields.length === 0) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'No valid fields to update' }
        }
      }

      values.push(id)
      await run(`UPDATE packing_items SET ${fields.join(', ')} WHERE id = ?`, values)

      const updated = await get('SELECT * FROM packing_items WHERE id = ?', [id])
      
      return {
        status: 200,
        jsonBody: { success: true, data: updated }
      }
    } catch (error) {
      context.error('Error updating packing item:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * DELETE /api/packing/:id
 * Soft delete packing item (admin only)
 */
app.http('deletePackingItem', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'packing/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      
      const item = await get('SELECT * FROM packing_items WHERE id = ?', [id])
      if (!item) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Packing item not found' }
        }
      }

      await run('DELETE FROM packing_items WHERE id = ?', [id])

      return {
        status: 200,
        jsonBody: { success: true, message: 'Packing item deleted' }
      }
    } catch (error) {
      context.error('Error deleting packing item:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})
