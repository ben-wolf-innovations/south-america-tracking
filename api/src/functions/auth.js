import { app } from '@azure/functions'
import { login, verifyToken } from '../services/auth.js'
import { ValidationError, UnauthorizedError } from '../shared/errors.js'

app.http('authLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: async (request, context) => {
    try {
      const body = await request.json()
      const result = await login(body.pin)
      return {
        status: 200,
        jsonBody: {
          token: result.token,
          user: { accessLevel: result.accessLevel },
          expiresIn: result.expiresIn
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { error: error.message } }
      }
      if (error instanceof UnauthorizedError) {
        return { status: 401, jsonBody: { error: error.message } }
      }
      context.error('Login error:', error)
      return { status: 500, jsonBody: { error: 'Login failed' } }
    }
  }
})

app.http('authVerify', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/verify',
  handler: async (request, context) => {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) {
      return { status: 200, jsonBody: { valid: false } }
    }

    return { status: 200, jsonBody: verifyToken(token) }
  }
})
