import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, '..', 'database', 'trip.db')
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql')
const SEED_PATH = path.join(__dirname, '..', 'database', 'seed.sql')

/**
 * Initialize the database
 */
async function initDatabase() {
  console.log('🗄️  Initializing database...')
  
  try {
    // Remove existing database if it exists
    if (fs.existsSync(DB_PATH)) {
      console.log('⚠️  Existing database found, removing...')
      fs.unlinkSync(DB_PATH)
    }

    // Initialize SQL.js
    const SQL = await initSqlJs()
    
    // Create new database
    const db = new SQL.Database()
    console.log(`✅ Database created: ${DB_PATH}`)

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON')

    // Read and execute schema
    console.log('📋 Creating tables...')
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
    db.exec(schema)
    console.log('✅ Schema created successfully')

    // Create default auth entries
    console.log('🔐 Setting up authentication...')
    const adminPin = process.env.ADMIN_PIN || '1234'
    const familyPin = process.env.FAMILY_PIN || '5678'

    const adminHash = await bcrypt.hash(adminPin, 10)
    const familyHash = await bcrypt.hash(familyPin, 10)

    db.run('INSERT INTO auth (access_level, pin_hash) VALUES (?, ?)', ['admin', adminHash])
    db.run('INSERT INTO auth (access_level, pin_hash) VALUES (?, ?)', ['family', familyHash])
    console.log('✅ Authentication configured')
    console.log(`   Admin PIN: ${adminPin}`)
    console.log(`   Family PIN: ${familyPin}`)

    // Load seed data if it exists
    if (fs.existsSync(SEED_PATH)) {
      console.log('🌱 Loading seed data...')
      const seed = fs.readFileSync(SEED_PATH, 'utf8')
      db.exec(seed)
      console.log('✅ Seed data loaded')
    }

    // Save database to file
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
    console.log('✅ Database saved to disk')

    db.close()
    console.log('✅ Database initialization complete!')
    console.log('')
    console.log('📍 Next steps:')
    console.log('   1. Update the PINs in server/.env if needed')
    console.log('   2. Run "npm run dev" to start the application')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

// Run initialization
initDatabase()
