import { initDatabase, run } from './config/database.js'

async function addPackingItemsTable() {
  console.log('Initializing database...')
  await initDatabase()
  
  console.log('Creating packing_items table...')
  
  try {
    run(`
      CREATE TABLE IF NOT EXISTS packing_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        owner TEXT NOT NULL,
        title TEXT NOT NULL,
        budget_amount DECIMAL(10,2) DEFAULT 0,
        actual_amount DECIMAL(10,2) DEFAULT 0,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY (trip_id) REFERENCES trips(id)
      )
    `, [])
    
    console.log('✅ packing_items table created successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

addPackingItemsTable()
