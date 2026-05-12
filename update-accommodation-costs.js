import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'database', 'trip.db')
const CSV_PATH = path.join(__dirname, '..', 'Downloads', 'accomodation costs.csv')

async function main() {
  // Load SQL.js
  const SQL = await initSqlJs()
  
  // Load database
  const buffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buffer)
  
  // Load CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })
  
  // Create mapping from CSV
  const costMap = {}
  records.forEach(record => {
    if (record['Location Name'] && record['Accomodation cost']) {
      costMap[record['Location Name']] = parseFloat(record['Accomodation cost'])
    }
  })
  
  console.log('CSV Data Loaded:')
  console.log('================')
  Object.entries(costMap).forEach(([name, cost]) => {
    console.log(`${name}: £${cost}`)
  })
  console.log()
  
  // Get all locations from database
  const result = db.exec('SELECT id, name FROM locations ORDER BY sequence')
  
  if (result.length === 0) {
    console.log('No locations found in database')
    db.close()
    return
  }
  
  const locations = result[0].values.map(row => ({
    id: row[0],
    name: row[1]
  }))
  
  console.log('Database Locations:')
  console.log('===================')
  
  const updates = []
  const notFound = []
  
  locations.forEach(loc => {
    const csvCost = costMap[loc.name]
    if (csvCost !== undefined) {
      console.log(`✅ ${loc.name}: ${csvCost}`)
      updates.push({ id: loc.id, cost: csvCost })
    } else {
      console.log(`❌ ${loc.name}: NOT FOUND IN CSV`)
      notFound.push(loc.name)
    }
  })
  
  console.log()
  console.log('Summary:')
  console.log('========')
  console.log(`Locations to update: ${updates.length}`)
  console.log(`Locations not found: ${notFound.length}`)
  
  if (notFound.length > 0) {
    console.log('\nLocations not found in CSV:')
    notFound.forEach(name => console.log(`  - ${name}`))
  }
  
  // Apply updates
  if (updates.length > 0) {
    console.log('\nApplying updates...')
    updates.forEach(({ id, cost }) => {
      db.run('UPDATE locations SET accommodation_cost_planned = ? WHERE id = ?', [cost, id])
    })
    
    // Save database
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
    console.log('✅ Database updated and saved')
  }
  
  db.close()
}

main().catch(console.error)
