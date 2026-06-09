import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../config/api'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import './Blog.css'

export default function Blog() {
  const { isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [previewPost, setPreviewPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentForm, setCommentForm] = useState({ user_name: '', comment_text: '' })

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    location_id: '',
    published: false
  })

  // Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ],
  }

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'link', 'image'
  ]

  useEffect(() => {
    loadData().catch(err => {
      console.error('Initial load failed:', err)
      // Error state already set by loadData
    })
  }, [])

  // Load comments when preview post changes
  useEffect(() => {
    if (previewPost) {
      loadComments(previewPost.id)
    } else {
      setComments([])
      setCommentForm({ user_name: '', comment_text: '' })
    }
  }, [previewPost])

  const loadData = async () => {
    try {
      setLoading(true)
      const [postsRes, locationsRes] = await Promise.all([
        api.get('/blog'),
        api.get('/locations')
      ])
      setPosts(postsRes.data.data)
      setLocations(locationsRes.data.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load blog posts:', err)
      setError('Failed to load blog posts')
      throw err  // Re-throw so calling functions know it failed
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async (postId) => {
    try {
      setLoadingComments(true)
      const response = await api.get(`/blog/${postId}/comments`)
      setComments(response.data.data)
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentForm.user_name || !commentForm.comment_text) {
      alert('Please enter your name and comment')
      return
    }

    try {
      const response = await api.post(`/blog/${previewPost.id}/comments`, commentForm)
      setComments([...comments, response.data.data])
      setCommentForm({ user_name: '', comment_text: '' })
    } catch (err) {
      console.error('Failed to add comment:', err)
      alert('Failed to add comment. Please try again.')
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return

    try {
      await api.delete(`/blog/${previewPost.id}/comments/${commentId}`)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (err) {
      console.error('Failed to delete comment:', err)
      alert('Failed to delete comment. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      location_id: '',
      published: false
    })
    setShowAddForm(false)
    setEditingPost(null)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content
    }))
  }

  const handleAddPost = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        location_id: formData.location_id ? parseInt(formData.location_id) : null
      }

      await api.post('/blog', payload)
      await loadData()
      resetForm()
    } catch (err) {
      console.error('Failed to add blog post:', err)
      alert('Failed to add blog post: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleEditPost = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        location_id: formData.location_id ? parseInt(formData.location_id) : null
      }

      await api.put(`/blog/${editingPost.id}`, payload)
      await loadData()
      resetForm()
    } catch (err) {
      console.error('Failed to update blog post:', err)
      alert('Failed to update blog post: ' + (err.response?.data?.error || err.message))
    }
  }

  const startEdit = (post) => {
    setFormData({
      title: post.title || '',
      content: post.content || '',
      location_id: post.location_id || '',
      published: post.published === 1
    })
    setEditingPost(post)
    setShowAddForm(false)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/blog/${id}`)
      await loadData()
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete blog post:', err)
      alert('Failed to delete blog post: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleTogglePublish = async (post) => {
    try {
      await api.put(`/blog/${post.id}/publish`, {
        published: post.published === 1 ? false : true
      })
      await loadData()
    } catch (err) {
      console.error('Failed to toggle publish status:', err)
      alert('Failed to update publish status: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return (
      <div className="blog-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading blog posts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="blog-page">
        <div className="error">
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="blog-page">
      <div className="blog-header">
        <div>
          <h2>Travel Blog</h2>
          <p className="subtitle">Share your journey and experiences</p>
        </div>
        {isAdmin() && !showAddForm && !editingPost && !previewPost && (
          <button
            onClick={() => setShowAddForm(true)}
            className="add-button"
          >
            New Post
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingPost) && (
        <div className="blog-form-container">
          <div className="blog-form-header">
            <h3>{editingPost ? 'Edit Post' : 'New Blog Post'}</h3>
            <button onClick={resetForm} className="close-button">&times;</button>
          </div>
          <form onSubmit={editingPost ? handleEditPost : handleAddPost} className="blog-form">
            <div className="form-row">
              <div className="form-field">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter post title..."
                />
              </div>

              <div className="form-field">
                <label>Location</label>
                <select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleInputChange}
                >
                  <option value="">Not linked to a specific location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      #{loc.sequence} {loc.name}, {loc.country}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field full-width">
              <label>Content *</label>
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={handleContentChange}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Write your travel story here..."
              />
            </div>

            {isAdmin() && (
              <div className="form-field checkbox-field">
                <label>
                  <input
                    type="checkbox"
                    name="published"
                    checked={formData.published}
                    onChange={handleInputChange}
                  />
                  <span>Publish immediately</span>
                </label>
                <p className="field-hint">
                  Unpublished posts are only visible to admin users
                </p>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={resetForm} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button">
                {editingPost ? 'Update Post' : 'Create Post'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewPost && (
        <div className="modal-overlay" onClick={() => setPreviewPost(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h2>{previewPost.title}</h2>
              <button onClick={() => setPreviewPost(null)} className="close-button">&times;</button>
            </div>
            <div className="preview-meta">
              {previewPost.location_name && (
                <span className="location-badge">
                  {previewPost.location_name}, {previewPost.location_country}
                </span>
              )}
              <span className="date-badge">
                {new Date(previewPost.created_at).toLocaleDateString()}
              </span>
              <span className={`status-badge ${previewPost.published ? 'published' : 'draft'}`}>
                {previewPost.published ? 'Published' : 'Draft'}
              </span>
            </div>
            <div 
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: previewPost.content }}
            />

            {/* Comments Section */}
            <div className="comments-section">
              <h3>Comments ({comments.length})</h3>
              
              {/* Comment Form */}
              <form onSubmit={handleAddComment} className="comment-form">
                <input
                  type="text"
                  placeholder="Your name"
                  value={commentForm.user_name}
                  onChange={(e) => setCommentForm({ ...commentForm, user_name: e.target.value })}
                  className="comment-input"
                  required
                />
                <textarea
                  placeholder="Write a comment..."
                  value={commentForm.comment_text}
                  onChange={(e) => setCommentForm({ ...commentForm, comment_text: e.target.value })}
                  className="comment-textarea"
                  rows="3"
                  required
                />
                <button type="submit" className="submit-comment-button">
                  Add Comment
                </button>
              </form>

              {/* Comments List */}
              <div className="comments-list">
                {loadingComments ? (
                  <p className="loading-text">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="empty-comments">No comments yet. Be the first to comment!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="comment-card">
                      <div className="comment-header">
                        <span className="comment-author">{comment.user_name}</span>
                        <span className="comment-date">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="comment-text">{comment.comment_text}</p>
                      {isAdmin() && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="delete-comment-button"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blog Posts List */}
      <div className="blog-posts-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No blog posts yet</p>
            {isAdmin() && (
              <button onClick={() => setShowAddForm(true)} className="add-button">
                Write Your First Post
              </button>
            )}
          </div>
        ) : (
          posts.map((post) => {
            const location = locations.find(loc => loc.id === post.location_id)
            const isPublished = post.published === 1

            return (
              <div key={post.id} className={`blog-post-card ${!isPublished ? 'draft' : ''}`}>
                <div className="blog-post-header">
                  <div>
                    <h3>{post.title}</h3>
                    <div className="blog-post-meta">
                      {location && (
                        <span className="location-badge">
                          #{location.sequence} {location.name}
                        </span>
                      )}
                      <span className="date-badge">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                      <span className={`status-badge ${isPublished ? 'published' : 'draft'}`}>
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  {isAdmin() && !showAddForm && !editingPost && (
                    <div className="blog-post-actions">
                      <button
                        onClick={() => handleTogglePublish(post)}
                        className="publish-button"
                        title={isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {isPublished ? 'View' : 'Publish'}
                      </button>
                      <button
                        onClick={() => startEdit(post)}
                        className="edit-button"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(post.id)}
                        className="delete-button"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div 
                  className="blog-post-excerpt"
                  dangerouslySetInnerHTML={{ 
                    __html: post.content.substring(0, 300) + (post.content.length > 300 ? '...' : '')
                  }}
                />

                <button
                  onClick={() => setPreviewPost(post)}
                  className="read-more-button"
                >
                  Read Full Post →
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Blog Post?</h3>
            <p>Are you sure you want to delete this blog post? This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={() => setDeleteConfirm(null)} className="cancel-button">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="delete-confirm-button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
