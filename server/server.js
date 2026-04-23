const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// JSON file paths
const POSTS_FILE = path.join(__dirname, 'posts.json');
const COMMENTS_FILE = path.join(__dirname, 'comments.json');
const LIKES_FILE = path.join(__dirname, 'likes.json');

// Helper functions for JSON operations
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return [];
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing JSON file:', error);
  }
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://seminarkurs-userverhalten.vercel.app'
  ]
}));
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

// Routes

// Get all posts
app.get('/api/posts', (req, res) => {
  const posts = readJSON(POSTS_FILE);
  // Sort by created_at descending
  posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(posts);
});

// Create post (admin only)
app.post('/api/posts', upload.single('image'), (req, res) => {
  const { password, text } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const posts = readJSON(POSTS_FILE);
  const newPost = {
    id: Date.now(),
    text: text || null,
    image: req.file ? req.file.filename : null,
    likes: 0,
    created_at: new Date().toISOString()
  };
  
  posts.push(newPost);
  writeJSON(POSTS_FILE, posts);
  
  res.json({ id: newPost.id });
});

// Get comments for a post
app.get('/api/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  const comments = readJSON(COMMENTS_FILE);
  const postComments = comments.filter(comment => comment.post_id === postId);
  // Sort by created_at ascending
  postComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(postComments);
});

// Add comment
app.post('/api/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  const { user_name, text } = req.body;
  
  const comments = readJSON(COMMENTS_FILE);
  const newComment = {
    id: Date.now(),
    post_id: postId,
    user_name: user_name || 'Anonym',
    text: text,
    likes: 0,
    created_at: new Date().toISOString()
  };
  
  comments.push(newComment);
  writeJSON(COMMENTS_FILE, comments);
  
  res.json({ id: newComment.id });
});

// Add like
app.post('/api/likes', (req, res) => {
  const { user_id, post_id, comment_id, type } = req.body;
  
  const likes = readJSON(LIKES_FILE);
  
  // Check if already liked
  const existingLike = likes.find(like => 
    like.user_id === user_id && 
    ((type === 'post' && like.post_id === post_id) || 
     (type === 'comment' && like.comment_id === comment_id))
  );
  
  if (existingLike) {
    return res.status(400).json({ error: 'Already liked' });
  }
  
  // Add like
  const newLike = {
    id: Date.now(),
    user_id,
    post_id: type === 'post' ? post_id : null,
    comment_id: type === 'comment' ? comment_id : null,
    type
  };
  
  likes.push(newLike);
  writeJSON(LIKES_FILE, likes);
  
  // Update likes count
  if (type === 'post') {
    const posts = readJSON(POSTS_FILE);
    const post = posts.find(p => p.id === post_id);
    if (post) {
      post.likes += 1;
      writeJSON(POSTS_FILE, posts);
    }
  } else if (type === 'comment') {
    const comments = readJSON(COMMENTS_FILE);
    const comment = comments.find(c => c.id === comment_id);
    if (comment) {
      comment.likes += 1;
      writeJSON(COMMENTS_FILE, comments);
    }
  }
  
  res.json({ success: true });
});

// Admin add comment
app.post('/api/admin/comments', (req, res) => {
  const { password, post_id, text } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const comments = readJSON(COMMENTS_FILE);
  const newComment = {
    id: Date.now(),
    post_id: parseInt(post_id),
    user_name: 'Admin',
    text: text,
    likes: 0,
    created_at: new Date().toISOString()
  };
  
  comments.push(newComment);
  writeJSON(COMMENTS_FILE, comments);
  
  res.json({ id: newComment.id });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});