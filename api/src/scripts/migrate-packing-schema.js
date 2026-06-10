import { readFileSync } from 'fs'
import { createClient } from '@libsql/client/web'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const settings = JSON.parse(readFileSync(join(__dirname, '../../local.settings.json'), 'utf8'))
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = settings.Values

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN.trim() })

try {
  await client.execute('ALTER TABLE packing_items ADD COLUMN category TEXT')
  console.log('Added category')
} catch (e) {
  console.log('category skipped:', e.message)
}

try {
  await client.execute('DELETE FROM packing_items WHERE deleted = 1')
  console.log('Purged soft-deleted rows')
} catch (e) {
  console.log('Purge skipped:', e.message)
}

try {
  await client.execute('ALTER TABLE packing_items DROP COLUMN deleted')
  console.log('Dropped deleted column')
} catch (e) {
  console.log('deleted column skipped:', e.message)
}
