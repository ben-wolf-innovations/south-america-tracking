import initSqlJs from 'sql.js'
import { BlobServiceClient } from '@azure/storage-blob'

let SQL = null
let db = null
let isInitialized = false
let initPromise = null

// Azure Blob Storage configuration
const STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING
const CONTAINER_NAME = 'database'
const BLOB_NAME = 'trip.db'

// Cache for preventing multiple simultaneous initializations
let lastSaveTime = 0
const SAVE_DEBOUNCE_MS = 1000 // Don't save more than once per second

/**
 * Get blob client for database file
 */
function getBlobClient() {
  if (!STORAGE_CONNECTION_STRING) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable not set')
  }
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING)
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
  const blobClient = containerClient.getBlockBlobClient(BLOB_NAME) // Use BlockBlobClient for upload
  
  return { containerClient, blobClient }
}

/**
 * Download database from Azure Blob Storage
 */
async function downloadDatabase() {
  try {
    const { blobClient } = getBlobClient()
    
    // Check if blob exists
    const exists = await blobClient.exists()
    
    if (exists) {
      console.log('📥 Downloading database from Azure Blob Storage...')
      const downloadResponse = await blobClient.download()
      const buffer = await streamToBuffer(downloadResponse.readableStreamBody)
      console.log(`✅ Database downloaded (${buffer.length} bytes)`)
      return new Uint8Array(buffer)
    } else {
      console.log('ℹ️ Database blob not found, creating new database')
      return null
    }
  } catch (error) {
    console.error('❌ Error downloading database:', error.message)
    // Return null to create new database
    return null
  }
}

/**
 * Upload database to Azure Blob Storage
 */
async function uploadDatabase() {
  if (!db) {
    console.warn('⚠️ No database to upload')
    return
  }
  
  // Debounce saves
  const now = Date.now()
  if (now - lastSaveTime < SAVE_DEBOUNCE_MS) {
    console.log('⏭️ Skipping save (debounced)')
    return
  }
  
  try {
    const { containerClient, blobClient } = getBlobClient()
    
    console.log('📦 Checking container...')
    // Ensure container exists
    await containerClient.createIfNotExists()
    
    // Export database to buffer
    const data = db.export()
    const buffer = Buffer.from(data)
    
    console.log(`📤 Uploading database to Azure Blob Storage (${buffer.length} bytes)...`)
    console.log(`   Container: ${CONTAINER_NAME}, Blob: ${BLOB_NAME}`)
    
    const uploadResult = await blobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/x-sqlite3'
      }
    })
    
    lastSaveTime = now
    console.log('✅ Database uploaded successfully')
    console.log('   ETag:', uploadResult.etag)
    console.log('   Last Modified:', uploadResult.lastModified)
    return uploadResult
  } catch (error) {
    console.error('❌ CRITICAL ERROR uploading database:', error)
    console.error('   Error name:', error.name)
    console.error('   Error message:', error.message)
    console.error('   Error stack:', error.stack)
    // Don't throw - we don't want to crash the API, but log prominently
  }
}

/**
 * Helper to convert stream to buffer
 */
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data))
    })
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    readableStream.on('error', reject)
  })
}

/**
 * Initialize SQL.js and load database from Azure Blob Storage
 */
export async function initDatabase() {
  // If already initialized, return immediately
  if (isInitialized && db) {
    return db
  }
  
  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise
  }
  
  // Start initialization
  initPromise = (async () => {
    try {
      console.log('🔄 Initializing database...')
      
      // Initialize SQL.js
      if (!SQL) {
        SQL = await initSqlJs()
        console.log('✅ SQL.js initialized')
      }
      
      // Download database from blob storage
      const dbData = await downloadDatabase()
      
      if (dbData) {
        // Load existing database
        db = new SQL.Database(dbData)
        console.log('✅ Database loaded from Azure Blob Storage')
      } else {
        // Create new empty database
        db = new SQL.Database()
        console.log('✅ New database created')
        
        // Upload the new empty database
        await uploadDatabase()
      }
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON')
      
      isInitialized = true
      return db
    } catch (error) {
      console.error('❌ Database initialization error:', error)
      initPromise = null
      throw error
    }
  })()
  
  return initPromise
}

/**
 * Get the database instance (lazy initialization)
 */
export async function getDatabase() {
  if (!db) {
    await initDatabase()
  }
  return db
}

/**
 * Save the database to Azure Blob Storage
 */
export async function saveDatabase() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  
  await uploadDatabase()
}

/**
 * Execute a SQL statement (for INSERT, UPDATE, DELETE)
 * Automatically saves to blob storage after write operations
 */
export async function run(sql, params = []) {
  const database = await getDatabase()
  
  try {
    const stmt = database.prepare(sql)
    stmt.bind(params)
    stmt.step()
    const changes = database.getRowsModified()
    const lastID = database.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0]
    stmt.free()
    
    // Auto-save after writes - fire and forget but with better logging
    console.log('💾 Triggering database upload after write operation...')
    uploadDatabase().then(result => {
      if (result) {
        console.log('✅ Upload completed successfully')
      } else {
        console.warn('⚠️ Upload skipped or failed')
      }
    }).catch(err => {
      console.error('❌ CRITICAL: Background save failed:', err)
    })
    
    return { changes, lastID }
  } catch (error) {
    console.error('❌ Database run error:', error)
    console.error('SQL:', sql)
    console.error('Params:', params)
    throw error
  }
}

/**
 * Execute a query that returns a single row
 */
export async function get(sql, params = []) {
  const database = await getDatabase()
  
  try {
    const stmt = database.prepare(sql)
    stmt.bind(params)
    
    if (stmt.step()) {
      const columns = stmt.getColumnNames()
      const values = stmt.get()
      const row = {}
      
      columns.forEach((col, i) => {
        row[col] = values[i]
      })
      
      stmt.free()
      return row
    }
    
    stmt.free()
    return null
  } catch (error) {
    console.error('❌ Database get error:', error)
    console.error('SQL:', sql)
    console.error('Params:', params)
    throw error
  }
}

/**
 * Execute a query that returns multiple rows
 */
export async function all(sql, params = []) {
  const database = await getDatabase()
  
  try {
    const stmt = database.prepare(sql)
    stmt.bind(params)
    
    const rows = []
    const columns = stmt.getColumnNames()
    
    while (stmt.step()) {
      const values = stmt.get()
      const row = {}
      
      columns.forEach((col, i) => {
        row[col] = values[i]
      })
      
      rows.push(row)
    }
    
    stmt.free()
    return rows
  } catch (error) {
    console.error('❌ Database all error:', error)
    console.error('SQL:', sql)
    console.error('Params:', params)
    throw error
  }
}

/**
 * Execute multiple SQL statements in a transaction
 * The callback receives a function to run statements within the transaction
 */
export async function transaction(callback) {
  const database = await getDatabase()
  
  try {
    database.run('BEGIN TRANSACTION')
    
    // Helper function for running statements in transaction
    const runInTransaction = (sql, params = []) => {
      const stmt = database.prepare(sql)
      stmt.bind(params)
      stmt.step()
      const changes = database.getRowsModified()
      const lastID = database.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0]
      stmt.free()
      return { changes, lastID }
    }
    
    // Execute the callback with the helper
    callback(runInTransaction)
    
    database.run('COMMIT')
    
    // Auto-save after transaction
    uploadDatabase().catch(err => console.error('Background save failed:', err))
  } catch (error) {
    console.error('❌ Transaction error:', error)
    try {
      database.run('ROLLBACK')
    } catch (rollbackError) {
      console.error('❌ Rollback error:', rollbackError)
    }
    throw error
  }
}

/**
 * Close the database connection and save final state
 */
export async function closeDatabase() {
  if (db) {
    await saveDatabase()
    db.close()
    db = null
    isInitialized = false
    initPromise = null
    console.log('✅ Database closed and saved')
  }
}
