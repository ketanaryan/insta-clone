import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FiClock, FiHeart, FiMessageCircle, FiChevronLeft, FiGrid } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const YourActivity = () => {
  const { currentUser, timeSpentToday } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('time');
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Total time = historical data from backend + current session time from context
  const displayTime = (activityData?.timeSpent?.totalMinutes || 0) + timeSpentToday;

  useEffect(() => {
    const fetchActivity = async () => {
      if (!currentUser) return;
      try {
        const res = await api.get(`/activity/${currentUser.username}`);
        setActivityData(res.data);
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [currentUser]);

  const tabs = [
    { id: 'time', label: 'Time Spent', icon: <FiClock /> },
    { id: 'likes', label: 'Interactions', icon: <FiHeart /> },
    { id: 'comments', label: 'Comments', icon: <FiMessageCircle /> }
  ];

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-4 md:py-8 px-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <FiChevronLeft className="text-2xl" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Your Activity</h2>
      </div>

      <p className="text-gray-500 mb-8 text-sm md:text-base">
        One place to manage your activity on InstaVibe. See how you've spent your time and what you've interacted with.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative shrink-0 ${
              activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabActivity"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'time' && (
            <motion.div
              key="time"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
                <p className="text-gray-500 font-medium mb-2 uppercase tracking-widest text-xs">Daily Average (This Session)</p>
                <h3 className="text-5xl font-black text-gray-900 flex justify-center items-baseline gap-2">
                  {displayTime}
                  <span className="text-sm font-bold text-gray-400 uppercase">min</span>
                </h3>
                <p className="text-gray-400 text-sm mt-4">
                  The time you spend on InstaVibe each day using this app.
                </p>
              </div>

              <div className="bg-pink-50/50 p-6 rounded-3xl border border-pink-100">
                <h4 className="font-bold text-pink-700 mb-2">Did you know?</h4>
                <p className="text-pink-600/80 text-sm">
                  Setting a daily reminder can help you manage your time effectively. You can set it from the settings page.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'likes' && (
            <motion.div
              key="likes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {activityData?.likedPosts?.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {activityData.likedPosts.map((post) => (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      key={post._id} 
                      className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group"
                    >
                      <img src={post.file_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <FiHeart className="text-white text-2xl fill-white" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                      <FiHeart className="text-2xl text-gray-400" />
                   </div>
                   <h3 className="font-bold text-gray-900">No Liked Posts</h3>
                   <p className="text-gray-500 text-sm mt-2">Posts you like will appear here.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'comments' && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {activityData?.comments?.length > 0 ? (
                activityData.comments.map((comment, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                      <img src={comment.postImage} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 leading-tight">
                        <span className="font-bold">You</span> commented: "{comment.text}"
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
                        {format(new Date(comment.createdAt), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                      <FiMessageCircle className="text-2xl text-gray-400" />
                   </div>
                   <h3 className="font-bold text-gray-900">No Comments Yet</h3>
                   <p className="text-gray-500 text-sm mt-2">Your comments on posts will appear here.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default YourActivity;
