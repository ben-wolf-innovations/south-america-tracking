import express from 'express'
import { get, all, run, transaction, saveDatabase } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/locations
 * Get all locations for a trip, ordered by sequence
 * Includes estimated arrival/departure dates based on trip start date and cumulative nights
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const tripId = req.query.trip_id || 1 // Default to trip 1
    
    // Get trip details for start date
    const trip = get('SELECT * FROM trips WHERE id = ?', [tripId])
    const startDate = trip?.start_date ? new Date(trip.start_date) : null
    
    const locations = all(
      `SELECT * FROM locations 
       WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)
       ORDER BY sequence ASC`,
      [tripId]
    )
    
    // Calculate estimated dates based on cumulative nights
    if (startDate) {
      let cumulativeDays = 0
      
      locations.forEach(location => {
        // Calculate estimated arrival date (start date + cumulative days)
        const estimatedArrival = new Date(startDate)
        estimatedArrival.setDate(estimatedArrival.getDate() + cumulativeDays)
        
        // Calculate estimated departure date (arrival + nights)
        const estimatedDeparture = new Date(estimatedArrival)
        estimatedDeparture.setDate(estimatedDeparture.getDate() + (location.nights || 0))
        
        // Add estimated dates to location object
        location.estimated_arrival_date = estimatedArrival.toISOString().split('T')[0]
        location.estimated_departure_date = estimatedDeparture.toISOString().split('T')[0]
        
        // Add cumulative days to next location
        cumulativeDays += (location.nights || 0)
      })
    }
    
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
      'SELECT * FROM locations WHERE id = ? AND (deleted IS NULL OR deleted = 0)',
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

    // Determine sequence before transaction
    let finalSequence
    if (sequence !== undefined && sequence > 0) {
      finalSequence = sequence
    } else {
      // Append to end
      const maxSeqResult = get(
        'SELECT COALESCE(MAX(sequence), 0) as max_seq FROM locations WHERE trip_id = ? AND (deleted IS NULL OR deleted = 0)',
        [trip_id]
      )
      finalSequence = (maxSeqResult?.max_seq || 0) + 1
    }

    let newLocationId

    // Use transaction to ensure atomicity
    transaction((runInTransaction) => {
      if (sequence !== undefined && sequence > 0) {
        // Insert at specific position - shift all subsequent locations
        runInTransaction(
          'UPDATE locations SET sequence = sequence + 1 WHERE trip_id = ? AND sequence >= ? AND (deleted IS NULL OR deleted = 0)',
          [trip_id, sequence]
        )
      }

      // Insert the new location
      // Convert undefined to null for sql.js compatibility
      const result = runInTransaction(
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
          trip_id, finalSequence, name, country, 
          latitude ?? null, longitude ?? null, nights,
          arrival_date ?? null, departure_date ?? null, accommodation_name ?? null,
          accommodation_cost_planned ?? null, accommodation_cost_actual ?? null,
          accommodation_notes ?? null, accommodation_booking_ref ?? null,
          activities ?? null, activities_cost_planned ?? null, activities_cost_actual ?? null,
          food_drink_cost_planned ?? null, food_drink_cost_actual ?? null,
          travel_method ?? null, travel_notes ?? null, 
          travel_cost_planned ?? null, travel_cost_actual ?? null, notes ?? null
        ]
      )

      newLocationId = result.lastID
    })

    // Get the inserted location (outside transaction)
    const newLocation = get('SELECT * FROM locations WHERE id = ?', [newLocationId])
    
    res.status(201).json({ success: true, data: newLocation })
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
    const existing = get('SELECT * FROM locations WHERE id = ? AND (deleted IS NULL OR deleted = 0)', [id])
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
        // Round monetary cost fields to 2 decimal places to avoid floating point precision issues
        const costFields = ['accommodation_cost_planned', 'accommodation_cost_actual', 'activities_cost_planned', 'activities_cost_actual', 'food_drink_cost_planned', 'food_drink_cost_actual', 'travel_cost_planned', 'travel_cost_actual']
        if (costFields.includes(key) && value != null && value !== '') {
          values.push(Math.round(parseFloat(value) * 100) / 100)
        } else {
          values.push(value)
        }
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

    const location = get('SELECT * FROM locations WHERE id = ? AND (deleted IS NULL OR deleted = 0)', [id])
    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }

    const oldSequence = location.sequence
    const tripId = location.trip_id

    if (oldSequence === new_sequence) {
      // No change needed
      return res.json({ success: true, data: location })
    }

    // Use transaction to ensure atomic sequence updates
    transaction((runInTransaction) => {
      // Step 1: Move target to temporary negative sequence
      runInTransaction('UPDATE locations SET sequence = ? WHERE id = ?', [-1, id])

      if (new_sequence > oldSequence) {
        // Moving down: shift items between old and new position up
        runInTransaction(
          `UPDATE locations 
           SET sequence = sequence - 1 
           WHERE trip_id = ? AND sequence > ? AND sequence <= ? AND id != ? AND (deleted IS NULL OR deleted = 0)`,
          [tripId, oldSequence, new_sequence, id]
        )
      } else {
        // Moving up: shift items between new and old position down
        runInTransaction(
          `UPDATE locations 
           SET sequence = sequence + 1 
           WHERE trip_id = ? AND sequence >= ? AND sequence < ? AND id != ? AND (deleted IS NULL OR deleted = 0)`,
          [tripId, new_sequence, oldSequence, id]
        )
      }

      // Step 3: Move target to final position
      runInTransaction('UPDATE locations SET sequence = ? WHERE id = ?', [new_sequence, id])
    })

    // Fetch updated location (outside transaction)
    const updated = get('SELECT * FROM locations WHERE id = ?', [id])
    
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error reordering location:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/locations/:id
 * Soft delete a location (admin only)
 * Automatically adjusts sequences of remaining locations
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params

    const location = get('SELECT * FROM locations WHERE id = ? AND (deleted IS NULL OR deleted = 0)', [id])
    if (!location) {
      return res.status(404).json({ success: false, error: 'Location not found' })
    }

    const deletedSequence = location.sequence
    const tripId = location.trip_id

    // Use transaction to delete and adjust sequences atomically
    transaction((runInTransaction) => {
      // Soft delete: set deleted flag to 1
      runInTransaction('UPDATE locations SET deleted = 1 WHERE id = ?', [id])

      // Shift down all locations with sequence > deleted location's sequence
      runInTransaction(
        'UPDATE locations SET sequence = sequence - 1 WHERE trip_id = ? AND sequence > ? AND (deleted IS NULL OR deleted = 0)',
        [tripId, deletedSequence]
      )
    })

    res.json({ 
      success: true, 
      message: 'Location deleted successfully',
      deleted_id: id 
    })
  } catch (error) {
    console.error('Error deleting location:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
