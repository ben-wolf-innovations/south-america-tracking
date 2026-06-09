import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function updateDatabase() {
  try {
    console.log('Initializing SQL.js...')
    const SQL = await initSqlJs()
    
    const dbPath = path.join(__dirname, 'trip.db')
    const fileBuffer = fs.readFileSync(dbPath)
    const db = new SQL.Database(fileBuffer)
    
    console.log('Adding accommodation_booked field...')
    try {
      db.run('ALTER TABLE locations ADD COLUMN accommodation_booked INTEGER DEFAULT 0')
      console.log('✓ Added accommodation_booked')
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('  accommodation_booked already exists')
      } else {
        throw err
      }
    }
    
    console.log('Adding transport_booked field...')
    try {
      db.run('ALTER TABLE locations ADD COLUMN transport_booked INTEGER DEFAULT 0')
      console.log('✓ Added transport_booked')
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('  transport_booked already exists')
      } else {
        throw err
      }
    }
    
    // Export the database
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
    
    console.log('✓ Database updated successfully')
    
    db.close()
  } catch (error) {
    console.error('Error updating database:', error)
    process.exit(1)
  }
}

updateDatabase()
