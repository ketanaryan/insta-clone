import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiTrash2, FiSend } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const CommentsModal = ({ post, onClose, onCommentAdded }) => {
  const { currentUser } = useContext(AuthContext);
  const [comments, setComments] = useState(post.comments || []);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const postId = post._id || post.id;

  // focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // scroll to bottom when new comment added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !currentUser || posting) return;
    const safeUsername = currentUser.username || currentUser.email || 'Anonymous';
    const optimistic = {
      id: Date.now().toString(),
      username: safeUsername,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    setComments(prev => [...prev, optimistic]);
    setText('');
    setPosting(true);
    try {
      const res = await api.post(`/post/${postId}/comment`, { username: safeUsername, text: optimistic.text });
      if (res.data.comments) setComments(res.data.comments);
      onCommentAdded?.(res.data.comments || [...comments, optimistic]);
    } catch (err) {
      console.error(err);
    }
    setPosting(false);
  };

  const handleDelete = async (commentId) => {
    setComments(prev => prev.filter(c => (c.id || c._id) !== commentId));
    // optimistic only — backend delete endpoint optional
  };

  const imageUrl = post.file_url || post.imageUrl || post.image || post.path;
  const imageSrc = imageUrl?.startsWith('http') ? imageUrl : `http://localhost:3000/${imageUrl?.replace(/\\/g, '/')}`;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-end md:items-center justify-center p-0 md:p-4"
      >
        {/* Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="bg-white w-full md:max-w-3xl md:h-[80vh] h-[90vh] rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
        >
          {/* Left — Image (desktop only) */}
          <div className="hidden md:block md:w-[45%] bg-black flex-shrink-0">
            <img src={imageSrc} alt="Post" className="w-full h-full object-cover" />
          </div>

          {/* Right — Comments */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                  <img
                    src={post.author?.pfp_url ? `${post.author.pfp_url}?t=${Date.now()}` : `https://api.dicebear.com/7.x/notionists/svg?seed=${post.username}`}
                    alt={post.username}
                    className="w-full h-full rounded-full bg-white object-cover"
                  />
                </div>
                <span className="font-bold text-sm text-gray-900">{post.username}</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="px-4 py-3 border-b border-gray-50 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0 mt-0.5">
                  <img
                    src={post.author?.pfp_url ? `${post.author.pfp_url}?t=${Date.now()}` : `https://api.dicebear.com/7.x/notionists/svg?seed=${post.username}`}
                    alt="" className="w-full h-full rounded-full bg-white object-cover"
                  />
                </div>
                <div>
                  <span className="font-bold text-sm text-gray-900 mr-2">{post.username}</span>
                  <span className="text-sm text-gray-700">{post.caption}</span>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 hide-scrollbar">
              {loading && (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-3 items-start animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-2.5 bg-gray-200 rounded w-24" />
                        <div className="h-2 bg-gray-200 rounded w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && comments.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                  <div className="text-5xl mb-3">💬</div>
                  <p className="font-semibold text-gray-500">No comments yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Be the first to comment!</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {comments.map((c, i) => (
                  <motion.div
                    key={c.id || c._id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    className="flex gap-3 items-start group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
                      <img
                        src={c.username === currentUser?.username && currentUser?.pfp_url ? currentUser.pfp_url : `https://api.dicebear.com/7.x/notionists/svg?seed=${c.username}`}
                        alt={c.username}
                        className="w-full h-full rounded-full bg-white object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-bold text-gray-900 mr-1.5">{c.username}</span>
                        <span className="text-gray-700 break-words">{c.text}</span>
                      </p>
                      <span className="text-[11px] text-gray-400 mt-0.5 block">
                        {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : 'Just now'}
                      </span>
                    </div>
                    {(c.username === currentUser?.username || post.username === currentUser?.username) && (
                      <button
                        onClick={() => handleDelete(c.id || c._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600 shrink-0"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 px-4 py-3 bg-white">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
                  <img
                    src={currentUser?.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.username}`}
                    alt="me"
                    className="w-full h-full rounded-full bg-white object-cover"
                  />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all placeholder-gray-400"
                />
                <motion.button
                  type="submit"
                  disabled={!text.trim() || posting}
                  whileTap={{ scale: 0.85 }}
                  className="p-2 bg-gradient-to-tr from-pink-500 to-purple-600 text-white rounded-full disabled:opacity-40 transition-opacity"
                >
                  <FiSend className="text-sm" />
                </motion.button>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommentsModal;
