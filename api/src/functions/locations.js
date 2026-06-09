import { app } from '@azure/functions'
import { get, all, run, transaction } from '../shared/database.js'
import { withAuth, requireAdmin } from '../shared/auth.js'

/**
 * GET /api/locations
 * Get all locations with estimated dates
 */
app.http('getLocations', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'locations',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      
      // Get trip details for start date
      const trip = await get('SELECT * FROM trips WHERE id = ?', [tripId])
      const tripStartDate = trip?.start_date ? new Date(trip.start_date) : null
      
      const locations = await all(
        `SELECT * FROM locations 
         WHERE trip_id = ?
         ORDER BY sequence ASC`,
        [tripId]
      )
      
      // Aggregate actual costs from the costs table
      for (const location of locations) {
        const costsByCategory = await all(
          `SELECT category, SUM(amount_actual) as total
           FROM costs
           WHERE location_id = ?
           GROUP BY category`,
          [location.id]
        )
        
        // Map costs to location fields
        for (const cost of costsByCategory) {
          switch (cost.category) {
            case 'accommodation':
              location.accommodation_cost_actual = cost.total || 0
              break
            case 'travel':
              location.travel_cost_actual = cost.total || 0
              break
            case 'activities':
              location.activities_cost_actual = cost.total || 0
              break
            case 'food':
              location.food_drink_cost_actual = cost.total || 0
              break
          }
        }
      }
      
      // Calculate estimated dates based on actual progress
      if (tripStartDate && locations.length > 0) {
        // Find the last visited location
        const lastVisited = locations
          .filter(loc => loc.visited === 1)
          .sort((a, b) => b.sequence - a.sequence)[0]
        
        let baseDate = null
        let startFromSequence = 1
        
        if (lastVisited) {
          if (lastVisited.departure_date) {
            baseDate = new Date(lastVisited.departure_date)
          } else if (lastVisited.arrival_date) {
            baseDate = new Date(lastVisited.arrival_date)
            baseDate.setDate(baseDate.getDate() + (lastVisited.nights || 0))
          } else {
            baseDate = new Date(tripStartDate)
          }
          startFromSequence = lastVisited.sequence + 1
        } else {
          baseDate = new Date(tripStartDate)
        }
        
        // Calculate estimated dates for all locations
        let cumulativeDays = 0
        
        locations.forEach(location => {
          if (location.sequence < startFromSequence) {
            const tempDate = new Date(tripStartDate)
            tempDate.setDate(tempDate.getDate() + cumulativeDays)
            location.estimated_arrival_date = tempDate.toISOString().split('T')[0]
            
            const tempDeparture = new Date(tempDate)
            tempDeparture.setDate(tempDeparture.getDate() + (location.nights || 0))
            location.estimated_departure_date = tempDeparture.toISOString().split('T')[0]
          } else {
            const daysSinceBase = locations
              .filter(loc => loc.sequence >= startFromSequence && loc.sequence < location.sequence)
              .reduce((sum, loc) => sum + (loc.nights || 0), 0)
            
            const estimatedArrival = new Date(baseDate)
            estimatedArrival.setDate(estimatedArrival.getDate() + daysSinceBase)
            
            const estimatedDeparture = new Date(estimatedArrival)
            estimatedDeparture.setDate(estimatedDeparture.getDate() + (location.nights || 0))
            
            location.estimated_arrival_date = estimatedArrival.toISOString().split('T')[0]
            location.estimated_departure_date = estimatedDeparture.toISOString().split('T')[0]
          }
          
          cumulativeDays += (location.nights || 0)
        })
      }
      
      return {
        status: 200,
        jsonBody: { success: true, data: locations }
      }
    } catch (error) {
      context.error('Error fetching locations:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * GET /api/locations/:id
 * Get single location
 */
app.http('getLocation', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'locations/{id}',
  handler: withAuth(async (request, context) => {
    try {
      const id = request.params.id
      const location = await get('SELECT * FROM locations WHERE id = ?', [id])
      
      if (!location) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Location not found' }
        }
      }
      
      return {
        status: 200,
        jsonBody: { success: true, data: location }
      }
    } catch (error) {
      context.error('Error fetching location:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * POST /api/locations
 * Create location (admin only)
 */
app.http('createLocation', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'locations',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const {
        trip_id = 1, name, country, latitude, longitude, nights = 1,
        arrival_date, departure_date, accommodation_name, accommodation_cost_planned,
        accommodation_cost_actual, accommodation_notes, accommodation_booking_ref, accommodation_booked = false,
        activities, activities_cost_planned, activities_cost_actual,
        food_drink_cost_planned, food_drink_cost_actual, travel_method, travel_notes,
        travel_cost_planned, travel_cost_actual, transport_booked = false, sequence, is_travel_overnight = false
      } = body

      if (!name) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Name is required' }
        }
      }

      // Country is optional for travel overnight locations
      if (!is_travel_overnight && !country) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Country is required for regular locations' }
        }
      }

      // Handle sequence insertion
      let finalSequence = sequence
      if (sequence) {
        // Shift existing locations
        await run(
          'UPDATE locations SET sequence = sequence + 1 WHERE trip_id = ? AND sequence >= ?',
          [trip_id, sequence]
        )
      } else {
        // Auto-assign next sequence
        const maxSeq = await get('SELECT MAX(sequence) as max FROM locations WHERE trip_id = ?', [trip_id])
        finalSequence = (maxSeq?.max || 0) + 1
      }

      const result = await run(
        `INSERT INTO locations (
          trip_id, sequence, name, country, latitude, longitude, nights,
          arrival_date, departure_date, accommodation_name, accommodation_cost_planned,
          accommodation_cost_actual, accommodation_notes, accommodation_booking_ref, accommodation_booked,
          activities, activities_cost_planned, activities_cost_actual,
          food_drink_cost_planned, food_drink_cost_actual, travel_method, travel_notes,
          travel_cost_planned, travel_cost_actual, transport_booked, is_travel_overnight
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trip_id, finalSequence, name, country || null, latitude || null, longitude || null, nights,
          arrival_date || null, departure_date || null, accommodation_name || null,
          accommodation_cost_planned || null, accommodation_cost_actual || null,
          accommodation_notes || null, accommodation_booking_ref || null, accommodation_booked ? 1 : 0,
          activities || null, activities_cost_planned || null,
          activities_cost_actual || null, food_drink_cost_planned || null,
          food_drink_cost_actual || null, travel_method || null, travel_notes || null,
          travel_cost_planned || null, travel_cost_actual || null, transport_booked ? 1 : 0, is_travel_overnight ? 1 : 0
        ]
      )

      const newLocation = await get('SELECT * FROM locations WHERE id = ?', [result.lastID])
      
      return {
        status: 201,
        jsonBody: { success: true, data: newLocation }
      }
    } catch (error) {
      context.error('Error creating location:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * PUT /api/locations/:id
 * Update location (admin only)
 */
app.http('updateLocation', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'locations/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()

      const existing = await get('SELECT * FROM locations WHERE id = ?', [id])
      if (!existing) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Location not found' }
        }
      }

      const allowedFields = [
        'name', 'country', 'latitude', 'longitude', 'nights', 'arrival_date', 'departure_date',
        'accommodation_name', 'accommodation_cost_planned', 'accommodation_cost_actual',
        'accommodation_notes', 'accommodation_booking_ref', 'accommodation_booked',
        'activities', 'activities_cost_planned', 'activities_cost_actual',
        'food_drink_cost_planned', 'food_drink_cost_actual', 'travel_method',
        'travel_notes', 'travel_cost_planned', 'travel_cost_actual', 'transport_booked', 'is_travel_overnight'
      ]

      const fields = []
      const values = []

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          // Convert empty strings to null
          if (value === '') {
            values.push(null)
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
      await run(`UPDATE locations SET ${fields.join(', ')} WHERE id = ?`, values)

      const updated = await get('SELECT * FROM locations WHERE id = ?', [id])
      
      return {
        status: 200,
        jsonBody: { success: true, data: updated }
      }
    } catch (error) {
      context.error('Error updating location:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * PUT /api/locations/:id/reorder
 * Reorder location by changing its sequence (admin only)
 */
app.http('reorderLocation', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'locations/{id}/reorder',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const body = await request.json()
      const newSequence = body.new_sequence
      
      if (!newSequence || typeof newSequence !== 'number') {
        return {
          status: 400,
          jsonBody: { success: false, error: 'new_sequence is required and must be a number' }
        }
      }
      
      const location = await get('SELECT * FROM locations WHERE id = ?', [id])
      if (!location) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Location not found' }
        }
      }
      
      const oldSequence = location.sequence
      
      if (oldSequence === newSequence) {
        return {
          status: 200,
          jsonBody: { success: true, message: 'Location sequence unchanged' }
        }
      }
      
      await transaction(async (runInTransaction) => {
        if (newSequence < oldSequence) {
          // Moving up: shift down locations between new and old positions
          runInTransaction(
            'UPDATE locations SET sequence = sequence + 1 WHERE trip_id = ? AND sequence >= ? AND sequence < ?',
            [location.trip_id, newSequence, oldSequence]
          )
        } else {
          // Moving down: shift up locations between old and new positions
          runInTransaction(
            'UPDATE locations SET sequence = sequence - 1 WHERE trip_id = ? AND sequence > ? AND sequence <= ?',
            [location.trip_id, oldSequence, newSequence]
          )
        }
        
        // Update the location's sequence
        runInTransaction(
          'UPDATE locations SET sequence = ? WHERE id = ?',
          [newSequence, id]
        )
      })

      return {
        status: 200,
        jsonBody: { success: true, message: 'Location reordered' }
      }
    } catch (error) {
      context.error('Error reordering location:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * DELETE /api/locations/:id
 * Delete location (admin only)
 */
app.http('deleteLocation', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'locations/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      
      const location = await get('SELECT * FROM locations WHERE id = ?', [id])
      if (!location) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Location not found' }
        }
      }

      await transaction(async (runInTransaction) => {
        // Delete the location
        runInTransaction('DELETE FROM locations WHERE id = ?', [id])
        
        // Resequence remaining locations
        runInTransaction(
          'UPDATE locations SET sequence = sequence - 1 WHERE trip_id = ? AND sequence > ?',
          [location.trip_id, location.sequence]
        )
      })

      return {
        status: 200,
        jsonBody: { success: true, message: 'Location deleted' }
      }
    } catch (error) {
      context.error('Error deleting location:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})
