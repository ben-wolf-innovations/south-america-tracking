import express from 'express'
import { get, run, transaction } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /api/progress/checkin
 * Check in to a location (admin only)
 * Marks the location as current and visited, clears current status from other locations
 */
router.post('/checkin', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { location_id } = req.body

    if (!location_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Location ID is required' 
      })
    }

    // Check if location exists
    const location = get(
      'SELECT * FROM locations WHERE id = ? AND (deleted IS NULL OR deleted = 0)',
      [location_id]
    )

    if (!location) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      })
    }

    // Use transaction to ensure atomicity
    transaction((runInTransaction) => {
      // Clear is_current from all locations in the same trip
      runInTransaction(
        'UPDATE locations SET is_current = 0 WHERE trip_id = ?',
        [location.trip_id]
      )

      // Mark the specified location as current and visited
      runInTransaction(
        `UPDATE locations 
         SET is_current = 1, 
             visited = 1, 
             visited_date = ? 
         WHERE id = ?`,
        [new Date().toISOString().split('T')[0], location_id]
      )
    })

    // Get updated location
    const updatedLocation = get(
      'SELECT * FROM locations WHERE id = ?',
      [location_id]
    )

    res.json({ 
      success: true, 
      message: `Checked in to ${location.name}!`,
      data: updatedLocation 
    })
  } catch (error) {
    console.error('Error checking in:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * GET /api/progress/current
 * Get the current location
 */
router.get('/current', authenticateToken, (req, res) => {
  try {
    const tripId = req.query.trip_id || 1 // Default to trip 1
    
    const currentLocation = get(
      `SELECT * FROM locations 
       WHERE trip_id = ? 
       AND is_current = 1 
       AND (deleted IS NULL OR deleted = 0)`,
      [tripId]
    )

    if (!currentLocation) {
      return res.json({ 
        success: true, 
        data: null,
        message: 'No current location set'
      })
    }

    res.json({ 
      success: true, 
      data: currentLocation 
    })
  } catch (error) {
    console.error('Error getting current location:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * GET /api/progress/stats
 * Get progress statistics
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const tripId = req.query.trip_id || 1 // Default to trip 1
    
    const stats = get(
      `SELECT 
        COUNT(*) as total_locations,
        SUM(CASE WHEN visited = 1 THEN 1 ELSE 0 END) as visited_count,
        SUM(CASE WHEN is_current = 1 THEN 1 ELSE 0 END) as current_count
       FROM locations 
       WHERE trip_id = ? 
       AND (deleted IS NULL OR deleted = 0)`,
      [tripId]
    )

    res.json({ 
      success: true, 
      data: {
        total: stats.total_locations || 0,
        visited: stats.visited_count || 0,
        current: stats.current_count || 0,
        remaining: (stats.total_locations || 0) - (stats.visited_count || 0)
      }
    })
  } catch (error) {
    console.error('Error getting progress stats:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

export default router
