import { readFileSync } from 'fs'
import { createClient } from '@libsql/client/web'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const settings = JSON.parse(readFileSync(join(__dirname, '../../local.settings.json'), 'utf8'))
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = settings.Values

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN.trim() })

const result = await client.execute('SELECT id, name, sequence FROM locations WHERE trip_id = 1 ORDER BY sequence ASC')
const locations = result.rows

console.log('Current sequences:')
locations.forEach(loc => console.log(`  #${loc.sequence}: ${loc.name} (id=${loc.id})`))

const updates = locations.map((loc, i) => ({
  sql: 'UPDATE locations SET sequence = ? WHERE id = ?',
  args: [i + 1, loc.id]
}))

await client.batch(updates, 'write')

const verify = await client.execute('SELECT id, name, sequence FROM locations WHERE trip_id = 1 ORDER BY sequence ASC')
console.log('\nUpdated sequences:')
verify.rows.forEach(loc => console.log(`  #${loc.sequence}: ${loc.name} (id=${loc.id})`))
