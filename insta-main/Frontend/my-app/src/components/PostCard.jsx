import React, { useState, useContext } from 'react';
import { FiMessageCircle, FiSend, FiBookmark, FiMoreHorizontal, FiTrash2, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsModal from './CommentsModal';
import ShareModal from './ShareModal';

const PostCard = ({ post, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const [liked, setLiked] = useState(post.likes?.includes(currentUser?.username) || false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  // follow status: 'following' | 'requested' | 'none'
  const [followStatus, setFollowStatus] = useState(
    currentUser?.following?.includes(post.username) ? 'following' : 'none'
  );

  // ── Saved ──────────────────────────────────────────────────────────────────
  const storageKey = `saved_posts_${currentUser?.username}`;
  const getSavedPosts = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const [saved, setSaved] = useState(() =>
    getSavedPosts().some(p => (p._id || p.id) === (post._id || post.id))
  );

  const handleSaveToggle = () => {
    const isNowSaved = !saved;
    setSaved(isNowSaved);
    let savedPosts = getSavedPosts();
    if (isNowSaved) savedPosts.push(post);
    else savedPosts = savedPosts.filter(p => (p._id || p.id) !== (post._id || post.id));
    localStorage.setItem(storageKey, JSON.stringify(savedPosts));
  };

  // ── Like ───────────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!currentUser) return;
    const isLiking = !liked;
    setLiked(isLiking);
    setLikeCount(prev => isLiking ? prev + 1 : Math.max(0, prev - 1));
    if (isLiking) {
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 800);
    }
    try {
      await api.post(`/post/${post._id || post.id}/like`, {
        username: currentUser.username || currentUser.email || 'Anonymous'
      });
    } catch (err) {
      console.error('Failed to sync like', err);
    }
  };

  const handleDoubleTap = () => {
    if (!liked) handleLike();
    else {
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 800);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      setIsDeleting(true);
      await onDelete(post._id || post.id);
      setIsDeleting(false);
    }
  };

  // ── Follow ─────────────────────────────────────────────────────────────────
  const handleFollowToggle = async () => {
    if (!currentUser || !post.username) return;
    try {
      const res = await api.post('/follow', {
        currentUsername: currentUser.username,
        targetUsername: post.username
      });
      const { status } = res.data;
      if (status === 'followed') setFollowStatus('following');
      else if (status === 'unfollowed') setFollowStatus('none');
      else if (status === 'requested') setFollowStatus('requested');
      else if (status === 'request_cancelled') setFollowStatus('none');
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  // ── Image ──────────────────────────────────────────────────────────────────
  const imageUrl = post.file_url || post.imageUrl || post.image || post.path;
  const imageSrc = imageUrl?.startsWith('http') ? imageUrl : `http://localhost:3000/${imageUrl?.replace(/\\/g, '/')}`;
  const timeAgo = (post.upload_time || post.createdAt)
    ? formatDistanceToNow(new Date(post.upload_time || post.createdAt), { addSuffix: true })
    : 'Just now';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white/80 backdrop-blur-md border border-gray-100/60 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 overflow-hidden max-w-[500px] w-full mx-auto relative group"
      >
        {/* ── Header ── */}
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
              <img
                src={post.author?.pfp_url ? `${post.author.pfp_url}?t=${Date.now()}` : `https://api.dicebear.com/7.x/notionists/svg?seed=${post.username}`}
                alt="avatar"
                className="w-full h-full bg-white rounded-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[14px] text-gray-900 leading-tight hover:text-pink-600 transition-colors">
                  {post.username || 'unknown_user'}
                </h3>
                {currentUser?.username && post.username && currentUser?.username !== post.username && (
                  <>
                    <span className="text-gray-300 text-xs">•</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleFollowToggle}
                      className={`text-[13px] font-bold transition-colors flex items-center gap-1
                        ${followStatus === 'following' ? 'text-gray-400'
                          : followStatus === 'requested' ? 'text-orange-500'
                          : 'text-pink-600 hover:text-pink-700'}`}
                    >
                      {followStatus === 'following' && <><FiUserCheck className="text-xs" /> Following</>}
                      {followStatus === 'requested' && 'Requested'}
                      {followStatus === 'none' && <><FiUserPlus className="text-xs" /> Follow</>}
                    </motion.button>
                  </>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-[1px]">{timeAgo}</p>
            </div>
          </div>

          {/* Three dots menu */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none text-gray-500"
            >
              <FiMoreHorizontal className="text-xl" />
            </motion.button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 mt-2 w-40 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100/50 z-20 py-2"
                >
                  {currentUser?.username === post.username ? (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <FiTrash2 className="text-lg" /> {isDeleting ? 'Deleting…' : 'Delete Post'}
                    </button>
                  ) : (
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                      Report
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Image ── */}
        <div
          className="relative bg-gradient-to-br from-gray-100 to-gray-200 w-full aspect-square flex items-center justify-center overflow-hidden cursor-pointer"
          onDoubleClick={handleDoubleTap}
        >
          <img
            src={imageSrc}
            alt="Post"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <AnimatePresence>
            {showHeartOverlay && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.3, opacity: 0, transition: { duration: 0.3 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <FaHeart className="text-white text-9xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="p-4 pt-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-4">
              {/* Like */}
              <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="focus:outline-none">
                {liked ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }}>
                    <FaHeart className="text-3xl text-pink-500 drop-shadow-sm" />
                  </motion.div>
                ) : (
                  <FaRegHeart className="text-3xl text-gray-800 hover:text-gray-500 transition-colors" />
                )}
              </motion.button>

              {/* Comment — opens modal */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowComments(true)}
                className="focus:outline-none"
              >
                <FiMessageCircle className="text-3xl text-gray-800 hover:text-gray-500 transition-colors" />
              </motion.button>

              {/* Share — opens modal */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowShare(true)}
                className="focus:outline-none"
              >
                <FiSend className="text-3xl text-gray-800 hover:text-gray-500 transition-colors transform -rotate-12 mt-[-2px]" />
              </motion.button>
            </div>

            {/* Bookmark */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSaveToggle} className="focus:outline-none">
              <FiBookmark className={`text-3xl transition-colors ${saved ? 'text-gray-900 fill-current' : 'text-gray-800 hover:text-gray-500'}`} />
            </motion.button>
          </div>

          {/* Likes */}
          <p className="font-bold text-sm text-gray-900 mb-1 tracking-tight">{likeCount.toLocaleString()} likes</p>

          {/* Caption */}
          <div className="text-sm mt-1 leading-relaxed">
            <span className="font-bold text-gray-900 mr-2 cursor-pointer hover:underline">{post.username || 'unknown_user'}</span>
            <span className="text-gray-700 break-words">{post.caption}</span>
          </div>

          {/* Comments preview */}
          {comments.length > 0 ? (
            <button
              onClick={() => setShowComments(true)}
              className="text-sm text-gray-500 font-medium mt-2 hover:text-gray-400 transition-colors block text-left"
            >
              View all {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </button>
          ) : (
            <button
              onClick={() => setShowComments(true)}
              className="text-sm text-gray-400 font-medium mt-2 hover:text-gray-500 transition-colors block text-left"
            >
              No comments yet. Be the first!
            </button>
          )}

          {/* Quick comment input teaser */}
          <button
            onClick={() => setShowComments(true)}
            className="mt-3 flex items-center gap-3 w-full text-left"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
              <img
                src={currentUser?.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.username}`}
                className="w-full h-full bg-gray-100 object-cover"
                alt="me"
              />
            </div>
            <span className="text-sm text-gray-400 flex-1">Add a comment…</span>
          </button>
        </div>
      </motion.div>

      {/* ── Comments Modal ── */}
      {showComments && (
        <CommentsModal
          post={{ ...post, comments }}
          onClose={() => setShowComments(false)}
          onCommentAdded={(newComments) => setComments(newComments)}
        />
      )}

      {/* ── Share Modal ── */}
      {showShare && (
        <ShareModal
          post={post}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
};

export default PostCard;
