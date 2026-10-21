// Adds locations.transport_notes for meeting points and other travel notes
// shown on Planning's transport entries. Safe to run more than once.
//
// Run from the repo root: node api/src/scripts/migrate-transport-notes.js
import { readFileSync } from 'fs'
import { createClient } from '@libsql/client/web'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const settings = JSON.parse(readFileSync(join(__dirname, '../../local.settings.json'), 'utf8'))
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = settings.Values

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN.trim() })

const { rows } = await client.execute('PRAGMA table_info(locations)')
if (rows.some(row => row.name === 'transport_notes')) {
  console.log('locations.transport_notes already exists, skipped')
} else {
  await client.execute('ALTER TABLE locations ADD COLUMN transport_notes TEXT')
  console.log('Added locations.transport_notes')
}
