import { useState } from 'react'

// One to do entry. Shows the title and notes, or an inline edit form.
export default function TodoItem({ todo, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes || '')

  const startEdit = () => {
    setTitle(todo.title)
    setNotes(todo.notes || '')
    setEditing(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const saved = await onSave(todo.id, { title, notes })
    if (saved) setEditing(false)
  }

  if (editing) {
    return (
      <li className="todo-item editing">
        <form onSubmit={handleSave} className="todo-edit-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="todo-input"
            required
            autoFocus
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="todo-textarea"
            placeholder="Notes"
            rows="3"
          />
          <div className="todo-actions">
            <button type="button" onClick={() => setEditing(false)} className="todo-btn secondary">
              Cancel
            </button>
            <button type="submit" className="todo-btn primary">Save</button>
          </div>
        </form>
      </li>
    )
  }

  const done = todo.completed === 1

  return (
    <li className={`todo-item ${done ? 'done' : ''}`}>
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle(todo)}
        className="todo-checkbox"
        aria-label={done ? `Mark ${todo.title} as not done` : `Mark ${todo.title} as done`}
      />
      <div className="todo-body">
        <p className="todo-title">{todo.title}</p>
        {todo.notes && <p className="todo-notes">{todo.notes}</p>}
      </div>
      <div className="todo-actions">
        <button onClick={startEdit} className="todo-btn secondary">Edit</button>
        <button onClick={() => onDelete(todo)} className="todo-btn danger">Delete</button>
      </div>
    </li>
  )
}
