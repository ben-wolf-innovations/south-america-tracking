const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

async function addPackingItemsTable() {
  console.log('Adding packing_items table...')
  
  const SQL = await initSqlJs()
  const dbPath = path.join(__dirname, 'trip.db')
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  try {
    // Create packing_items table
    db.run(`
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
    `)

    // Save changes
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
    
    console.log('✅ packing_items table created successfully')
    
    // Verify table was created
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='packing_items'")
    console.log('Verification:', tables)
    
    db.close()
  } catch (error) {
    console.error('❌ Error:', error)
    db.close()
    process.exit(1)
  }
}

addPackingItemsTable()
