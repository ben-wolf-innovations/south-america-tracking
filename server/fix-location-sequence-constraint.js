import { initDatabase } from './config/database.js'
import Database from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fixLocationSequenceConstraint() {
  console.log('Initializing database...')
  await initDatabase()
  
  const dbPath = path.join(__dirname, '..', 'database', 'trip.db')
  const SQL = await Database()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)
  
  console.log('Recreating locations table without UNIQUE constraint on sequence...')
  
  try {
    // Get all current location data
    const locations = db.exec('SELECT * FROM locations ORDER BY id')
    
    // Drop the old table
    db.run('DROP TABLE IF EXISTS locations_old')
    db.run('ALTER TABLE locations RENAME TO locations_old')
    
    // Create new table without UNIQUE constraint on sequence
    db.run(`
      CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL,
        sequence INTEGER NOT NULL,
        name TEXT NOT NULL,
        country TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        nights INTEGER DEFAULT 0,
        arrival_date TEXT,
        departure_date TEXT,
        accommodation_name TEXT,
        accommodation_cost_planned REAL DEFAULT 0,
        accommodation_cost_actual REAL,
        accommodation_notes TEXT,
        accommodation_booking_ref TEXT,
        activities TEXT,
        activities_cost_planned REAL DEFAULT 0,
        activities_cost_actual REAL,
        food_drink_cost_planned REAL DEFAULT 0,
        food_drink_cost_actual REAL,
        travel_method TEXT,
        travel_notes TEXT,
        travel_cost_planned REAL DEFAULT 0,
        travel_cost_actual REAL,
        notes TEXT,
        is_current BOOLEAN DEFAULT 0,
        visited BOOLEAN DEFAULT 0,
        visited_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted BOOLEAN DEFAULT 0,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `)
    
    // Copy data from old table to new table
    db.run(`
      INSERT INTO locations 
      SELECT * FROM locations_old
    `)
    
    // Drop old table
    db.run('DROP TABLE locations_old')
    
    // Recreate indexes (without UNIQUE constraint)
    db.run('CREATE INDEX idx_locations_sequence ON locations(trip_id, sequence)')
    db.run('CREATE INDEX idx_locations_current ON locations(is_current)')
    
    // Recreate trigger
    db.run(`
      CREATE TRIGGER update_locations_timestamp 
      AFTER UPDATE ON locations
      BEGIN
        UPDATE locations SET updated_at = datetime('now') WHERE id = NEW.id;
      END
    `)
    
    // Save the database
    const data = db.export()
    fs.writeFileSync(dbPath, data)
    
    console.log('✅ Successfully removed UNIQUE constraint on sequence')
    console.log('✅ Locations table recreated with flexible sequence support')
    
    db.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    db.close()
    process.exit(1)
  }
}

fixLocationSequenceConstraint()
