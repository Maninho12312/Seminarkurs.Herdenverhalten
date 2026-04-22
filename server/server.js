const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Database
const db = new sqlite3.Database(process.env.DB_PATH);

// Initialize database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    image TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_name TEXT,
    text TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    post_id INTEGER,
    comment_id INTEGER,
    type TEXT,
    UNIQUE(user_id, post_id, comment_id)
  )`);
});

// Routes

// Get all posts
app.get('/api/posts', (req, res) => {
  db.all('SELECT * FROM posts ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create post (admin only)
app.post('/api/posts', upload.single('image'), (req, res) => {
  const { password, text } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const image = req.file ? req.file.filename : null;
  db.run('INSERT INTO posts (text, image) VALUES (?, ?)', [text, image], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Get comments for a post
app.get('/api/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  db.all('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [postId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add comment
app.post('/api/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  const { user_name, text } = req.body;
  db.run('INSERT INTO comments (post_id, user_name, text) VALUES (?, ?, ?)', [postId, user_name || 'Anonym', text], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Add like
app.post('/api/likes', (req, res) => {
  const { user_id, post_id, comment_id, type } = req.body;
  // Check if already liked
  const checkQuery = comment_id ? 'SELECT id FROM likes WHERE user_id = ? AND comment_id = ?' : 'SELECT id FROM likes WHERE user_id = ? AND post_id = ?';
  const checkParams = comment_id ? [user_id, comment_id] : [user_id, post_id];
  db.get(checkQuery, checkParams, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Already liked' });
    // Insert like
    db.run('INSERT INTO likes (user_id, post_id, comment_id, type) VALUES (?, ?, ?, ?)', [user_id, post_id, comment_id, type], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      // Update likes count
      const updateTable = type === 'comment' ? 'comments' : 'posts';
      const updateId = type === 'comment' ? comment_id : post_id;
      db.run(`UPDATE ${updateTable} SET likes = likes + 1 WHERE id = ?`, [updateId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

// Admin add comment
app.post('/api/admin/comments', (req, res) => {
  const { password, post_id, text } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  db.run('INSERT INTO comments (post_id, user_name, text) VALUES (?, ?, ?)', [post_id, 'Admin', text], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});