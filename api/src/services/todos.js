import { get, all, run } from '../shared/turso.js'
import { ValidationError } from '../shared/errors.js'

// Open items newest first, then done items most recently finished first.
export async function getTodos(tripId) {
  return all(
    `SELECT * FROM todos WHERE trip_id = ?
     ORDER BY completed ASC,
       CASE WHEN completed = 1 THEN completed_at END DESC,
       created_at DESC, id DESC`,
    [tripId]
  )
}

export async function createTodo({ trip_id = 1, title, notes }) {
  if (!title?.trim()) throw new ValidationError('Title is required')

  const result = await run(
    'INSERT INTO todos (trip_id, title, notes) VALUES (?, ?, ?)',
    [trip_id, title.trim(), notes?.trim() || null]
  )

  return get('SELECT * FROM todos WHERE id = ?', [result.lastID])
}

export async function updateTodo(id, updates) {
  const existing = await get('SELECT * FROM todos WHERE id = ?', [id])
  if (!existing) return null

  const fields = []
  const values = []

  if ('title' in updates) {
    if (!updates.title?.trim()) throw new ValidationError('Title is required')
    fields.push('title = ?')
    values.push(updates.title.trim())
  }

  if ('notes' in updates) {
    fields.push('notes = ?')
    values.push(updates.notes?.trim() || null)
  }

  // Ticking an item stamps when it was done, so the Done list can sort by it.
  if ('completed' in updates) {
    fields.push('completed = ?', 'completed_at = ?')
    values.push(updates.completed ? 1 : 0, updates.completed ? new Date().toISOString() : null)
  }

  if (fields.length === 0) throw new ValidationError('No valid fields to update')

  values.push(id)
  await run(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values)

  return get('SELECT * FROM todos WHERE id = ?', [id])
}

export async function deleteTodo(id) {
  const result = await run('DELETE FROM todos WHERE id = ?', [id])
  return result.changes > 0
}
