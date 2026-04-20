import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { AuthContext } from '../context/AuthContext';
import { FiPlus } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import StoryViewer from '../components/StoryViewer';

const Feed = () => {
  const { currentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realStories, setRealStories] = useState([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const fileInputRef = useRef(null);

  const fetchPosts = async () => {
    try {
      const response = await api.get(`/files?currentUsername=${currentUser?.username}`);
      const data = response.data.files || response.data || [];
      const sorted = Array.isArray(data) ? data.sort((a, b) => new Date(b.upload_time || b.createdAt) - new Date(a.upload_time || a.createdAt)) : [];
      setPosts(sorted);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch posts. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await api.get(`/stories?username=${currentUser.username}`);
      setRealStories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch stories", err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, [currentUser]);

  const handleStoryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingStory(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('username', currentUser.username);

      await api.post('/stories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      fetchStories();
    } catch (err) {
      console.error("Story upload failed", err);
      alert("Failed to upload story");
    } finally {
      setIsUploadingStory(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/delete/${id}`);
      setPosts(posts.filter(post => (post._id || post.id) !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete the post');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-10 space-y-8">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-white/50 border border-gray-100 rounded-[28px] p-4 max-w-[500px] w-full mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="w-full aspect-square bg-gray-200 rounded-2xl mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto py-8 px-4 sm:px-0">
      
      {/* Stories Section */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-100/60 rounded-3xl p-4 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-x-auto hide-scrollbar">
        <div className="flex gap-4 items-center">
          {/* Add your story bubble */}
          <div 
            className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-100 ring-2 ring-offset-2 ring-gray-100">
               {isUploadingStory ? (
                 <div className="w-full h-full flex items-center justify-center bg-gray-50 animate-pulse">
                    <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
               ) : currentUser?.pfp_url ? (
                 <img 
                   src={`${currentUser.pfp_url}${currentUser.pfp_url.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                   className="w-full h-full object-cover bg-gray-50" 
                   alt="Your story" 
                 />
               ) : (
                 <img 
                   src={`https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.username}`} 
                   className="w-full h-full object-cover bg-gray-50" 
                   alt="Your story" 
                 />
               )}
               <div className="absolute inset-x-0 bottom-0 top-0 bg-black/10"></div>
               {!isUploadingStory && (
                 <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-[2px] border-2 border-white shadow-sm">
                   <FiPlus className="text-white text-xs" />
                 </div>
               )}
            </div>
            <span className="text-[11px] font-medium text-gray-500">Your story</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleStoryUpload} 
            />
          </div>

          {/* User Stories */}
          {realStories.map((story, idx) => (
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              key={story._id || idx} 
              className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
              onClick={() => setSelectedStoryIndex(idx)}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                 <div className="w-full h-full bg-white rounded-full p-[2px]">
                    <img 
                      src={story.author?.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${story.username}`} 
                      className="w-full h-full rounded-full object-cover bg-gray-50" 
                      alt="" 
                    />
                 </div>
              </div>
              <span className="text-[11px] font-medium text-gray-700 truncate w-16 text-center">
                {story.username}
              </span>
            </motion.div>
          ))}

          {realStories.length === 0 && (
            <div className="text-gray-300 text-[11px] italic px-4">No stories yet</div>
          )}
        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-3xl text-sm font-medium animate-shake text-center">
            {error}
          </div>
        )}

        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard 
              key={post._id || post.id} 
              post={post} 
              onDelete={handleDelete} 
            />
          ))
        ) : (
          <div className="bg-white/60 backdrop-blur-md border border-gray-100 rounded-[32px] p-16 text-center shadow-sm">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiPlus className="text-4xl text-gray-200" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">No Posts Yet</h3>
             <p className="text-gray-500 text-sm mb-8">Start sharing your moments with the world.</p>
             <button className="bg-pink-500 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-200">
               Create First Post
             </button>
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {selectedStoryIndex !== null && (
          <StoryViewer 
            stories={realStories}
            initialIndex={selectedStoryIndex}
            onClose={() => setSelectedStoryIndex(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default Feed;
