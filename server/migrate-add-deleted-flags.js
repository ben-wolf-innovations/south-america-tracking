import { initDatabase, getDatabase, run, all, closeDatabase } from './config/database.js'

/**
 * Migration: Add deleted flags to costs and locations tables
 * Implements soft delete to maintain data integrity and accurate sums
 */
async function addDeletedFlags() {
  try {
    console.log('Starting migration: Add deleted flags...')
    
    await initDatabase()
    
    // Check if columns already exist
    const costsInfo = all("PRAGMA table_info(costs)")
    const locationsInfo = all("PRAGMA table_info(locations)")
    
    const costsHasDeleted = costsInfo.some(col => col.name === 'deleted')
    const locationsHasDeleted = locationsInfo.some(col => col.name === 'deleted')
    
    if (!costsHasDeleted) {
      console.log('1. Adding deleted column to costs table...')
      run('ALTER TABLE costs ADD COLUMN deleted BOOLEAN DEFAULT 0')
      console.log('   ✅ Added deleted column to costs')
    } else {
      console.log('1. Costs table already has deleted column')
    }
    
    if (!locationsHasDeleted) {
      console.log('2. Adding deleted column to locations table...')
      run('ALTER TABLE locations ADD COLUMN deleted BOOLEAN DEFAULT 0')
      console.log('   ✅ Added deleted column to locations')
    } else {
      console.log('2. Locations table already has deleted column')
    }
    
    console.log('✅ Migration complete!')
    
    closeDatabase()
    console.log('✅ Database saved and closed')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

addDeletedFlags()
