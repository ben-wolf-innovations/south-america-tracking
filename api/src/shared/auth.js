import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'

/**
 * Higher-order function to wrap Azure Functions handlers with JWT authentication
 * 
 * @param {Function} handler - The actual handler function
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAdmin - Whether admin access is required
 * @param {boolean} options.optional - Whether auth is optional
 * @returns {Function} Wrapped handler
 */
export function withAuth(handler, options = {}) {
  const { requireAdmin = false, optional = false } = options
  
  return async (request, context) => {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1] // Bearer TOKEN

    if (!token) {
      if (optional) {
        // Auth is optional, continue without user
        context.user = null
        return await handler(request, context)
      }
      
      return {
        status: 401,
        jsonBody: { error: 'Access token required' }
      }
    }

    try {
      // Verify JWT token
      const user = jwt.verify(token, JWT_SECRET)
      
      // Check admin requirement
      if (requireAdmin && user.accessLevel !== 'admin') {
        return {
          status: 403,
          jsonBody: { error: 'Admin access required' }
        }
      }
      
      // Store user in context (request is immutable in Azure Functions)
      context.user = user
      
      // Call the actual handler
      return await handler(request, context)
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return {
          status: 403,
          jsonBody: { error: 'Token expired' }
        }
      }
      
      return {
        status: 403,
        jsonBody: { error: 'Invalid or expired token' }
      }
    }
  }
}

/**
 * Convenience wrapper for admin-only routes
 */
export function requireAdmin(handler) {
  return withAuth(handler, { requireAdmin: true })
}

/**
 * Get JWT secret (for token generation)
 */
export function getJWTSecret() {
  return JWT_SECRET
}
