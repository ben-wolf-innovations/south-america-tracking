import { app } from '@azure/functions'
import { withAuth, requireAdmin } from '../shared/auth.js'
import {
  getBlogPosts, getBlogPost, createBlogPost, updateBlogPost, deleteBlogPost, toggleBlogPublish,
  getBlogComments, createBlogComment, deleteBlogComment
} from '../services/blog.js'
import { ValidationError, ForbiddenError } from '../shared/errors.js'

app.http('getBlogPosts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'blog',
  handler: withAuth(async (request, context) => {
    try {
      const tripId = request.query.get('trip_id') || '1'
      const posts = await getBlogPosts(tripId, {
        locationId: request.query.get('location_id'),
        publishedOnly: request.query.get('published_only') === 'true',
        isAdmin: context.user.accessLevel === 'admin'
      })
      return { status: 200, jsonBody: { success: true, data: posts } }
    } catch (error) {
      context.error('Error fetching blog posts:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('getBlogPost', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'blog/{id}',
  handler: withAuth(async (request, context) => {
    try {
      const id = request.params.id
      const post = await getBlogPost(id, context.user.accessLevel === 'admin')
      if (!post) {
        return { status: 404, jsonBody: { success: false, error: 'Blog post not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: post } }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return { status: 403, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error fetching blog post:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('createBlogPost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'blog',
  handler: requireAdmin(async (request, context) => {
    try {
      const body = await request.json()
      const post = await createBlogPost(body, context.user.id || 'admin')
      return { status: 201, jsonBody: { success: true, data: post } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error creating blog post:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('updateBlogPost', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'blog/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updates = await request.json()
      const updated = await updateBlogPost(id, updates)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'Blog post not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error updating blog post:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('deleteBlogPost', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'blog/{id}',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const deleted = await deleteBlogPost(id)
      if (!deleted) {
        return { status: 404, jsonBody: { success: false, error: 'Blog post not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: 'Blog post deleted' } }
    } catch (error) {
      context.error('Error deleting blog post:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('toggleBlogPublish', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'blog/{id}/publish',
  handler: requireAdmin(async (request, context) => {
    try {
      const id = request.params.id
      const updated = await toggleBlogPublish(id)
      if (!updated) {
        return { status: 404, jsonBody: { success: false, error: 'Blog post not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: updated } }
    } catch (error) {
      context.error('Error toggling publish status:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('getBlogComments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'blog/{id}/comments',
  handler: withAuth(async (request, context) => {
    try {
      const comments = await getBlogComments(request.params.id, context.user.accessLevel === 'admin')
      if (!comments) {
        return { status: 404, jsonBody: { success: false, error: 'Blog post not found' } }
      }
      return { status: 200, jsonBody: { success: true, data: comments } }
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return { status: 403, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error fetching blog comments:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('createBlogComment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'blog/{id}/comments',
  handler: withAuth(async (request, context) => {
    try {
      const body = await request.json()
      const comment = await createBlogComment(request.params.id, body, context.user.accessLevel === 'admin')
      if (!comment) {
        return { status: 404, jsonBody: { success: false, error: 'Blog post not found' } }
      }
      return { status: 201, jsonBody: { success: true, data: comment } }
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: 400, jsonBody: { success: false, error: error.message } }
      }
      if (error instanceof ForbiddenError) {
        return { status: 403, jsonBody: { success: false, error: error.message } }
      }
      context.error('Error creating blog comment:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})

app.http('deleteBlogComment', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'blog/{id}/comments/{commentId}',
  handler: requireAdmin(async (request, context) => {
    try {
      const deleted = await deleteBlogComment(request.params.id, request.params.commentId)
      if (!deleted) {
        return { status: 404, jsonBody: { success: false, error: 'Comment not found' } }
      }
      return { status: 200, jsonBody: { success: true, message: 'Comment deleted' } }
    } catch (error) {
      context.error('Error deleting blog comment:', error)
      return { status: 500, jsonBody: { success: false, error: error.message } }
    }
  })
})
