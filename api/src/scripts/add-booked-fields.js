import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { BlobServiceClient } from '@azure/storage-blob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Try to load connection string from local.settings.json or environment
let CONNECTION_STRING = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING
if (!CONNECTION_STRING) {
  try {
    const settingsPath = path.join(__dirname, '../../local.settings.json')
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    CONNECTION_STRING = settings.Values?.AzureWebJobsStorage || settings.Values?.AZURE_STORAGE_CONNECTION_STRING
  } catch (err) {
    console.log('  Could not load local.settings.json')
  }
}

const CONTAINER_NAME = 'database'
const BLOB_NAME = 'trip.db'

async function updateDatabase() {
  try {
    console.log('Initializing SQL.js...')
    const SQL = await initSqlJs()
    
    // Load local database (api/src/scripts -> root/database)
    const dbPath = path.join(__dirname, '../../../database/trip.db')
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
    
    // Export and save locally
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
    console.log('✓ Database updated locally')
    
    // Upload to Azure
    if (CONNECTION_STRING) {
      console.log('\nUploading to Azure Blob Storage...')
      const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING)
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
      await containerClient.createIfNotExists()
      
      const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME)
      await blockBlobClient.uploadData(buffer)
      
      const properties = await blockBlobClient.getProperties()
      console.log('✓ Uploaded to Azure')
      console.log('  ETag:', properties.etag)
      console.log('  Last Modified:', properties.lastModified)
    } else {
      console.log('\n⚠ Azure connection string not found - skipped upload')
    }
    
    db.close()
    console.log('\n✓ Update complete!')
  } catch (error) {
    console.error('Error updating database:', error)
    process.exit(1)
  }
}

updateDatabase()
