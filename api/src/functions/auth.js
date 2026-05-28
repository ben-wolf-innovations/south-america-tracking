import { app } from '@azure/functions'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { get } from '../shared/database.js'
import { getJWTSecret } from '../shared/auth.js'

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * POST /api/auth/login
 * Login with PIN
 */
app.http('authLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: async (request, context) => {
    try {
      const body = await request.json()
      const { pin } = body

      context.log('Login attempt with PIN:', pin)

      if (!pin) {
        return {
          status: 400,
          jsonBody: { error: 'PIN is required' }
        }
      }

      // Get stored PIN hashes from database
      const adminAuth = await get('SELECT * FROM auth WHERE access_level = ?', ['admin'])
      const familyAuth = await get('SELECT * FROM auth WHERE access_level = ?', ['family'])

      context.log('Admin auth found:', !!adminAuth)
      context.log('Family auth found:', !!familyAuth)

      let accessLevel = null

      // Check against admin PIN
      if (adminAuth && await bcrypt.compare(pin, adminAuth.pin_hash)) {
        accessLevel = 'admin'
        context.log('✅ Admin PIN matched')
      }
      // Check against family PIN
      else if (familyAuth && await bcrypt.compare(pin, familyAuth.pin_hash)) {
        accessLevel = 'family'
        context.log('✅ Family PIN matched')
      }
      else {
        context.log('❌ PIN did not match any stored hashes')
        return {
          status: 401,
          jsonBody: { error: 'Invalid PIN' }
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { accessLevel },
        getJWTSecret(),
        { expiresIn: JWT_EXPIRES_IN }
      )

      return {
        status: 200,
        jsonBody: {
          token,
          user: {
            accessLevel
          },
          expiresIn: JWT_EXPIRES_IN
        }
      }
    } catch (error) {
      context.error('Login error:', error)
      return {
        status: 500,
        jsonBody: { error: 'Login failed' }
      }
    }
  }
})

/**
 * POST /api/auth/verify
 * Verify if current token is valid
 */
app.http('authVerify', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/verify',
  handler: async (request, context) => {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) {
      return {
        status: 200,
        jsonBody: { valid: false }
      }
    }

    try {
      const user = jwt.verify(token, getJWTSecret())
      return {
        status: 200,
        jsonBody: {
          valid: true,
          accessLevel: user.accessLevel
        }
      }
    } catch (error) {
      return {
        status: 200,
        jsonBody: { valid: false }
      }
    }
  }
})
