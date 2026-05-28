/**
 * One-time script to upload existing SQLite database to Azure Blob Storage
 * 
 * Usage:
 *   node scripts/upload-database.js
 * 
 * Prerequisites:
 *   1. Set AZURE_STORAGE_CONNECTION_STRING environment variable
 *   2. Ensure database/trip.db exists in the parent directory
 */

import { BlobServiceClient } from '@azure/storage-blob'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read from local.settings.json if environment variable not set
let STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING

if (!STORAGE_CONNECTION_STRING) {
  try {
    const localSettingsPath = join(__dirname, '../local.settings.json')
    const localSettings = JSON.parse(readFileSync(localSettingsPath, 'utf-8'))
    STORAGE_CONNECTION_STRING = localSettings.Values?.AZURE_STORAGE_CONNECTION_STRING
    if (STORAGE_CONNECTION_STRING) {
      console.log('📝 Using connection string from local.settings.json\n')
    }
  } catch (error) {
    // Ignore, will fail with helpful message below
  }
}

const CONTAINER_NAME = 'database'
const BLOB_NAME = 'trip.db'
const DB_PATH = join(__dirname, '../../database/trip.db')

async function uploadDatabase() {
  try {
    // Validate connection string
    if (!STORAGE_CONNECTION_STRING) {
      console.error('❌ Error: AZURE_STORAGE_CONNECTION_STRING environment variable not set')
      console.log('\nSet it using:')
      console.log('$env:AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."')
      process.exit(1)
    }

    console.log('📦 Reading database file from:', DB_PATH)
    const dbBuffer = readFileSync(DB_PATH)
    console.log(`✅ Database file read (${dbBuffer.length} bytes)`)

    console.log('\n🔗 Connecting to Azure Blob Storage...')
    const blobServiceClient = BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING)
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)

    // Create container if it doesn't exist
    console.log(`📁 Ensuring container '${CONTAINER_NAME}' exists...`)
    await containerClient.createIfNotExists()
    console.log('✅ Container ready')

    // Upload blob
    const blobClient = containerClient.getBlockBlobClient(BLOB_NAME)
    console.log(`\n📤 Uploading database as '${BLOB_NAME}'...`)
    
    await blobClient.upload(dbBuffer, dbBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/x-sqlite3'
      }
    })

    console.log('✅ Database uploaded successfully!')
    
    // Get blob URL
    const blobUrl = blobClient.url
    console.log(`\n🔗 Blob URL: ${blobUrl}`)
    
    // Get blob properties
    const properties = await blobClient.getProperties()
    console.log(`📊 Size: ${properties.contentLength} bytes`)
    console.log(`📅 Last Modified: ${properties.lastModified}`)
    
    console.log('\n✨ Setup complete! Your Azure Functions can now access the database.')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    
    if (error.code === 'ENOENT') {
      console.error(`\nDatabase file not found at: ${DB_PATH}`)
      console.error('Make sure the database exists in the database/ folder')
    }
    
    process.exit(1)
  }
}

uploadDatabase()
