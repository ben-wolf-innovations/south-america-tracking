import { readFileSync } from 'fs'
import { createClient } from '@libsql/client/web'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const settings = JSON.parse(readFileSync(join(__dirname, '../../local.settings.json'), 'utf8'))
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = settings.Values

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN.trim() })

try {
  await client.execute('ALTER TABLE locations DROP COLUMN travel_notes')
  console.log('Dropped travel_notes')
} catch (e) {
  console.log('travel_notes skipped:', e.message)
}

try {
  await client.execute('ALTER TABLE locations ADD COLUMN is_travel_overnight INTEGER DEFAULT 0')
  console.log('Added is_travel_overnight')
} catch (e) {
  console.log('is_travel_overnight skipped:', e.message)
}
