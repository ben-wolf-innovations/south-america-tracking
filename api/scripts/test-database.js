/**
 * Test script to verify Azure Blob Storage database connection
 * 
 * Usage:
 *   node scripts/test-database.js
 * 
 * Tests:
 *   1. Download database from blob storage
 *   2. Load into sql.js
 *   3. Query data (SELECT count from locations)
 *   4. Test write operation (no actual write, just prepare)
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read from local.settings.json if environment variable not set
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  try {
    const localSettingsPath = join(__dirname, '../local.settings.json')
    const localSettings = JSON.parse(readFileSync(localSettingsPath, 'utf-8'))
    const connectionString = localSettings.Values?.AZURE_STORAGE_CONNECTION_STRING
    if (connectionString) {
      process.env.AZURE_STORAGE_CONNECTION_STRING = connectionString
      console.log('📝 Using connection string from local.settings.json\n')
    }
  } catch (error) {
    // Ignore, will fail with helpful message later
  }
}

// Import database module AFTER setting environment variable
const { initDatabase, getDatabase, all, get } = await import('../src/shared/database.js')

async function testDatabase() {
  console.log('🧪 Testing Azure Blob Storage Database Connection\n')
  
  try {
    // Test 1: Initialize database
    console.log('Test 1: Initializing database...')
    await initDatabase()
    console.log('✅ Database initialized\n')

    // Test 2: Get database instance
    console.log('Test 2: Getting database instance...')
    const db = await getDatabase()
    console.log('✅ Database instance retrieved\n')

    // Test 3: Query locations count
    console.log('Test 3: Querying locations...')
    const countResult = await get('SELECT COUNT(*) as count FROM locations')
    console.log(`✅ Found ${countResult.count} locations\n`)

    // Test 4: Query first few locations
    console.log('Test 4: Fetching sample locations...')
    const locations = await all('SELECT id, name, country, visited FROM locations ORDER BY sequence LIMIT 5')
    console.log('✅ Sample locations:')
    locations.forEach(loc => {
      const status = loc.visited ? '✓' : '○'
      console.log(`   ${status} ${loc.name}, ${loc.country} (ID: ${loc.id})`)
    })
    console.log()

    // Test 5: Query trips
    console.log('Test 5: Querying trips...')
    const trips = await all('SELECT * FROM trips')
    console.log(`✅ Found ${trips.length} trip(s)`)
    if (trips.length > 0) {
      const trip = trips[0]
      console.log(`   Trip: ${trip.name}`)
      console.log(`   Start: ${trip.start_date}`)
      console.log(`   End: ${trip.end_date}`)
    }
    console.log()

    // Test 6: Check auth table
    console.log('Test 6: Checking authentication...')
    const authCount = await get('SELECT COUNT(*) as count FROM auth')
    console.log(`✅ Found ${authCount.count} auth entries\n`)

    console.log('✨ All tests passed! Database connection is working correctly.\n')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('\nStack trace:', error.stack)
    
    if (error.message.includes('AZURE_STORAGE_CONNECTION_STRING')) {
      console.error('\n💡 Tip: Set the environment variable:')
      console.error('$env:AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."')
    } else if (error.message.includes('blob not found')) {
      console.error('\n💡 Tip: Upload the database first:')
      console.error('node scripts/upload-database.js')
    }
    
    process.exit(1)
  }
}

testDatabase()
