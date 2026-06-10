import { get, run } from '../shared/turso.js'
import { ValidationError } from '../shared/errors.js'

export async function getTrip(id) {
  return get('SELECT * FROM trips WHERE id = ?', [id])
}

export async function updateTrip(id, updates) {
  const existing = await get('SELECT * FROM trips WHERE id = ?', [id])
  if (!existing) return null

  const allowedFields = ['name', 'description', 'start_date', 'end_date', 'status']
  const fields = []
  const values = []

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }

  if (fields.length === 0) throw new ValidationError('No valid fields to update')

  fields.push('updated_at = datetime("now")')
  values.push(id)

  await run(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`, values)

  return get('SELECT * FROM trips WHERE id = ?', [id])
}
