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

    // Get trip details to calculate current_day from start_date
    const trip = get('SELECT * FROM trips WHERE id = ?', [trip_id])
    
    // Calculate current_day based on trip start_date
    let current_day = 0
    if (trip && trip.start_date) {
      const startDate = new Date(trip.start_date)
      const today = new Date()
      const diffTime = today - startDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      current_day = diffDays > 0 ? diffDays : 0
    }

    // Get current location details if set
    let currentLocation = null
    if (progress.current_location_id) {
      currentLocation = get(
        'SELECT * FROM locations WHERE id = ? AND (deleted IS NULL OR deleted = 0)',
        [progress.current_location_id]
      )
    }

    res.json({ 
      success: true, 
      data: {
        ...progress,
        current_day, // Override with calculated value
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
 * POST /api/progress/checkin
 * Check in to a location (admin only)
 */
router.post('/checkin', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { location_id, trip_id = 1 } = req.body

    if (!location_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'location_id is required' 
      })
    }

    // Verify location exists
    const location = get('SELECT * FROM locations WHERE id = ? AND trip_id = ? AND (deleted IS NULL OR deleted = 0)', [location_id, trip_id])
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      })
    }

    // Clear all is_current flags
    run('UPDATE locations SET is_current = 0 WHERE trip_id = ?', [trip_id])
    
    // Set new current location
    run('UPDATE locations SET is_current = 1 WHERE id = ?', [location_id])
    
    // Update progress table
    run(
      'UPDATE progress SET current_location_id = ?, last_updated = ? WHERE trip_id = ?',
      [location_id, new Date().toISOString(), trip_id]
    )

    // Get updated location
    const updatedLocation = get('SELECT * FROM locations WHERE id = ?', [location_id])

    res.json({ 
      success: true, 
      message: `Checked in to ${updatedLocation.name}`,
      data: updatedLocation
    })
  } catch (error) {
    console.error('Error checking in:', error)
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

    // Get total days from locations (non-deleted only)
    const daysResult = get(
      'SELECT COALESCE(SUM(nights), 0) as total FROM locations WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)',
      [trip_id]
    )
    const totalDays = daysResult.total

    // Get total locations (non-deleted only)
    const locationsResult = get(
      'SELECT COUNT(*) as total FROM locations WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)',
      [trip_id]
    )
    const totalLocations = locationsResult.total

    // Get locations visited (non-deleted only) - visited = departure date is in the past
    const visitedResult = get(
      `SELECT COUNT(*) as total FROM locations 
       WHERE trip_id = ? 
       AND departure_date IS NOT NULL 
       AND date(departure_date) < date('now') 
       AND (deleted IS NULL OR deleted = 0)`,
      [trip_id]
    )
    const locationsVisited = visitedResult.total

    // Calculate total planned costs from locations (non-deleted only)
    const locationCostsPlanned = get(
      `SELECT 
        COALESCE(SUM(
          COALESCE(accommodation_cost_planned, 0) * nights +
          COALESCE(activities_cost_planned, 0) +
          COALESCE(food_drink_cost_planned, 0) * nights +
          COALESCE(travel_cost_planned, 0)
        ), 0) as total
       FROM locations WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)`,
      [trip_id]
    )

    // Calculate total actual costs from locations (non-deleted only)
    const locationCostsActual = get(
      `SELECT 
        COALESCE(SUM(
          COALESCE(accommodation_cost_actual, 0) * nights +
          COALESCE(activities_cost_actual, 0) +
          COALESCE(food_drink_cost_actual, 0) * nights +
          COALESCE(travel_cost_actual, 0)
        ), 0) as total
       FROM locations WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)`,
      [trip_id]
    )

    // Add actual costs from costs table (non-deleted only, including "other" category)
    const costTableActual = get(
      'SELECT COALESCE(SUM(amount_actual), 0) as total FROM costs WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)',
      [trip_id]
    )

    const totalPlanned = locationCostsPlanned.total
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
