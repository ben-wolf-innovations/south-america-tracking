// One-off migration for the Planning and To do pages. Additive only: it adds
// columns and tables and never removes anything. Every step checks the
// current schema first, so it is safe to run more than once.
//
// Run from the repo root: node api/src/scripts/migrate-planning-todo.js
import { readFileSync } from 'fs'
import { createClient } from '@libsql/client/web'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const settings = JSON.parse(readFileSync(join(__dirname, '../../local.settings.json'), 'utf8'))
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = settings.Values

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN.trim() })

// Times for the entries Planning builds from each stop. Stored as local
// "HH:MM" text, with no timezone conversion.
const timeColumns = ['checkin_time', 'checkout_time', 'transport_depart_time', 'transport_arrive_time']
const { rows } = await client.execute('PRAGMA table_info(locations)')
const existingColumns = rows.map(row => row.name)

for (const column of timeColumns) {
  if (existingColumns.includes(column)) {
    console.log(`locations.${column} already exists, skipped`)
  } else {
    await client.execute(`ALTER TABLE locations ADD COLUMN ${column} TEXT`)
    console.log(`Added locations.${column}`)
  }
}

// Tours and any other timed entries. Linked to a stop the same way costs are:
// optional, and removed with the stop.
await client.batch([
  `CREATE TABLE IF NOT EXISTS plan_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    location_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    booking_ref TEXT,
    address TEXT,
    notes TEXT,
    booked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_plan_items_location ON plan_items(location_id)',
  'CREATE INDEX IF NOT EXISTS idx_plan_items_date ON plan_items(trip_id, date)',
], 'write')
console.log('plan_items ready')

await client.execute(`CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
)`)
console.log('todos ready')
