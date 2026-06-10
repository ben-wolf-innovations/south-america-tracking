import { get, all, run } from '../shared/turso.js'
import { ValidationError, ForbiddenError } from '../shared/errors.js'

export async function getBlogPosts(tripId, { locationId, publishedOnly, isAdmin } = {}) {
  let sql = 'SELECT * FROM blog_posts WHERE trip_id = ?'
  const params = [tripId]

  if (locationId) {
    sql += ' AND location_id = ?'
    params.push(locationId)
  }

  if (!isAdmin || publishedOnly) {
    sql += ' AND published = 1'
  }

  sql += ' ORDER BY published_date DESC, created_at DESC'

  return all(sql, params)
}

export async function getBlogPost(id, isAdmin) {
  const post = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
  if (!post) return null

  if (!post.published && !isAdmin) {
    throw new ForbiddenError('This post is not yet published')
  }

  return post
}

export async function createBlogPost({ trip_id = 1, location_id, title, content, published = false, published_date }, createdBy) {
  if (!title || !content) throw new ValidationError('Title and content are required')

  const finalPublishedDate = published ? (published_date || new Date().toISOString()) : null

  const result = await run(
    `INSERT INTO blog_posts (trip_id, location_id, title, content, published, published_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [trip_id, location_id || null, title, content, published ? 1 : 0, finalPublishedDate, createdBy]
  )

  return get('SELECT * FROM blog_posts WHERE id = ?', [result.lastID])
}

export async function updateBlogPost(id, updates) {
  const existing = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
  if (!existing) return null

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

  if (fields.length === 0) throw new ValidationError('No valid fields to update')

  values.push(id)
  await run(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`, values)

  return get('SELECT * FROM blog_posts WHERE id = ?', [id])
}

export async function deleteBlogPost(id) {
  const post = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
  if (!post) return false

  await run('DELETE FROM blog_posts WHERE id = ?', [id])
  return true
}

export async function toggleBlogPublish(id) {
  const post = await get('SELECT * FROM blog_posts WHERE id = ?', [id])
  if (!post) return null

  const newPublishedStatus = post.published ? 0 : 1
  const publishedDate = newPublishedStatus ? new Date().toISOString() : null

  await run(
    'UPDATE blog_posts SET published = ?, published_date = ? WHERE id = ?',
    [newPublishedStatus, publishedDate, id]
  )

  return get('SELECT * FROM blog_posts WHERE id = ?', [id])
}
