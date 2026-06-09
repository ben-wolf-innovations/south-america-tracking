import initSqlJs from 'sql.js'
import { BlobServiceClient } from '@azure/storage-blob'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING
const CONTAINER_NAME = 'database'
const BLOB_NAME = 'trip.db'

async function addMissingColumns() {
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.error('❌ AZURE_STORAGE_CONNECTION_STRING environment variable is not set')
    process.exit(1)
  }

  console.log('📥 Downloading database from Azure...')
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
  const blobClient = containerClient.getBlobClient(BLOB_NAME)

  const tempDir = os.tmpdir()
  const tempDbPath = path.join(tempDir, 'trip-migration.db')

  try {
    await blobClient.downloadToFile(tempDbPath)
    console.log('✓ Downloaded database')

    console.log('🔧 Opening database...')
    const SQL = await initSqlJs()
    const buffer = fs.readFileSync(tempDbPath)
    const db = new SQL.Database(buffer)

    // Check which columns already exist
    const tableInfo = db.exec('PRAGMA table_info(locations)')
    const existingColumns = tableInfo[0] ? tableInfo[0].values.map(row => row[1]) : []
    console.log('Existing columns:', existingColumns)

    // Add is_travel_overnight if it doesn't exist
    if (!existingColumns.includes('is_travel_overnight')) {
      console.log('Adding is_travel_overnight column...')
      db.run('ALTER TABLE locations ADD COLUMN is_travel_overnight INTEGER DEFAULT 0')
      console.log('✓ is_travel_overnight added')
    } else {
      console.log('✓ is_travel_overnight already exists')
    }

    // Add accommodation_booked if it doesn't exist
    if (!existingColumns.includes('accommodation_booked')) {
      console.log('Adding accommodation_booked column...')
      db.run('ALTER TABLE locations ADD COLUMN accommodation_booked INTEGER DEFAULT 0')
      console.log('✓ accommodation_booked added')
    } else {
      console.log('✓ accommodation_booked already exists')
    }

    // Add transport_booked if it doesn't exist
    if (!existingColumns.includes('transport_booked')) {
      console.log('Adding transport_booked column...')
      db.run('ALTER TABLE locations ADD COLUMN transport_booked INTEGER DEFAULT 0')
      console.log('✓ transport_booked added')
    } else {
      console.log('✓ transport_booked already exists')
    }

    // Check packing_items table
    const packingTableInfo = db.exec('PRAGMA table_info(packing_items)')
    const packingColumns = packingTableInfo[0] ? packingTableInfo[0].values.map(row => row[1]) : []
    console.log('Packing items columns:', packingColumns)

    // Add category to packing_items if it doesn't exist
    if (!packingColumns.includes('category')) {
      console.log('Adding category column to packing_items...')
      db.run('ALTER TABLE packing_items ADD COLUMN category TEXT')
      console.log('✓ category added')
    } else {
      console.log('✓ category already exists')
    }

    // Export the database
    const data = db.export()
    fs.writeFileSync(tempDbPath, data)
    db.close()
    console.log('✓ Database saved')

    console.log('📤 Uploading updated database to Azure...')
    const blockBlobClient = blobClient.getBlockBlobClient()
    await blockBlobClient.uploadFile(tempDbPath)
    
    const properties = await blockBlobClient.getProperties()
    console.log('✓ Uploaded to Azure')
    console.log('ETag:', properties.etag)
    console.log('Last Modified:', properties.lastModified)

    // Clean up
    fs.unlinkSync(tempDbPath)
    console.log('✓ Cleaned up temporary file')
    console.log('✅ Migration complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    // Clean up on error
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath)
    }
    process.exit(1)
  }
}

addMissingColumns()
