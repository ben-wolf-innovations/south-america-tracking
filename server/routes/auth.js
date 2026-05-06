import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { get } from '../config/database.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * POST /api/auth/login
 * Login with PIN
 */
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' })
    }

    // Get stored PIN hashes from database
    const adminAuth = get('SELECT * FROM auth WHERE access_level = ?', ['admin'])
    const familyAuth = get('SELECT * FROM auth WHERE access_level = ?', ['family'])

    let accessLevel = null

    // Check against admin PIN
    if (adminAuth && await bcrypt.compare(pin, adminAuth.pin_hash)) {
      accessLevel = 'admin'
    }
    // Check against family PIN
    else if (familyAuth && await bcrypt.compare(pin, familyAuth.pin_hash)) {
      accessLevel = 'family'
    }
    else {
      return res.status(401).json({ error: 'Invalid PIN' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { accessLevel },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      token,
      user: {
        accessLevel
      },
      expiresIn: JWT_EXPIRES_IN
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * POST /api/auth/verify
 * Verify if current token is valid
 */
router.post('/verify', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ valid: false })
  }

  try {
    const user = jwt.verify(token, JWT_SECRET)
    res.json({
      valid: true,
      accessLevel: user.accessLevel
    })
  } catch (error) {
    res.json({ valid: false })
  }
})

export default router
