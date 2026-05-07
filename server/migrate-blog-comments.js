import { initDatabase, run } from './config/database.js'

async function addBlogCommentsTable() {
  console.log('Initializing database...')
  await initDatabase()
  
  console.log('Creating blog_comments table...')
  
  try {
    run(`
      CREATE TABLE IF NOT EXISTS blog_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        comment_text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted INTEGER DEFAULT 0,
        FOREIGN KEY (post_id) REFERENCES blog_posts(id)
      )
    `, [])
    
    console.log('✅ blog_comments table created successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

addBlogCommentsTable()
