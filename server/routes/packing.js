import express from 'express'
import { get, all, run } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// All packing list routes require authentication and admin access
router.use(authenticateToken)
router.use(requireAdmin)

/**
 * GET /api/packing
 * Get all packing items for all owners
 */
router.get('/', (req, res) => {
  try {
    const tripId = req.query.trip_id || 1
    
    const items = all(
      `SELECT * FROM packing_items 
       WHERE trip_id = ? 
       AND (deleted IS NULL OR deleted = 0)
       ORDER BY owner, created_at DESC`,
      [tripId]
    )
    
    res.json({ 
      success: true, 
      data: items 
    })
  } catch (error) {
    console.error('Error fetching packing items:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * GET /api/packing/:owner
 * Get packing items for a specific owner
 */
router.get('/:owner', (req, res) => {
  try {
    const { owner } = req.params
    const tripId = req.query.trip_id || 1
    
    const items = all(
      `SELECT * FROM packing_items 
       WHERE trip_id = ? 
       AND owner = ?
       AND (deleted IS NULL OR deleted = 0)
       ORDER BY created_at DESC`,
      [tripId, owner]
    )
    
    res.json({ 
      success: true, 
      data: items 
    })
  } catch (error) {
    console.error('Error fetching packing items:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * POST /api/packing
 * Create a new packing item
 */
router.post('/', (req, res) => {
  try {
    const { owner, title, budget_amount, actual_amount } = req.body
    const tripId = req.body.trip_id || 1
    
    if (!owner || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Owner and title are required' 
      })
    }
    
    // Validate owner
    if (!['Ben', 'Elspeth', 'Both'].includes(owner)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Owner must be "Ben", "Elspeth", or "Both"' 
      })
    }
    
    const result = run(
      `INSERT INTO packing_items (trip_id, owner, title, budget_amount, actual_amount, completed)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [tripId, owner, title, budget_amount || 0, actual_amount || 0]
    )
    
    const newItem = get(
      'SELECT * FROM packing_items WHERE id = ?',
      [result.lastID]
    )
    
    res.json({ 
      success: true, 
      message: 'Packing item created successfully',
      data: newItem 
    })
  } catch (error) {
    console.error('Error creating packing item:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * PUT /api/packing/:id
 * Update a packing item
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const { owner, title, budget_amount, actual_amount, completed } = req.body
    
    // Validate owner if provided
    if (owner && !['Ben', 'Elspeth', 'Both'].includes(owner)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Owner must be "Ben", "Elspeth", or "Both"' 
      })
    }
    
    // Build update query dynamically
    const updates = []
    const values = []
    
    if (owner !== undefined) {
      updates.push('owner = ?')
      values.push(owner)
    }
    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title)
    }
    if (budget_amount !== undefined) {
      updates.push('budget_amount = ?')
      values.push(budget_amount)
    }
    if (actual_amount !== undefined) {
      updates.push('actual_amount = ?')
      values.push(actual_amount)
    }
    if (completed !== undefined) {
      updates.push('completed = ?')
      values.push(completed ? 1 : 0)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No fields to update' 
      })
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    
    run(
      `UPDATE packing_items 
       SET ${updates.join(', ')} 
       WHERE id = ?`,
      values
    )
    
    const updatedItem = get(
      'SELECT * FROM packing_items WHERE id = ?',
      [id]
    )
    
    res.json({ 
      success: true, 
      message: 'Packing item updated successfully',
      data: updatedItem 
    })
  } catch (error) {
    console.error('Error updating packing item:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * DELETE /api/packing/:id
 * Soft delete a packing item
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    
    run(
      'UPDATE packing_items SET deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    )
    
    res.json({ 
      success: true, 
      message: 'Packing item deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting packing item:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

export default router
