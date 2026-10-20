import { useState, useEffect } from 'react'
import api from '../config/api'
import { useDataRefresh } from '../hooks/useDataRefresh'
import TodoItem from '../components/todo/TodoItem'
import './Todo.css'

// Shared admin to do list. Ticked items move to a collapsible Done section.
export default function Todo() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    loadTodos()
  }, [])

  const loadTodos = async () => {
    try {
      const response = await api.get('/todos')
      setTodos(response.data.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load to do list:', err)
      setError(`Failed to load to do list: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useDataRefresh(loadTodos)

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      await api.post('/todos', { title: newTitle, notes: newNotes })
      setNewTitle('')
      setNewNotes('')
      await loadTodos()
    } catch (err) {
      alert('Failed to add item: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleToggle = async (todo) => {
    try {
      await api.put(`/todos/${todo.id}`, { completed: todo.completed !== 1 })
      await loadTodos()
    } catch (err) {
      alert('Failed to update item: ' + (err.response?.data?.error || err.message))
    }
  }

  // Returns true on success so the item can close its edit form.
  const handleSave = async (id, updates) => {
    try {
      await api.put(`/todos/${id}`, updates)
      await loadTodos()
      return true
    } catch (err) {
      alert('Failed to save item: ' + (err.response?.data?.error || err.message))
      return false
    }
  }

  const handleDelete = async (todo) => {
    if (!window.confirm(`Delete "${todo.title}"?`)) return
    try {
      await api.delete(`/todos/${todo.id}`)
      await loadTodos()
    } catch (err) {
      alert('Failed to delete item: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return <div className="todo-page"><p className="todo-status">Loading to do list...</p></div>
  }

  const open = todos.filter(t => t.completed !== 1)
  const done = todos.filter(t => t.completed === 1)
  const itemProps = { onToggle: handleToggle, onSave: handleSave, onDelete: handleDelete }

  return (
    <div className="todo-page">
      <div className="todo-header">
        <h2>To do</h2>
        <p className="subtitle">{open.length} to do, {done.length} done</p>
      </div>

      {error && <p className="todo-error">{error}</p>}

      <form onSubmit={handleAdd} className="todo-add-form">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="todo-input"
          placeholder="Add something to do"
          required
        />
        <textarea
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          className="todo-textarea"
          placeholder="Notes (optional)"
          rows="2"
        />
        <button type="submit" className="todo-btn primary">Add</button>
      </form>

      {open.length === 0 ? (
        <p className="todo-empty">Nothing left to do.</p>
      ) : (
        <ul className="todo-list">
          {open.map(todo => <TodoItem key={todo.id} todo={todo} {...itemProps} />)}
        </ul>
      )}

      {done.length > 0 && (
        <section className="todo-done">
          <button
            onClick={() => setShowDone(!showDone)}
            className="todo-done-toggle"
            aria-expanded={showDone}
          >
            {showDone ? '▾' : '▸'} Done ({done.length})
          </button>
          {showDone && (
            <ul className="todo-list">
              {done.map(todo => <TodoItem key={todo.id} todo={todo} {...itemProps} />)}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
