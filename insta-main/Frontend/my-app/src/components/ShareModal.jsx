import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLink, FiCheck } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { SiSnapchat } from 'react-icons/si';

const ShareModal = ({ post, onClose }) => {
  const [copied, setCopied] = useState(false);
  const postId = post._id || post.id;
  const postUrl = `${window.location.origin}/post/${postId}`;
  const shareText = `Check out this post on InstaVibe! 📸`;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = postUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'InstaVibe Post', text: shareText, url: postUrl });
        onClose();
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  const shareOptions = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <FaWhatsapp className="text-2xl text-[#25D366]" />,
      bg: 'bg-green-50 hover:bg-green-100',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + postUrl)}`, '_blank')
    },
    {
      id: 'snapchat',
      label: 'Snapchat',
      icon: <SiSnapchat className="text-2xl text-[#FFFC00]" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />,
      bg: 'bg-yellow-50 hover:bg-yellow-100',
      action: () => window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(postUrl)}`, '_blank')
    },
    {
      id: 'copy',
      label: copied ? 'Copied!' : 'Copy Link',
      icon: copied
        ? <FiCheck className="text-2xl text-green-500" />
        : <FiLink className="text-2xl text-gray-700" />,
      bg: copied ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100',
      action: handleCopyLink
    },
  ];

  const imageUrl = post.file_url || post.imageUrl || post.image || post.path;
  const imageSrc = imageUrl?.startsWith('http') ? imageUrl : `http://localhost:3000/${imageUrl?.replace(/\\/g, '/')}`;

  return (
    <AnimatePresence>
      <motion.div
        key="share-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-end md:items-center justify-center p-0 md:p-4"
      >
        <motion.div
          key="share-modal"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Handle bar (mobile) */}
          <div className="md:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-base text-gray-900">Share Post</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <FiX className="text-lg" />
            </button>
          </div>

          {/* Post Preview */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              <img src={imageSrc} alt="post" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">@{post.username}</p>
              {post.caption && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{post.caption}</p>
              )}
            </div>
          </div>

          {/* Share Options */}
          <div className="px-5 py-4 grid grid-cols-3 gap-3">
            {shareOptions.map(opt => (
              <motion.button
                key={opt.id}
                whileTap={{ scale: 0.92 }}
                onClick={opt.action}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${opt.bg}`}
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  {opt.icon}
                </div>
                <span className="text-xs font-semibold text-gray-700">{opt.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Native Share (if supported) */}
          {navigator.share && (
            <div className="px-5 pb-5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleNativeShare}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl text-sm hover:opacity-90 transition-opacity"
              >
                Share via…
              </motion.button>
            </div>
          )}

          {/* Link display */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500 truncate flex-1">{postUrl}</p>
              <button
                onClick={handleCopyLink}
                className="shrink-0 text-xs font-bold text-pink-600 hover:text-pink-700"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShareModal;
