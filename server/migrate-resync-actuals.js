import { initDatabase, getDatabase, run, all, get, closeDatabase } from './config/database.js'

/**
 * Migration: Resync all actual costs from costs table to locations table
 * Clears old leftover actual values and recalculates from costs table
 */
async function resyncActuals() {
  try {
    console.log('Starting migration: Resync actual costs from costs to locations...')
    
    await initDatabase()
    
    // 1. Clear all actual cost fields in locations
    console.log('1. Clearing old actual costs in locations...')
    run(`UPDATE locations 
         SET accommodation_cost_actual = NULL,
             travel_cost_actual = NULL,
             activities_cost_actual = NULL,
             food_drink_cost_actual = NULL`)
    console.log('   ✅ Cleared all actual costs')
    
    // 2. Get all non-deleted costs grouped by location and category
    console.log('2. Recalculating actual costs from costs table...')
    const costs = all(`
      SELECT location_id, category, SUM(amount_actual) as total
      FROM costs
      WHERE (deleted IS NULL OR deleted = 0) AND location_id IS NOT NULL
      GROUP BY location_id, category
    `)
    
    console.log(`   Found ${costs.length} cost groups to sync`)
    
    // 3. Map categories to location fields
    const categoryFieldMap = {
      'accommodation': 'accommodation_cost_actual',
      'travel': 'travel_cost_actual',
      'activities': 'activities_cost_actual',
      'food': 'food_drink_cost_actual'
    }
    
    // 4. Update each location's actual cost fields
    for (const cost of costs) {
      const fieldName = categoryFieldMap[cost.category]
      if (fieldName) {
        run(
          `UPDATE locations SET ${fieldName} = ? WHERE id = ?`,
          [cost.total, cost.location_id]
        )
        console.log(`   Updated location ${cost.location_id} ${cost.category}: £${cost.total}`)
      }
    }
    
    console.log('✅ Migration complete! All actual costs resynced')
    
    closeDatabase()
    console.log('✅ Database saved and closed')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

resyncActuals()
