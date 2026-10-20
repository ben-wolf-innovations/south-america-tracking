import { app } from '@azure/functions'
import { requireAdmin } from '../shared/auth.js'
import { getTodos, createTodo, updateTodo, deleteTodo } from '../services/todos.js'
import { ValidationError } from '../shared/errors.js'

app.http('getTodos', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'todos',
  handler: requireAdmin(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const todos = await getTodos(tripId)
      return { status: 200, jsonBody: { success: true, data: todos } }
    } catch (error) {
      context.error('Error fetching todos:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('createTodo', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'todos',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const todo = await createTodo(body)
      return { status: 201, jsonBody: { success: true, data: todo } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error creating todo:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('updateTodo', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'todos/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const updates = await request.json()
      const updated = await updateTodo(request.params.id, updates)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'To do item not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error updating todo:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('deleteTodo', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'todos/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const deleted = await deleteTodo(request.params.id)
      if (!deleted) {
        return { status: 404, jsonBody: { success: false, error: 'To do item not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: 'To do item deleted' } }
    } catch (error) {
      context.error('Error deleting todo:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
