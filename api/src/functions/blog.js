import { app } from '@azure/functions'
import { get, all, run } from '../shared/database.js'
import { withAuth, requireAdmin } from '../shared/auth.js'

/**
 * GET /api/blog
 * Get blog posts (family sees published only)
 */
app.http('getBlogPosts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'blog',
  handler: withAuth(async (request, context) => {
    try {
      const trip_id = request.query.get('trip_id') || '1'
      const location_id = request.query.get('location_id')
      const published_only = request.query.get('published_only')
      const isAdmin = context.user.accessLevel === 'admin'

      let sql = 'SELECT * FROM blog_posts WHERE trip_id = ?'
      const params = [trip_id]

      if (location_id) {
        sql += ' AND location_id = ?'
        params.push(location_id)
      }

      if (!isAdmin || published_only === 'true') {
        sql += ' AND published = 1'
      }

      sql += ' ORDER BY published_date DESC, created_at DESC'

      const posts = await all(sql, params)
      
      return {
        status: 200,
        jsonBody: { success: true, data: posts }
      }
    } catch (error) {
      context.error('Error fetching blog posts:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * GET /api/blog/:id
 * Get single blog post
 */
app.http('getBlogPost', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'blog/{id}',
  handler: withAuth(async (request, context) => {
    try {
      const id = request.params.id
      const post = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
      
      if (!post) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Blog post not found' }
        }
      }

      const isAdmin = context.user.accessLevel === 'admin'
      if (!post.published && !isAdmin) {
        return {
          status: 403,
          jsonBody: { success: false, error: 'This post is not yet published' }
        }
      }
      
      return {
        status: 200,
        jsonBody: { success: true, data: post }
      }
    } catch (error) {
      context.error('Error fetching blog post:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * POST /api/blog
 * Create blog post (admin only)
 */
app.http('createBlogPost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'blog',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const {
        trip_id = 1,
        location_id,
        title,
        content,
        published = false,
        published_date
      } = body

      if (!title || !content) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Title and content are required' }
        }
      }

      const finalPublishedDate = published ? (published_date || new Date().toISOString()) : null
      const createdBy = context.user.id || 'admin'

      const result = await run(
        `INSERT INTO blog_posts (trip_id, location_id, title, content, published, published_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [trip_id, location_id || null, title, content, published ? 1 : 0, finalPublishedDate, createdBy]
      )

      const newPost = await get('SELECT * FROM blog_posts WHERE id = ?', [result.lastID])
      
      return {
        status: 201,
        jsonBody: { success: true, data: newPost }
      }
    } catch (error) {
      context.error('Error creating blog post:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * PUT /api/blog/:id
 * Update blog post (admin only)
 */
app.http('updateBlogPost', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'blog/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()

      const existing = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
      if (!existing) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Blog post not found' }
        }
      }

      const allowedFields = ['location_id', 'title', 'content', 'published', 'published_date']
      const fields = []
      const values = []

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`)
          
          if (key === 'published') {
            values.push(value ? 1 : 0)
          } else if (key === 'location_id' && value === '') {
            values.push(null)
          } else {
            values.push(value)
          }
        }
      }

      if (fields.length === 0) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'No valid fields to update' }
        }
      }

      values.push(id)
      await run(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`, values)

      const updated = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
      
      return {
        status: 200,
        jsonBody: { success: true, data: updated }
      }
    } catch (error) {
      context.error('Error updating blog post:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * DELETE /api/blog/:id
 * Delete blog post (admin only)
 */
app.http('deleteBlogPost', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'blog/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      
      const post = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
      if (!post) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Blog post not found' }
        }
      }

      await run('DELETE FROM blog_posts WHERE id = ?', [id])

      return {
        status: 200,
        jsonBody: { success: true, message: 'Blog post deleted' }
      }
    } catch (error) {
      context.error('Error deleting blog post:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})

/**
 * PUT /api/blog/:id/publish
 * Toggle publish status (admin only)
 */
app.http('toggleBlogPublish', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'blog/{id}/publish',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      
      const post = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
      if (!post) {
        return {
          status: 404,
          jsonBody: { success: false, error: 'Blog post not found' }
        }
      }

      const newPublishedStatus = post.published ? 0 : 1
      const publishedDate = newPublishedStatus ? new Date().toISOString() : null

      await run(
        'UPDATE blog_posts SET published = ?, published_date = ? WHERE id = ?',
        [newPublishedStatus, publishedDate, id]
      )

      const updated = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
      
      return {
        status: 200,
        jsonBody: { success: true, data: updated }
      }
    } catch (error) {
      context.error('Error toggling publish status:', error)
      return {
        status: 500,
        jsonBody: { success: false, error: error.message }
      }
    }
  })
})
