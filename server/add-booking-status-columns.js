import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '..', 'database', 'trip.db')

async function addBookingStatusColumns() {
  console.log('🔄 Adding booking status columns to locations table...\n')
  
  try {
    const SQL = await initSqlJs()
    const buffer = fs.readFileSync(DB_PATH)
    const db = new SQL.Database(buffer)
    
    // Check existing columns
    const columns = db.exec("PRAGMA table_info(locations)")
    const columnNames = columns[0].values.map(col => col[1])
    
    let added = false
    
    if (!columnNames.includes('accommodation_booked')) {
      console.log('Adding accommodation_booked column...')
      db.run('ALTER TABLE locations ADD COLUMN accommodation_booked INTEGER DEFAULT 0')
      added = true
    } else {
      console.log('✅ accommodation_booked column already exists')
    }
    
    if (!columnNames.includes('transport_booked')) {
      console.log('Adding transport_booked column...')
      db.run('ALTER TABLE locations ADD COLUMN transport_booked INTEGER DEFAULT 0')
      added = true
    } else {
      console.log('✅ transport_booked column already exists')
    }
    
    if (added) {
      const data = db.export()
      const newBuffer = Buffer.from(data)
      fs.writeFileSync(DB_PATH, newBuffer)
      console.log('✅ Database saved')
    }
    
    db.close()
    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

addBookingStatusColumns()
