import express from 'express'
import { get, all, run, transaction, saveDatabase } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * Helper function to sync location costs with costs table
 * Creates or updates cost entries for accommodation and travel
 */
function syncLocationCosts(locationId, tripId, costs) {
  const { 
    accommodation_cost_planned, 
    accommodation_cost_actual,
    travel_cost_planned,
    travel_cost_actual
  } = costs

  // Sync accommodation costs
  if (accommodation_cost_planned || accommodation_cost_actual) {
    // Check if accommodation cost entry exists
    const existingAccom = get(
      `SELECT * FROM costs WHERE location_id = ? AND category = 'accommodation' LIMIT 1`,
      [locationId]
    )

    if (existingAccom) {
      // Update existing
      run(
        `UPDATE costs 
         SET amount_planned = ?, amount_actual = ? 
         WHERE id = ?`,
        [accommodation_cost_planned || 0, accommodation_cost_actual || null, existingAccom.id]
      )
    } else {
      // Create new
      run(
        `INSERT INTO costs (trip_id, location_id, category, description, amount_planned, amount_actual, currency)
         VALUES (?, ?, 'accommodation', 'Accommodation cost', ?, ?, 'GBP')`,
        [tripId, locationId, accommodation_cost_planned || 0, accommodation_cost_actual || null]
      )
    }
  }

  // Sync travel costs
  if (travel_cost_planned || travel_cost_actual) {
    // Check if travel cost entry exists
    const existingTravel = get(
      `SELECT * FROM costs WHERE location_id = ? AND category = 'travel' LIMIT 1`,
      [locationId]
    )

    if (existingTravel) {
      // Update existing
      run(
        `UPDATE costs 
         SET amount_planned = ?, amount_actual = ? 
         WHERE id = ?`,
        [travel_cost_planned || 0, travel_cost_actual || null, existingTravel.id]
      )
    } else {
      // Create new
      run(
        `INSERT INTO costs (trip_id, location_id, category, description, amount_planned, amount_actual, currency)
         VALUES (?, ?, 'travel', 'Travel cost', ?, ?, 'GBP')`,
        [tripId, locationId, travel_cost_planned || 0, travel_cost_actual || null]
      )
    }
  }
}

/**
 * GET /api/locations
 * Get all locations for a trip, ordered by sequence
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const tripId = req.query.trip_id || 1 // Default to trip 1
    const locations = all(
      `SELECT * FROM locations 
       WHERE trip_id = ? 
       ORDER BY sequence ASC`,
      [tripId]
    )
    res.json({ success: true, data: locations })
  } catch (error) {
    console.error('Error fetching locations:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/locations/:id
 * Get a single location by ID
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const location = get(
      'SELECT * FROM locations WHERE id = ?',
      [req.params.id]
    )
    
    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }
    
    res.json({ success: true, data: location })
  } catch (error) {
    console.error('Error fetching location:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/locations
 * Create a new location (admin only)
 * Automatically assigns next sequence number or inserts at specified position
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      trip_id = 1,
      name,
      country,
      latitude,
      longitude,
      nights = 1,
      arrival_date,
      departure_date,
      accommodation_name,
      accommodation_cost_planned,
      accommodation_cost_actual,
      accommodation_notes,
      accommodation_booking_ref,
      activities,
      activities_cost_planned,
      activities_cost_actual,
      food_drink_cost_planned,
      food_drink_cost_actual,
      travel_method,
      travel_notes,
      travel_cost_planned,
      travel_cost_actual,
      notes,
      sequence // Optional: if provided, insert at this position
    } = req.body

    // Validate required fields
    if (!name || !country) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and country are required' 
      })
    }

    transaction((db) => {
      let finalSequence

      if (sequence !== undefined) {
        // Insert at specific position - shift all subsequent locations
        db.run(
          'UPDATE locations SET sequence = sequence + 1 WHERE trip_id = ? AND sequence >= ?',
          [trip_id, sequence]
        )
        finalSequence = sequence
      } else {
        // Append to end
        const maxSeqResult = db.exec(
          'SELECT COALESCE(MAX(sequence), 0) as max_seq FROM locations WHERE trip_id = ?',
          [trip_id]
        )
        finalSequence = maxSeqResult.length > 0 && maxSeqResult[0].values.length > 0 
          ? maxSeqResult[0].values[0][0] + 1 
          : 1
      }

      // Insert the new location
      db.run(
        `INSERT INTO locations (
          trip_id, sequence, name, country, latitude, longitude, nights,
          arrival_date, departure_date, accommodation_name,
          accommodation_cost_planned, accommodation_cost_actual,
          accommodation_notes, accommodation_booking_ref,
          activities, activities_cost_planned, activities_cost_actual,
          food_drink_cost_planned, food_drink_cost_actual,
          travel_method, travel_notes, travel_cost_planned, travel_cost_actual, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trip_id, finalSequence, name, country, latitude, longitude, nights,
          arrival_date, departure_date, accommodation_name,
          accommodation_cost_planned, accommodation_cost_actual,
          accommodation_notes, accommodation_booking_ref,
          activities, activities_cost_planned, activities_cost_actual,
          food_drink_cost_planned, food_drink_cost_actual,
          travel_method, travel_notes, travel_cost_planned, travel_cost_actual, notes
        ]
      )

      // Get the inserted location ID
      const lastIdResult = db.exec('SELECT last_insert_rowid() as id')
      const newId = lastIdResult[0].values[0][0]

      // Sync costs to costs table
      syncLocationCosts(newId, trip_id, {
        accommodation_cost_planned,
        accommodation_cost_actual,
        travel_cost_planned,
        travel_cost_actual
      })

      // Get the inserted location
      const newLocationResult = db.exec('SELECT * FROM locations WHERE id = ?', [newId])
      const columns = newLocationResult[0].columns
      const values = newLocationResult[0].values[0]
      
      const newLocation = {}
      columns.forEach((col, idx) => {
        newLocation[col] = values[idx]
      })
      
      res.status(201).json({ success: true, data: newLocation })
    })
  } catch (error) {
    console.error('Error creating location:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/locations/:id
 * Update a location (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Check if location exists
    const existing = get('SELECT * FROM locations WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }

    // Build dynamic UPDATE query
    const allowedFields = [
      'name', 'country', 'latitude', 'longitude', 'nights',
      'arrival_date', 'departure_date', 'accommodation_name',
      'accommodation_cost_planned', 'accommodation_cost_actual',
      'accommodation_notes', 'accommodation_booking_ref',
      'activities', 'activities_cost_planned', 'activities_cost_actual',
      'food_drink_cost_planned', 'food_drink_cost_actual',
      'travel_method', 'travel_notes', 'travel_cost_planned', 'travel_cost_actual',
      'notes', 'is_current', 'visited', 'visited_date'
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

    values.push(id) // For WHERE clause

    run(
      `UPDATE locations SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    // Fetch updated location
    const updated = get('SELECT * FROM locations WHERE id = ?', [id])
    
    // Sync costs to costs table if any cost fields were updated
    if (updates.accommodation_cost_planned !== undefined || 
        updates.accommodation_cost_actual !== undefined ||
        updates.travel_cost_planned !== undefined ||
        updates.travel_cost_actual !== undefined) {
      syncLocationCosts(id, updated.trip_id, {
        accommodation_cost_planned: updated.accommodation_cost_planned,
        accommodation_cost_actual: updated.accommodation_cost_actual,
        travel_cost_planned: updated.travel_cost_planned,
        travel_cost_actual: updated.travel_cost_actual
      })
    }
    
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating location:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/locations/:id/reorder
 * Change the sequence of a location (admin only)
 * Request body: { new_sequence: number }
 */
router.put('/:id/reorder', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params
    const { new_sequence } = req.body

    if (new_sequence === undefined || new_sequence < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'new_sequence is required and must be >= 1' 
      })
    }

    const location = get('SELECT * FROM locations WHERE id = ?', [id])
    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }

    transaction((db) => {
      const oldSequence = location.sequence
      const tripId = location.trip_id

      if (oldSequence === new_sequence) {
        // No change needed
        return res.json({ success: true, data: location })
      }

      if (new_sequence > oldSequence) {
        // Moving down: shift items between old and new position up
        db.run(
          `UPDATE locations 
           SET sequence = sequence - 1 
           WHERE trip_id = ? AND sequence > ? AND sequence <= ?`,
          [tripId, oldSequence, new_sequence]
        )
      } else {
        // Moving up: shift items between new and old position down
        db.run(
          `UPDATE locations 
           SET sequence = sequence + 1 
           WHERE trip_id = ? AND sequence >= ? AND sequence < ?`,
          [tripId, new_sequence, oldSequence]
        )
      }

      // Update the target location
      db.run(
        'UPDATE locations SET sequence = ? WHERE id = ?',
        [new_sequence, id]
      )

      // Fetch updated location
      const updatedResult = db.exec('SELECT * FROM locations WHERE id = ?', [id])
      const columns = updatedResult[0].columns
      const values = updatedResult[0].values[0]
      
      const updated = {}
      columns.forEach((col, idx) => {
        updated[col] = values[idx]
      })
      
      res.json({ success: true, data: updated })
    })
  } catch (error) {
    console.error('Error reordering location:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/locations/:id
 * Delete a location and resequence remaining locations (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params

    const location = get('SELECT * FROM locations WHERE id = ?', [id])
    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }

    transaction((db) => {
      // Delete the location
      db.run('DELETE FROM locations WHERE id = ?', [id])

      // Resequence remaining locations
      db.run(
        `UPDATE locations 
         SET sequence = sequence - 1 
         WHERE trip_id = ? AND sequence > ?`,
        [location.trip_id, location.sequence]
      )

      res.json({ 
        success: true, 
        message: 'Location deleted successfully',
        deleted_id: id 
      })
    })
  } catch (error) {
    console.error('Error deleting location:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
