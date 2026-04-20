import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FiGrid, FiBookmark, FiSettings, FiEdit2, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import PostCard from '../components/PostCard';

import { useNavigate, useParams } from 'react-router-dom';

const Profile = () => {
  const { currentUser, logout, refreshCurrentUser } = useContext(AuthContext);
  const { username: paramUsername } = useParams();
  const navigate = useNavigate();
  
  const targetUsername = paramUsername || currentUser?.username;
  const isMe = targetUsername === currentUser?.username;

  const [myPosts, setMyPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [bio, setBio] = useState('Hello! Welcome to my profile. 🌟 Capturing moments.');
  const [tempBio, setTempBio] = useState('');
  
  const [pfp, setPfp] = useState('');
  const [tempPfp, setTempPfp] = useState('');
  const [pfpFile, setPfpFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!targetUsername) return;
      try {
        const response = await api.get(`/files?username=${targetUsername}&currentUsername=${currentUser?.username}`);
        const data = response.data.files || response.data || [];
        const sorted = Array.isArray(data) ? data.sort((a, b) => new Date(b.upload_time || b.createdAt) - new Date(a.upload_time || a.createdAt)) : [];
        setMyPosts(sorted);
        setIsPrivateAccount(false);
      } catch (error) {
        if (error.response?.status === 403) {
          setIsPrivateAccount(true);
          setMyPosts([]);
        }
        console.error("Error fetching user posts:", error);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchProfileData = async () => {
      if (!targetUsername) return;
      try {
        const response = await api.get(`/profile/${targetUsername}`);
        if(response.data) {
           setProfileData(response.data);
           if(response.data.bio) {
             setBio(response.data.bio);
             setTempBio(response.data.bio);
           }
           if(response.data.pfp_url) {
             const timestamped = `${response.data.pfp_url}?t=${Date.now()}`;
             setPfp(timestamped);
             setTempPfp(timestamped);
           }
           if (response.data.followers && currentUser) {
             setIsFollowing(response.data.followers.includes(currentUser.username));
           }
        }
      } catch (err) {
        console.error("Error fetching profile via remote:", err);
      }
    };
    
    fetchMyPosts();
    fetchProfileData();
    
    if (isMe) {
      const storageKey = `saved_posts_${currentUser?.username}`;
      const localSaved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setSavedPosts(localSaved);
    }
    
  }, [targetUsername, currentUser, activeTab, isMe]);

  const handleFollow = async () => {
    try {
      const res = await api.post('/follow', {
        currentUsername: currentUser.username,
        targetUsername: targetUsername
      });
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        // Refresh profile data to get updated counts
        const response = await api.get(`/profile/${targetUsername}`);
        setProfileData(response.data);
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const handleMessage = async () => {
    try {
      const res = await api.post('/conversations', {
        sender: currentUser.username,
        receiver: targetUsername
      });
      if (res.data) {
        navigate('/chat', { state: { initialConversation: res.data } });
      }
    } catch (err) {
      console.error("Message error:", err);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('username', currentUser.username);
      formData.append('bio', tempBio);
      if (pfpFile) {
         formData.append('pfp', pfpFile);
      }
      
      const res = await api.post('/profile/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if(res.data.success) {
         setBio(res.data.profile.bio);
         if(res.data.profile.pfp_url) {
            const timestamped = `${res.data.profile.pfp_url}?t=${Date.now()}`;
            setPfp(timestamped);
         }
         setIsEditing(false);
         // Sync Globally
         await refreshCurrentUser();
      }
    } catch(err) {
      console.error("Failed to update remote profile", err);
      alert("Failed to upload to Cloudinary/MongoDB");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-full">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        {/* Avatar */}
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-1 shrink-0">
          <div className="w-full h-full bg-white rounded-full overflow-hidden border-4 border-white">
            <img 
              src={pfp || `https://api.dicebear.com/7.x/notionists/svg?seed=${targetUsername}`} 
              alt="avatar" 
              className="w-full h-full object-cover bg-gray-50"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 justify-center md:justify-start">
            <h2 className="text-2xl font-medium text-gray-900">{targetUsername}</h2>
            <div className="flex gap-2 justify-center">
              {isMe ? (
                <>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                  >
                    <FiEdit2 /> Edit profile
                  </button>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors cursor-pointer"
                    title="Settings"
                  >
                    <FiSettings />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleFollow}
                    className={`px-6 py-1.5 rounded-lg font-semibold text-sm transition-colors ${isFollowing ? 'bg-gray-200 text-gray-900' : 'bg-pink-600 text-white hover:bg-pink-700'}`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button 
                    onClick={handleMessage}
                    className="px-6 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-6 justify-center md:justify-start mb-4 text-gray-900">
            <p><span className="font-semibold text-lg">{myPosts.length}</span> posts</p>
            <p><span className="font-semibold text-lg">{profileData?.followers?.length || 0}</span> followers</p>
            <p><span className="font-semibold text-lg">{profileData?.following?.length || 0}</span> following</p>
          </div>

          <div className="max-w-md mx-auto md:mx-0">
            <p className="font-medium text-sm text-gray-900">{targetUsername}</p>
            <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{bio}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-gray-200 flex justify-center gap-12">
        <div 
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 py-4 font-semibold cursor-pointer transition-colors ${activeTab === 'posts' ? 'border-t-2 border-gray-900 text-gray-900' : 'border-t-2 border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          <FiGrid />
          <span className="text-sm uppercase tracking-widest hidden md:block">Posts</span>
        </div>
        <div 
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-2 py-4 font-semibold cursor-pointer transition-colors ${activeTab === 'saved' ? 'border-t-2 border-gray-900 text-gray-900' : 'border-t-2 border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          <FiBookmark />
          <span className="text-sm uppercase tracking-widest hidden md:block">Saved</span>
        </div>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="flex justify-center mt-10">
           <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : isPrivateAccount ? (
        <div className="mt-8 py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm px-6 text-center">
           <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <FiX className="text-4xl text-gray-400" />
           </div>
           <h3 className="text-xl font-black text-gray-900">This account is private</h3>
           <p className="text-gray-500 mt-2 max-w-xs">Follow this account to see their photos and videos.</p>
        </div>
      ) : activeTab === 'posts' && myPosts.length === 0 ? (
        <div className="mt-8 py-16 flex flex-col items-center justify-center bg-white/50 backdrop-blur-md rounded-3xl border border-gray-100/60">
           <div className="w-24 h-24 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
             <FiGrid className="text-5xl text-gray-400" />
           </div>
           <h3 className="text-xl font-bold text-gray-900">No Posts Yet</h3>
           <p className="text-gray-500 mt-2">When you share posts, they will appear on your profile.</p>
        </div>
      ) : activeTab === 'saved' && savedPosts.length === 0 ? (
        <div className="mt-8 py-16 flex flex-col items-center justify-center bg-white/50 backdrop-blur-md rounded-3xl border border-gray-100/60">
           <div className="w-24 h-24 bg-gradient-to-tr from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
             <FiBookmark className="text-5xl text-gray-400" />
           </div>
           <h3 className="text-xl font-bold text-gray-900">No Saved Posts</h3>
           <p className="text-gray-500 mt-2">Posts you save will appear securely here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4 mt-4">
          {(activeTab === 'posts' ? myPosts : savedPosts).map((post) => {
            const imageUrl = post.file_url || post.imageUrl || post.image || post.path;
            const imageSrc = imageUrl?.startsWith('http') ? imageUrl : `http://localhost:3000/${imageUrl?.replace(/\\/g, '/')}`;
            
            return (
              <motion.div 
                whileHover={{ opacity: 0.9, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                key={post._id || post.id || Math.random()} 
                onClick={() => setSelectedPost(post)}
                className="aspect-square bg-gray-100 overflow-hidden relative cursor-pointer rounded-xl group/grid"
              >
                <img 
                  src={imageSrc} 
                  alt="post" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/grid:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/grid:bg-black/10 transition-colors"></div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] overflow-y-auto flex items-center justify-center p-4 py-20"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedPost(null);
            }}
          >
             <div className="relative w-full max-w-[500px]">
               <button 
                 onClick={() => setSelectedPost(null)}
                 className="absolute -top-14 right-0 md:-right-12 text-white hover:text-white/70 p-2 transition-colors focus:outline-none"
               >
                 <FiX className="text-4xl drop-shadow-lg" />
               </button>
               <div className="shadow-2xl rounded-[28px] overflow-hidden">
                 <PostCard 
                   post={selectedPost} 
                   onDelete={async (id) => {
                     try {
                       await api.delete(`/delete/${id}`);
                       setMyPosts(myPosts.filter(p => (p._id || p.id) !== id));
                       setSavedPosts(savedPosts.filter(p => (p._id || p.id) !== id));
                       setSelectedPost(null);
                     } catch(err) {
                       console.error("Delete failed", err);
                     }
                   }} 
                 />
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-900">Edit Profile</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                  <FiX className="text-xl" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex flex-col items-center mb-6">
                   <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] mb-3 group cursor-pointer" onClick={() => document.getElementById('pfp-upload').click()}>
                     <img src={tempPfp || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.username}`} className="w-full h-full object-cover rounded-full bg-white border border-white" alt="avatar" />
                     <div className="absolute inset-x-0 bottom-0 top-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <FiEdit2 className="text-white text-xl" />
                     </div>
                   </div>
                   <input type="file" id="pfp-upload" className="hidden" accept="image/*" onChange={(e) => {
                     const file = e.target.files[0];
                     if(file) {
                       setPfpFile(file);
                       const reader = new FileReader();
                       reader.onloadend = () => setTempPfp(reader.result);
                       reader.readAsDataURL(file);
                     }
                   }} />
                   <button onClick={() => document.getElementById('pfp-upload').click()} className="text-sm font-semibold text-pink-600 hover:text-pink-700">Change Profile Photo</button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Username</label>
                  <input type="text" value={currentUser?.username} disabled className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 font-medium cursor-not-allowed" />
                  <p className="text-[10px] text-gray-400 mt-1">Username changes require an account migration.</p>
                </div>
                
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Bio</label>
                  <textarea 
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all resize-none h-24" 
                    placeholder="Write something about yourself..."
                  />
                </div>
                
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 transition-opacity text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 disabled:opacity-50"
                >
                  {isSaving ? 'Uploading to Cloudinary...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-900">Settings</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                  <FiX className="text-xl" />
                </button>
              </div>
              
              <div className="flex flex-col py-2">
                 <button 
                   onClick={() => {
                     setShowSettings(false);
                     navigate('/activity');
                   }}
                   className="px-6 py-4 text-left hover:bg-gray-50 flex flex-col transition-all active:scale-95"
                 >
                    <span className="font-bold text-gray-900">Your Activity</span>
                    <span className="text-xs text-gray-500">Manage time, likes, and comments</span>
                 </button>
                 
                 <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group" onClick={async () => {
                   const newVal = !profileData?.isPrivate;
                   try {
                     const res = await api.patch('/profile/privacy', {
                       username: currentUser.username,
                       isPrivate: newVal
                     });
                     if (res.data.success) {
                       setProfileData(prev => ({ ...prev, isPrivate: newVal }));
                       alert(`Account is now ${newVal ? 'Private' : 'Public'}!`);
                     }
                   } catch(err) {
                     console.error("Privacy toggle error:", err);
                   }
                 }}>
                    <div className="flex flex-col">
                       <span className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors">Private Account</span>
                       <span className="text-xs text-gray-500">Only followers can see your posts</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${profileData?.isPrivate ? 'bg-pink-500' : 'bg-gray-200'}`}>
                       <motion.div 
                         animate={{ x: profileData?.isPrivate ? 24 : 4 }}
                         className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" 
                       />
                    </div>
                 </div>

                 <button className="px-6 py-3 text-left hover:bg-gray-50 flex flex-col transition-colors">
                    <span className="font-semibold text-gray-800">Change Username</span>
                    <span className="text-xs text-gray-500">Currently: {currentUser?.username}</span>
                 </button>
                 <div className="h-[1px] bg-gray-100 my-2"></div>
                 <button 
                   onClick={async () => {
                     await logout();
                     navigate('/login');
                   }}
                   className="px-6 py-3 text-left hover:bg-red-50 text-red-600 font-bold transition-colors"
                 >
                   Log Out
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
