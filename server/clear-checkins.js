import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '..', 'database', 'trip.db')

async function clearCheckIns() {
  try {
    const SQL = await initSqlJs()
    
    // Load database
    const buffer = fs.readFileSync(DB_PATH)
    const db = new SQL.Database(buffer)
    
    // First, show current check-ins
    console.log('\n📍 Current check-ins:')
    const currentResult = db.exec('SELECT id, name, is_current FROM locations WHERE is_current = 1')
    if (currentResult.length > 0) {
      currentResult[0].values.forEach(row => {
        console.log(`  - Location ID ${row[0]}: ${row[1]} (is_current=${row[2]})`)
      })
    } else {
      console.log('  None found')
    }
    
    // Clear all is_current flags
    console.log('\n🧹 Clearing all check-ins...')
    db.exec('UPDATE locations SET is_current = 0 WHERE is_current = 1')
    
    // Save database
    const data = db.export()
    const outputBuffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, outputBuffer)
    
    console.log('✅ All check-ins cleared successfully')
    
    // Verify
    const verifyResult = db.exec('SELECT COUNT(*) as count FROM locations WHERE is_current = 1')
    const count = verifyResult[0].values[0][0]
    console.log(`\n✓ Verified: ${count} locations with is_current = 1`)
    
    db.close()
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

clearCheckIns()
