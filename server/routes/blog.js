import express from 'express'
import { get, all, run } from '../config/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/blog
 * Get all blog posts, optionally filtered
 * Family users can only see published posts
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const { trip_id = 1, location_id, published_only } = req.query
    const isAdmin = req.user.accessLevel === 'admin'

    let sql = 'SELECT * FROM blog_posts WHERE trip_id = ?'
    const params = [trip_id]

    if (location_id) {
      sql += ' AND location_id = ?'
      params.push(location_id)
    }

    // Non-admin users can only see published posts
    if (!isAdmin || published_only === 'true') {
      sql += ' AND published = 1'
    }

    sql += ' ORDER BY published_date DESC, created_at DESC'

    const posts = all(sql, params)
    res.json({ success: true, data: posts })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/blog/:id
 * Get a single blog post
 * Family users can only see published posts
 */
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const post = get('SELECT * FROM blog_posts WHERE id = ?', [req.params.id])
    
    if (!post) {
      return res.status(404).json({ success: false, error: 'Blog post not found' })
    }

    // Check if user has permission to view unpublished posts
    const isAdmin = req.user.accessLevel === 'admin'
    if (!post.published && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'This post is not yet published' 
      })
    }
    
    res.json({ success: true, data: post })
  } catch (error) {
    console.error('Error fetching blog post:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/blog
 * Create a new blog post (admin only)
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      trip_id = 1,
      location_id,
      title,
      content,
      published = false,
      published_date
    } = req.body

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and content are required' 
      })
    }

    const finalPublishedDate = published ? (published_date || new Date().toISOString()) : null
    const createdBy = req.user.id || 'admin'

    const result = run(
      `INSERT INTO blog_posts (
        trip_id, location_id, title, content, 
        published, published_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        trip_id, location_id, title, content,
        published ? 1 : 0, finalPublishedDate, createdBy
      ]
    )

    const newPost = get('SELECT * FROM blog_posts WHERE id = ?', [result.lastID])
    res.status(201).json({ success: true, data: newPost })
  } catch (error) {
    console.error('Error creating blog post:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/blog/:id
 * Update a blog post (admin only)
 */
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Check if post exists
    const existing = get('SELECT * FROM blog_posts WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Blog post not found' })
    }

    // Build dynamic UPDATE query
    const allowedFields = ['location_id', 'title', 'content', 'published', 'published_date']
    const fields = []
    const values = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'published') {
          fields.push(`${key} = ?`)
          values.push(value ? 1 : 0)
          
          // If publishing for first time, set published_date if not provided
          if (value && !existing.published && !updates.published_date) {
            fields.push('published_date = ?')
            values.push(new Date().toISOString())
          }
        } else {
          fields.push(`${key} = ?`)
          values.push(value)
        }
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' })
    }

    values.push(id)

    run(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`, values)

    const updated = get('SELECT * FROM blog_posts WHERE id = ?', [id])
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating blog post:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/blog/:id
 * Delete a blog post (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params

    const existing = get('SELECT * FROM blog_posts WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Blog post not found' })
    }

    run('DELETE FROM blog_posts WHERE id = ?', [id])

    res.json({ 
      success: true, 
      message: 'Blog post deleted successfully',
      deleted_id: id 
    })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/blog/:id/publish
 * Publish or unpublish a blog post (admin only)
 */
router.put('/:id/publish', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params
    const { published } = req.body

    const existing = get('SELECT * FROM blog_posts WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Blog post not found' })
    }

    const publishedDate = published && !existing.published ? new Date().toISOString() : existing.published_date

    run(
      'UPDATE blog_posts SET published = ?, published_date = ? WHERE id = ?',
      [published ? 1 : 0, publishedDate, id]
    )

    const updated = get('SELECT * FROM blog_posts WHERE id = ?', [id])
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error publishing blog post:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/blog/:id/comments
 * Get all comments for a blog post
 * Both admin and family users can view comments
 */
router.get('/:id/comments', authenticateToken, (req, res) => {
  try {
    const { id } = req.params

    // Verify post exists
    const post = get('SELECT * FROM blog_posts WHERE id = ?', [id])
    if (!post) {
      return res.status(404).json({ success: false, error: 'Blog post not found' })
    }

    const comments = all(
      'SELECT * FROM blog_comments WHERE post_id = ? AND deleted = 0 ORDER BY created_at ASC',
      [id]
    )

    res.json({ success: true, data: comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/blog/:id/comments
 * Add a comment to a blog post
 * Both admin and family users can comment
 */
router.post('/:id/comments', authenticateToken, (req, res) => {
  try {
    const { id } = req.params
    const { comment_text, user_name } = req.body

    // Validate required fields
    if (!comment_text || !user_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Comment text and user name are required' 
      })
    }

    // Verify post exists
    const post = get('SELECT * FROM blog_posts WHERE id = ?', [id])
    if (!post) {
      return res.status(404).json({ success: false, error: 'Blog post not found' })
    }

    // Check if post is published (family users can only comment on published posts)
    const isAdmin = req.user.accessLevel === 'admin'
    if (!post.published && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot comment on unpublished posts' 
      })
    }

    const result = run(
      'INSERT INTO blog_comments (post_id, user_name, comment_text) VALUES (?, ?, ?)',
      [id, user_name, comment_text]
    )

    const newComment = get('SELECT * FROM blog_comments WHERE id = ?', [result.lastID])
    res.status(201).json({ success: true, data: newComment })
  } catch (error) {
    console.error('Error creating comment:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/blog/:id/comments/:commentId
 * Delete a comment (admin only)
 */
router.delete('/:id/comments/:commentId', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id, commentId } = req.params

    const existing = get('SELECT * FROM blog_comments WHERE id = ? AND post_id = ?', [commentId, id])
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Comment not found' })
    }

    run('UPDATE blog_comments SET deleted = 1 WHERE id = ?', [commentId])

    res.json({ 
      success: true, 
      message: 'Comment deleted successfully',
      deleted_id: commentId
    })
  } catch (error) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
