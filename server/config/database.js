import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let SQL = null
let db = null
const DB_PATH = path.join(__dirname, '..', '..', 'database', 'trip.db')

/**
 * Initialize SQL.js and load or create the database
 */
export async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs()
  }

  try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Try to load existing database
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
      console.log('✅ Database loaded from:', DB_PATH)
    } else {
      // Create new empty database
      db = new SQL.Database()
      console.log('✅ New database created')
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON')
    
    return db
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    throw error
  }
}

/**
 * Get the database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Save the database to disk
 */
export function saveDatabase() {
  if (!db) {
    throw new Error('Database not initialized')
  }
  
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  } catch (error) {
    console.error('❌ Error saving database:', error)
    throw error
  }
}

/**
 * Close the database connection
 */
export function closeDatabase() {
  if (db) {
    saveDatabase()
    db.close()
    db = null
    console.log('✅ Database closed')
  }
}

/**
 * Execute a SQL statement (for INSERT, UPDATE, DELETE)
 */
export function run(sql, params = []) {
  const database = getDatabase()
  try {
    const stmt = database.prepare(sql)
    stmt.bind(params)
    stmt.step()
    const changes = database.getRowsModified()
    stmt.free()
    
    // Get the last inserted ID immediately after the statement
    let lastID = 0
    const lastIdStmt = database.prepare('SELECT last_insert_rowid() as lastID')
    if (lastIdStmt.step()) {
      const result = lastIdStmt.getAsObject()
      lastID = result.lastID
    }
    lastIdStmt.free()
    
    saveDatabase()  // Auto-save after writes
    
    return { 
      changes: changes,
      lastID: lastID
    }
  } catch (error) {
    console.error('SQL Error:', error.message)
    throw error
  }
}

/**
 * Get a single row (for SELECT returning one result)
 */
export function get(sql, params = []) {
  const database = getDatabase()
  try {
    const stmt = database.prepare(sql)
    stmt.bind(params)
    
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return row
    }
    stmt.free()
    return null
  } catch (error) {
    console.error('SQL Error:', error.message)
    throw error
  }
}

/**
 * Get all rows (for SELECT returning multiple results)
 */
export function all(sql, params = []) {
  const database = getDatabase()
  try {
    const stmt = database.prepare(sql)
    stmt.bind(params)
    
    const results = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  } catch (error) {
    console.error('SQL Error:', error.message)
    throw error
  }
}

/**
 * Execute a transaction
 */
export function transaction(callback) {
  const database = getDatabase()
  try {
    database.exec('BEGIN TRANSACTION')
    callback()
    database.exec('COMMIT')
    saveDatabase()
  } catch (error) {
    try {
      database.exec('ROLLBACK')
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError)
    }
    throw error
  }
}

export default {
  initDatabase,
  getDatabase,
  saveDatabase,
  closeDatabase,
  run,
  get,
  all,
  transaction
}
