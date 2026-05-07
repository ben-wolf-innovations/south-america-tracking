import express from 'express'
import { get, run, transaction } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /api/progress/checkin
 * Check in to a location (admin only)
 * Marks the location as current and visited, clears current status from other locations
 * Enforces sequential check-ins based on location sequence
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

    // Prevent checking in to already visited locations
    if (location.visited === 1) {
      return res.status(400).json({
        success: false,
        error: `${location.name} (stop #${location.sequence}) has already been visited`
      })
    }

    // Check if all previous locations in sequence have been visited
    // Find the first unvisited location with a lower sequence number
    const firstUnvisitedPrevious = get(
      `SELECT * FROM locations 
       WHERE trip_id = ? 
       AND sequence < ? 
       AND visited = 0
       AND (deleted IS NULL OR deleted = 0)
       ORDER BY sequence ASC
       LIMIT 1`,
      [location.trip_id, location.sequence]
    )

    if (firstUnvisitedPrevious) {
      return res.status(400).json({
        success: false,
        error: `You must check in to ${firstUnvisitedPrevious.name} (stop #${firstUnvisitedPrevious.sequence}) before checking in here (stop #${location.sequence})`
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

/**
 * POST /api/progress/clear-visited
 * Clear all visited flags (admin only)
 */
router.post('/clear-visited', authenticateToken, requireAdmin, (req, res) => {
  try {
    const tripId = req.body.trip_id || 1
    
    run(
      `UPDATE locations 
       SET visited = 0, is_current = 0, visited_date = NULL 
       WHERE trip_id = ?`,
      [tripId]
    )

    res.json({ 
      success: true, 
      message: 'All visited flags cleared successfully' 
    })
  } catch (error) {
    console.error('Error clearing visited:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

/**
 * POST /api/progress/undo-last-visited
 * Undo the most recent check-in (admin only)
 */
router.post('/undo-last-visited', authenticateToken, requireAdmin, (req, res) => {
  try {
    const tripId = req.body.trip_id || 1
    
    // Find the most recently visited location (highest sequence number with visited = 1)
    const lastVisited = get(
      `SELECT * FROM locations 
       WHERE trip_id = ? 
       AND visited = 1 
       AND (deleted IS NULL OR deleted = 0)
       ORDER BY sequence DESC
       LIMIT 1`,
      [tripId]
    )

    if (!lastVisited) {
      return res.status(404).json({ 
        success: false, 
        error: 'No visited locations found to undo' 
      })
    }

    // Clear the visited and current flags for this location
    run(
      `UPDATE locations 
       SET visited = 0, is_current = 0, visited_date = NULL 
       WHERE id = ?`,
      [lastVisited.id]
    )

    // If there were other visited locations, mark the previous one as current
    const previousVisited = get(
      `SELECT * FROM locations 
       WHERE trip_id = ? 
       AND visited = 1 
       AND (deleted IS NULL OR deleted = 0)
       ORDER BY sequence DESC
       LIMIT 1`,
      [tripId]
    )

    if (previousVisited) {
      run(
        `UPDATE locations 
         SET is_current = 1 
         WHERE id = ?`,
        [previousVisited.id]
      )
    }

    res.json({ 
      success: true, 
      message: `Undone check-in to ${lastVisited.name} (stop #${lastVisited.sequence})` 
    })
  } catch (error) {
    console.error('Error undoing last visited:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

export default router
