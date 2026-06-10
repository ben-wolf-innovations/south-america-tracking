import { createClient } from '@libsql/client/web'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} environment variable is not set`)
  return value.trim()
}

const client = createClient({
  url: requireEnv('TURSO_DATABASE_URL'),
  authToken: requireEnv('TURSO_AUTH_TOKEN'),
})

function exec(sql, params = []) {
  return client.execute({ sql, args: params })
}

export async function run(sql, params = []) {
  const result = await exec(sql, params)
  return {
    changes: result.rowsAffected,
    lastID: result.lastInsertRowid != null ? Number(result.lastInsertRowid) : null,
  }
}

export async function get(sql, params = []) {
  const result = await exec(sql, params)
  return result.rows[0] ?? null
}

export async function all(sql, params = []) {
  const result = await exec(sql, params)
  return result.rows
}

// statements: array of { sql, params }
export async function transaction(statements) {
  const batch = statements.map(({ sql, params = [] }) => ({ sql, args: params }))
  await client.batch(batch, 'write')
}

