import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { get } from '../shared/turso.js'
import { getJWTSecret } from '../shared/auth.js'
import { ValidationError, UnauthorizedError } from '../shared/errors.js'

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export async function login(pin) {
  if (!pin) throw new ValidationError('PIN is required')

  const adminAuth = await get('SELECT * FROM auth WHERE access_level = ?', ['admin'])
  const familyAuth = await get('SELECT * FROM auth WHERE access_level = ?', ['family'])

  let accessLevel = null

  if (adminAuth && await bcrypt.compare(pin, adminAuth.pin_hash)) {
    accessLevel = 'admin'
  } else if (familyAuth && await bcrypt.compare(pin, familyAuth.pin_hash)) {
    accessLevel = 'family'
  } else {
    throw new UnauthorizedError('Invalid PIN')
  }

  const token = jwt.sign({ accessLevel }, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN })

  return { token, accessLevel, expiresIn: JWT_EXPIRES_IN }
}

export function verifyToken(token) {
  try {
    const user = jwt.verify(token, getJWTSecret())
    return { valid: true, accessLevel: user.accessLevel }
  } catch {
    return { valid: false }
  }
}
