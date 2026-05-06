import express from 'express'
import { get, run } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/progress
 * Get progress information for a trip
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const { trip_id = 1 } = req.query

    const progress = get('SELECT * FROM progress WHERE trip_id = ?', [trip_id])
    
    if (!progress) {
      return res.status(404).json({ 
        success: false, 
        error: 'Progress tracking not found for this trip' 
      })
    }

    // Get current location details if set
    let currentLocation = null
    if (progress.current_location_id) {
      currentLocation = get(
        'SELECT * FROM locations WHERE id = ?',
        [progress.current_location_id]
      )
    }

    res.json({ 
      success: true, 
      data: {
        ...progress,
        current_location: currentLocation
      }
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/progress
 * Update progress information (admin only)
 */
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { trip_id = 1 } = req.query
    const updates = req.body

    // Check if progress exists
    const existing = get('SELECT * FROM progress WHERE trip_id = ?', [trip_id])
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        error: 'Progress tracking not found for this trip' 
      })
    }

    // Build dynamic UPDATE query
    const allowedFields = [
      'current_location_id', 'current_day', 'total_days',
      'locations_visited', 'total_locations',
      'total_spent', 'total_planned', 'notes'
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

    // Always update last_updated timestamp
    fields.push('last_updated = ?')
    values.push(new Date().toISOString())

    values.push(trip_id)

    run(`UPDATE progress SET ${fields.join(', ')} WHERE trip_id = ?`, values)

    // If current_location_id changed, update is_current flags on locations
    if (updates.current_location_id !== undefined) {
      // Clear all is_current flags
      run('UPDATE locations SET is_current = 0 WHERE trip_id = ?', [trip_id])
      
      // Set new current location
      if (updates.current_location_id) {
        run(
          'UPDATE locations SET is_current = 1 WHERE id = ?',
          [updates.current_location_id]
        )
      }
    }

    const updated = get('SELECT * FROM progress WHERE trip_id = ?', [trip_id])
    
    // Get current location details
    let currentLocation = null
    if (updated.current_location_id) {
      currentLocation = get(
        'SELECT * FROM locations WHERE id = ?',
        [updated.current_location_id]
      )
    }

    res.json({ 
      success: true, 
      data: {
        ...updated,
        current_location: currentLocation
      }
    })
  } catch (error) {
    console.error('Error updating progress:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/progress/recalculate
 * Recalculate progress statistics from locations and costs (admin only)
 */
router.post('/recalculate', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { trip_id = 1 } = req.query

    // Get total days from locations
    const daysResult = get(
      'SELECT COALESCE(SUM(nights), 0) as total FROM locations WHERE trip_id = ?',
      [trip_id]
    )
    const totalDays = daysResult.total

    // Get total locations
    const locationsResult = get(
      'SELECT COUNT(*) as total FROM locations WHERE trip_id = ?',
      [trip_id]
    )
    const totalLocations = locationsResult.total

    // Get locations visited
    const visitedResult = get(
      'SELECT COUNT(*) as total FROM locations WHERE trip_id = ? AND visited = 1',
      [trip_id]
    )
    const locationsVisited = visitedResult.total

    // Calculate total planned costs from locations
    const locationCostsPlanned = get(
      `SELECT 
        COALESCE(SUM(
          COALESCE(accommodation_cost_planned, 0) * nights +
          COALESCE(activities_cost_planned, 0) +
          COALESCE(food_drink_cost_planned, 0) * nights +
          COALESCE(travel_cost_planned, 0)
        ), 0) as total
       FROM locations WHERE trip_id = ?`,
      [trip_id]
    )

    // Calculate total actual costs from locations
    const locationCostsActual = get(
      `SELECT 
        COALESCE(SUM(
          COALESCE(accommodation_cost_actual, 0) * nights +
          COALESCE(activities_cost_actual, 0) +
          COALESCE(food_drink_cost_actual, 0) * nights +
          COALESCE(travel_cost_actual, 0)
        ), 0) as total
       FROM locations WHERE trip_id = ?`,
      [trip_id]
    )

    // Add costs from costs table
    const costTablePlanned = get(
      'SELECT COALESCE(SUM(amount_planned), 0) as total FROM costs WHERE trip_id = ?',
      [trip_id]
    )
    const costTableActual = get(
      'SELECT COALESCE(SUM(amount_actual), 0) as total FROM costs WHERE trip_id = ?',
      [trip_id]
    )

    const totalPlanned = locationCostsPlanned.total + costTablePlanned.total
    const totalSpent = locationCostsActual.total + costTableActual.total

    // Update progress
    run(
      `UPDATE progress 
       SET total_days = ?, 
           total_locations = ?,
           locations_visited = ?,
           total_planned = ?,
           total_spent = ?,
           last_updated = ?
       WHERE trip_id = ?`,
      [
        totalDays, 
        totalLocations, 
        locationsVisited, 
        totalPlanned, 
        totalSpent,
        new Date().toISOString(),
        trip_id
      ]
    )

    const updated = get('SELECT * FROM progress WHERE trip_id = ?', [trip_id])
    
    // Get current location details
    let currentLocation = null
    if (updated.current_location_id) {
      currentLocation = get(
        'SELECT * FROM locations WHERE id = ?',
        [updated.current_location_id]
      )
    }

    res.json({ 
      success: true, 
      message: 'Progress recalculated successfully',
      data: {
        ...updated,
        current_location: currentLocation
      }
    })
  } catch (error) {
    console.error('Error recalculating progress:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
