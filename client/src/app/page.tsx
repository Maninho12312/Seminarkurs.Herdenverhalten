'use client';

import { useState, useEffect } from 'react';

interface Post {
  id: number;
  text: string | null;
  image: string | null;
  created_at: string;
  likes: number;
}

interface Comment {
  id: number;
  post_id: number;
  user_name: string;
  text: string;
  likes: number;
  created_at: string;
}

const API_BASE = 'https://seminarkurs-herden-backend-ffd2625dfe57.herokuapp.com/api';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    // Load user data
    const storedName = localStorage.getItem('userName');
    const storedId = localStorage.getItem('userId') || crypto.randomUUID();
    const storedLikedPosts = JSON.parse(localStorage.getItem('likedPosts') || '[]');
    const storedLikedComments = JSON.parse(localStorage.getItem('likedComments') || '[]');

    setUserName(storedName || '');
    setUserId(storedId);
    setLikedPosts(new Set(storedLikedPosts));
    setLikedComments(new Set(storedLikedComments));

    localStorage.setItem('userId', storedId);

    // Fetch posts
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const res = await fetch(`${API_BASE}/posts`);
    const data = await res.json();
    setPosts(data);
  };

  const handleNameSubmit = () => {
    localStorage.setItem('userName', userName);
  };

  const likePost = async (postId: number) => {
    if (likedPosts.has(postId)) return;
    await fetch(`${API_BASE}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, post_id: postId, type: 'post' }),
    });
    setLikedPosts(prev => new Set([...prev, postId]));
    localStorage.setItem('likedPosts', JSON.stringify([...likedPosts, postId]));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
  };

  const likeComment = async (commentId: number, refetch: () => void) => {
    if (likedComments.has(commentId)) return;
    await fetch(`${API_BASE}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, comment_id: commentId, type: 'comment' }),
    });
    setLikedComments(prev => new Set([...prev, commentId]));
    localStorage.setItem('likedComments', JSON.stringify([...likedComments, commentId]));
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Feed</h1>
          {!userName && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Dein Name (optional)"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <button onClick={handleNameSubmit} className="mt-2 w-full bg-blue-500 text-white p-2 rounded">
                Speichern
              </button>
            </div>
          )}
          <button onClick={() => setShowAdmin(!showAdmin)} className="mt-2 text-sm text-gray-500">
            Admin
          </button>
        </div>

        {/* Admin Panel */}
        {showAdmin && <AdminPanel onPostCreated={fetchPosts} />}

        {/* Feed */}
        <div className="divide-y">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userName={userName || 'Anonym'}
              userId={userId}
              likedPosts={likedPosts}
              likedComments={likedComments}
              onLikePost={likePost}
              onLikeComment={likeComment}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ onPostCreated }: { onPostCreated: () => void }) {
  const [password, setPassword] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);

  const createPost = async () => {
    const formData = new FormData();
    formData.append('password', password);
    formData.append('text', text);
    if (image) formData.append('image', image);

    await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      body: formData,
    });
    onPostCreated();
    setText('');
    setImage(null);
  };

  return (
    <div className="p-4 border-b bg-gray-50">
      <input
        type="password"
        placeholder="Admin Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded mb-2"
      />
      <textarea
        placeholder="Post Text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-2 border rounded mb-2"
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
        className="mb-2"
      />
      <button onClick={createPost} className="w-full bg-green-500 text-white p-2 rounded">
        Post erstellen
      </button>
    </div>
  );
}

function PostCard({ post, userName, userId, likedPosts, likedComments, onLikePost, onLikeComment }: {
  post: Post & { comments?: Comment[] };
  userName: string;
  userId: string;
  likedPosts: Set<number>;
  likedComments: Set<number>;
  onLikePost: (id: number) => void;
  onLikeComment: (id: number, refetch: () => void) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const fetchComments = async () => {
    const res = await fetch(`${API_BASE}/posts/${post.id}/comments`);
    const data = await res.json();
    setComments(data);
  };

  const addComment = async () => {
    await fetch(`${API_BASE}/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName, text: newComment }),
    });
    setNewComment('');
    fetchComments();
  };

  return (
    <div className="p-4">
      {post.text && <p className="mb-2">{post.text}</p>}
    {post.image && <img src={`https://seminarkurs-herden-backend-ffd2625dfe57.herokuapp.com/uploads/${post.image}`} alt="Post" className="w-full mb-2" />}
      <div className="flex justify-between items-center">
        <button onClick={() => onLikePost(post.id)} disabled={likedPosts.has(post.id)} className="text-blue-500">
          Like ({post.likes})
        </button>
        <button onClick={() => setShowComments(!showComments)} className="text-gray-500">
          Comments ({comments.length})
        </button>
      </div>
      {showComments && (
        <div className="mt-4 border-t pt-4">
          {comments.map(comment => (
            <div key={comment.id} className="mb-2 p-2 bg-gray-50 rounded">
              <p><strong>{comment.user_name}:</strong> {comment.text}</p>
              <button onClick={() => onLikeComment(comment.id, fetchComments)} disabled={likedComments.has(comment.id)} className="text-red-500">
                Like ({comment.likes})
              </button>
            </div>
          ))}
          <textarea
            placeholder="Kommentar hinzufügen"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full p-2 border rounded mt-2"
          />
          <button onClick={addComment} className="mt-2 bg-blue-500 text-white p-2 rounded">
            Kommentieren
          </button>
        </div>
      )}
    </div>
  );
}
