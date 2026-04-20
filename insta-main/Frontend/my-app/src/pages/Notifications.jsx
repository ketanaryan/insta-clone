import React, { useState, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiMessageCircle, FiUserPlus, FiCheck, FiX, FiCheckCircle, FiBell } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const typeIcon = (type) => {
  switch (type) {
    case 'like': return <FaHeart className="text-pink-500 text-sm" />;
    case 'comment': return <FiMessageCircle className="text-purple-500 text-sm" />;
    case 'follow': return <FiUserPlus className="text-blue-500 text-sm" />;
    case 'follow_request': return <FiUserPlus className="text-orange-500 text-sm" />;
    case 'follow_accept': return <FiCheckCircle className="text-green-500 text-sm" />;
    default: return <FiBell className="text-gray-400 text-sm" />;
  }
};

const typeBg = (type) => {
  switch (type) {
    case 'like': return 'bg-pink-100';
    case 'comment': return 'bg-purple-100';
    case 'follow': return 'bg-blue-100';
    case 'follow_request': return 'bg-orange-100';
    case 'follow_accept': return 'bg-green-100';
    default: return 'bg-gray-100';
  }
};

const Notifications = () => {
  const { currentUser } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.username) return;
    try {
      const res = await api.get(`/notifications/${currentUser.username}`);
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
    // Mark all as read after 2 seconds
    const timer = setTimeout(async () => {
      if (currentUser?.username) {
        try {
          await api.patch(`/notifications/read-all/${currentUser.username}`);
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (_) {}
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [fetchNotifications, currentUser]);

  const handleAccept = async (notif) => {
    setActionLoading(prev => ({ ...prev, [notif._id]: 'accepting' }));
    try {
      await api.post('/accept-request', {
        currentUsername: currentUser.username,
        requesterUsername: notif.senderUsername
      });
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
    } catch (err) {
      console.error(err);
    }
    setActionLoading(prev => ({ ...prev, [notif._id]: null }));
  };

  const handleReject = async (notif) => {
    setActionLoading(prev => ({ ...prev, [notif._id]: 'rejecting' }));
    try {
      await api.post('/reject-request', {
        currentUsername: currentUser.username,
        requesterUsername: notif.senderUsername
      });
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
    } catch (err) {
      console.error(err);
    }
    setActionLoading(prev => ({ ...prev, [notif._id]: null }));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} new</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500/10 to-purple-500/10 flex items-center justify-center">
          <FiBell className="text-xl text-pink-500" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-md rounded-3xl border border-gray-100"
        >
          <div className="w-20 h-20 bg-gradient-to-tr from-pink-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
            <FiBell className="text-4xl text-pink-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-500 text-sm text-center">When someone likes, comments or follows you, you'll see it here.</p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {notifications.map((notif, idx) => (
              <motion.div
                key={notif._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0, margin: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center justify-between p-3 rounded-2xl transition-colors border
                  ${notif.isRead
                    ? 'bg-white/60 border-transparent hover:bg-gray-50/80'
                    : 'bg-blue-50/80 border-blue-100/60 hover:bg-blue-50'
                  }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar + type badge */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                      <img
                        src={notif.senderInfo?.pfp_url ? `${notif.senderInfo.pfp_url}?t=${Date.now()}` : `https://api.dicebear.com/7.x/notionists/svg?seed=${notif.senderUsername}`}
                        alt={notif.senderUsername}
                        className="w-full h-full rounded-full bg-white object-cover"
                      />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${typeBg(notif.type)}`}>
                      {typeIcon(notif.type)}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 leading-tight">
                      <span className="font-bold">{notif.senderUsername}</span>{' '}
                      <span className="text-gray-700">{notif.message?.replace(notif.senderUsername + ' ', '')}</span>
                    </p>
                    <span className="text-xs text-gray-400 font-medium mt-0.5 block">
                      {notif.createdAt
                        ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
                        : 'just now'}
                    </span>
                  </div>
                </div>

                {/* Right side — Accept/Reject for follow requests */}
                {notif.type === 'follow_request' && (
                  <div className="flex gap-2 shrink-0 ml-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAccept(notif)}
                      disabled={!!actionLoading[notif._id]}
                      className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      <FiCheck className="text-sm" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReject(notif)}
                      disabled={!!actionLoading[notif._id]}
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <FiX className="text-sm" />
                    </motion.button>
                  </div>
                )}

                {/* Unread dot */}
                {!notif.isRead && notif.type !== 'follow_request' && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 ml-2" />
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Notifications;
