import { initDatabase, getDatabase, run, all, closeDatabase } from './config/database.js'

/**
 * Migration: Remove amount_planned from costs table
 * This migration removes the redundant amount_planned field since budgets are now tracked in the locations table
 */
async function migrateCosts() {
  try {
    console.log('Starting migration: Remove amount_planned from costs table...')
    
    await initDatabase()
    
    // 1. Get existing data
    console.log('1. Backing up existing costs...')
    const existingCosts = all('SELECT * FROM costs')
    console.log(`   Found ${existingCosts.length} costs to migrate`)
    
    // 2. Drop the old table
    console.log('2. Dropping old costs table...')
    run('DROP TABLE IF EXISTS costs')
    
    // 3. Create new table structure
    console.log('3. Creating new costs table...')
    run(`
      CREATE TABLE costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        location_id INTEGER,
        category TEXT NOT NULL,
        description TEXT,
        amount_actual REAL,
        currency TEXT DEFAULT 'GBP',
        date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
      )
    `)
    
    // 4. Recreate indexes
    console.log('4. Recreating indexes...')
    run('CREATE INDEX idx_costs_location ON costs(location_id)')
    run('CREATE INDEX idx_costs_category ON costs(category)')
    
    // 5. Migrate data (excluding amount_planned)
    console.log('5. Migrating data...')
    for (const cost of existingCosts) {
      run(
        `INSERT INTO costs (
          id, trip_id, location_id, category, description,
          amount_actual, currency, date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cost.id,
          cost.trip_id,
          cost.location_id,
          cost.category,
          cost.description,
          cost.amount_actual,
          cost.currency,
          cost.date,
          cost.notes,
          cost.created_at
        ]
      )
    }
    
    console.log(`✅ Migration complete! Migrated ${existingCosts.length} costs`)
    
    closeDatabase()
    console.log('✅ Database saved and closed')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateCosts()
