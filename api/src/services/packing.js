import { get, all, run } from '../shared/turso.js'
import { ValidationError } from '../shared/errors.js'

const VALID_OWNERS = ['Ben', 'Elspeth', 'Both']

export async function getPackingItems(tripId) {
  return all(
    `SELECT * FROM packing_items WHERE trip_id = ? ORDER BY owner, created_at DESC`,
    [tripId]
  )
}

export async function createPackingItem({ owner, title, budget_amount, actual_amount, category, trip_id = 1 }) {
  if (!owner || !title) throw new ValidationError('Owner and title are required')
  if (!VALID_OWNERS.includes(owner)) throw new ValidationError('Owner must be "Ben", "Elspeth", or "Both"')

  const roundedBudget = Math.round(parseFloat(budget_amount || 0) * 100) / 100
  const roundedActual = Math.round(parseFloat(actual_amount || 0) * 100) / 100

  const result = await run(
    `INSERT INTO packing_items (trip_id, owner, title, budget_amount, actual_amount, completed, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [trip_id, owner, title, roundedBudget, roundedActual, 0, category || null]
  )

  return get('SELECT * FROM packing_items WHERE id = ?', [Number(result.lastID)])
}

export async function updatePackingItem(id, updates) {
  const existing = await get('SELECT * FROM packing_items WHERE id = ?', [id])
  if (!existing) return null

  const allowedFields = ['owner', 'title', 'budget_amount', 'actual_amount', 'completed', 'category']
  const fields = []
  const values = []

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`)
      if (key === 'budget_amount' || key === 'actual_amount') {
        values.push(Math.round(parseFloat(value || 0) * 100) / 100)
      } else if (key === 'completed') {
        values.push(value ? 1 : 0)
      } else if (key === 'category') {
        values.push(value === '' ? null : value)
      } else {
        values.push(value)
      }
    }
  }

  if (fields.length === 0) throw new ValidationError('No valid fields to update')

  values.push(id)
  await run(`UPDATE packing_items SET ${fields.join(', ')} WHERE id = ?`, values)

  return get('SELECT * FROM packing_items WHERE id = ?', [id])
}

export async function deletePackingItem(id) {
  const item = await get('SELECT * FROM packing_items WHERE id = ?', [id])
  if (!item) return false

  await run('DELETE FROM packing_items WHERE id = ?', [id])
  return true
}
