// Adds flags recording whether a location's arrival/departure date was stamped
// by a check-in rather than entered by hand.
//
// Check-in fills in blank dates from the estimator, and clearing visited flags
// used to null every date on the trip to undo that. This wiped dates that were
// booked and entered manually. With these flags, clearing only removes the
// dates that a check-in put there.
//
// Existing rows default to 0, which treats every date already in the database
// as hand-entered. That is the safe default: it keeps booked dates.
//
// Run once against Turso:  node src/scripts/migrate-checkin-date-flags.js
import { readFileSync } from 'fs'
import { createClient } from '@libsql/client/web'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const settings = JSON.parse(readFileSync(join(__dirname, '../../local.settings.json'), 'utf8'))
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = settings.Values

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN.trim() })

for (const column of ['arrival_from_checkin', 'departure_from_checkin']) {
  try {
    await client.execute(`ALTER TABLE locations ADD COLUMN ${column} INTEGER DEFAULT 0`)
    console.log(`Added ${column}`)
  } catch (e) {
    console.log(`${column} skipped:`, e.message)
  }
}

const { rows } = await client.execute(
  `SELECT COUNT(*) AS total,
          SUM(CASE WHEN arrival_date IS NOT NULL THEN 1 ELSE 0 END) AS with_arrival,
          SUM(CASE WHEN departure_date IS NOT NULL THEN 1 ELSE 0 END) AS with_departure
   FROM locations`
)
console.log('Locations:', rows[0])
console.log('Existing dates are all treated as hand-entered and will survive a clear.')
