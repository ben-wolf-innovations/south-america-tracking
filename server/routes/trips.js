import express from 'express'
import { get, run } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/trips/:id
 * Get trip details
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    
    const trip = get('SELECT * FROM trips WHERE id = ?', [id])
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        error: 'Trip not found' 
      })
    }

    res.json({ success: true, data: trip })
  } catch (error) {
    console.error('Error fetching trip:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/trips/:id
 * Update trip details (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Check if trip exists
    const existing = get('SELECT * FROM trips WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trip not found' })
    }

    // Build dynamic UPDATE query
    const allowedFields = [
      'name', 'description', 'start_date', 'end_date', 'status'
    ]

    const fields = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' })
    }

    // Add updated_at timestamp
    fields.push('updated_at = datetime("now")')
    values.push(id) // For WHERE clause

    run(
      `UPDATE trips SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    // Fetch updated trip
    const updated = get('SELECT * FROM trips WHERE id = ?', [id])
    
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating trip:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
