import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'trip.db')

let db = null

/**
 * Initialize database connection
 */
export function initDatabase() {
  try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Open database connection
    db = new Database(DB_PATH, { 
      verbose: process.env.NODE_ENV === 'development' ? console.log : null 
    })
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON')
    
    console.log(`✅ Database connected: ${DB_PATH}`)
    return db
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    return initDatabase()
  }
  return db
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close()
    db = null
    console.log('Database connection closed')
  }
}

/**
 * Run a query (INSERT, UPDATE, DELETE)
 */
export function run(sql, params = []) {
  const database = getDatabase()
  return database.prepare(sql).run(params)
}

/**
 * Get a single row
 */
export function get(sql, params = []) {
  const database = getDatabase()
  return database.prepare(sql).get(params)
}

/**
 * Get all rows
 */
export function all(sql, params = []) {
  const database = getDatabase()
  return database.prepare(sql).all(params)
}

/**
 * Execute a transaction
 */
export function transaction(callback) {
  const database = getDatabase()
  return database.transaction(callback)()
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  run,
  get,
  all,
  transaction
}
