import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FiSend, FiInfo, FiPhone, FiVideo, FiImage, FiSearch, FiArrowLeft, FiMoreHorizontal } from 'react-icons/fi';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // conversationId -> isTyping
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize Socket
  useEffect(() => {
    if (!currentUser) return;

    socketRef.current = io('http://localhost:3000');

    socketRef.current.emit('join', currentUser.username);

    socketRef.current.on('get_online_users', (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on('receive_message', (data) => {
      // If the message is for the active conversation, add it to the list
      if (activeConversation && data.conversationId === activeConversation._id) {
        setMessages(prev => [...prev, data]);
        markAsRead();
        scrollToBottom();
      }
      
      // Update conversations list with last message
      setConversations(prev => prev.map(conv => {
        if (conv._id === data.conversationId) {
          return { ...conv, lastMessage: data.text || "Sent an image", updatedAt: new Date().toISOString() };
        }
        return conv;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    });

    socketRef.current.on('user_typing', (data) => {
      if (activeConversation && data.sender === activeConversation.otherUser.username) {
        setTypingUsers(prev => ({ ...prev, [data.sender]: data.isTyping }));
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [currentUser, activeConversation]);

  // Fetch Conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;
      try {
        const res = await api.get(`/conversations/${currentUser.username}`);
        setConversations(res.data);
        
        // If we came from a profile "Message" button
        if (location.state?.initialConversation) {
          const initial = location.state.initialConversation;
          // Check if it already exists in the list
          const exists = res.data.find(c => c._id === initial._id);
          if (!exists) {
            // Need to fetch otherUser info if it's new
            const otherUsername = initial.members.find(m => m !== currentUser.username);
            const userRes = await api.get(`/profile/${otherUsername}`);
            const enriched = { ...initial, otherUser: userRes.data };
            setConversations(prev => [enriched, ...prev]);
            setActiveConversation(enriched);
          } else {
            setActiveConversation(exists);
          }
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [currentUser, location.state]);

  // Fetch Messages when active conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversation) return;
      setMessagesLoading(true);
      try {
        const res = await api.get(`/messages/${activeConversation._id}`);
        setMessages(res.data);
        
        // Mark as read
        await api.patch(`/messages/read/${activeConversation._id}`, { username: currentUser.username });
        
        setTimeout(scrollToBottom, 50);
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setMessagesLoading(false);
      }
    };
    fetchMessages();
  }, [activeConversation, currentUser.username]);

  const markAsRead = async () => {
    if (activeConversation) {
      try {
        await api.patch(`/messages/read/${activeConversation._id}`, { username: currentUser.username });
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e, imageFile = null) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !imageFile) return;

    const tempMsg = {
      conversationId: activeConversation._id,
      sender: currentUser.username,
      receiver: activeConversation.otherUser.username,
      text: inputMessage,
      createdAt: new Date().toISOString(),
      isTemp: true
    };

    // Optimistic UI
    if (!imageFile) {
        setMessages(prev => [...prev, tempMsg]);
        setInputMessage('');
        setTimeout(scrollToBottom, 10);
    }

    try {
      const formData = new FormData();
      formData.append('conversationId', activeConversation._id);
      formData.append('sender', currentUser.username);
      formData.append('receiver', activeConversation.otherUser.username);
      formData.append('text', inputMessage);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await api.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Emit to socket
      socketRef.current.emit('send_message', res.data);

      // Replace temp message with real one if it was text
      if (!imageFile) {
          setMessages(prev => prev.map(m => m.isTemp ? res.data : m));
      } else {
          setMessages(prev => [...prev, res.data]);
          setTimeout(scrollToBottom, 10);
      }

      // Update conversations list
      setConversations(prev => prev.map(conv => {
        if (conv._id === activeConversation._id) {
          return { ...conv, lastMessage: res.data.text || "Sent an image", updatedAt: new Date().toISOString() };
        }
        return conv;
      }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);

    if (!activeConversation) return;

    socketRef.current.emit('typing', {
      sender: currentUser.username,
      receiver: activeConversation.otherUser.username,
      isTyping: true
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing', {
        sender: currentUser.username,
        receiver: activeConversation.otherUser.username,
        isTyping: false
      });
    }, 2000);
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/users/search?q=${val}`);
      setSearchResults(res.data.filter(u => u.username !== currentUser.username));
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const startNewChat = async (targetUser) => {
    try {
      const res = await api.post('/conversations', {
        sender: currentUser.username,
        receiver: targetUser.username
      });
      const enriched = { ...res.data, otherUser: targetUser };
      
      // Add to list if not present
      if (!conversations.find(c => c._id === res.data._id)) {
        setConversations(prev => [enriched, ...prev]);
      }
      
      setActiveConversation(enriched);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    } catch (err) {
      console.error("Error starting new chat:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleSendMessage(null, file);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen lg:h-screen py-0 md:py-4 lg:py-6 px-0 md:px-4 max-w-6xl mx-auto flex overflow-hidden">
      <div className="bg-white w-full flex rounded-none md:rounded-2xl shadow-none md:shadow-xl border-none md:border border-gray-100 overflow-hidden relative">
        
        {/* Sidebar / Conversations List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-white ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-xl text-gray-900 truncate">{currentUser?.username}</h2>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FiMoreHorizontal className="text-xl text-gray-600" />
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="relative group">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-pink-500/20 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isSearching ? (
              <div className="p-2 space-y-1">
                <p className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-widest">Search Results</p>
                {searchResults.map(user => (
                  <div 
                    key={user._id} 
                    onClick={() => startNewChat(user)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full border border-gray-100 overflow-hidden shrink-0">
                      <img src={user.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{user.username}</p>
                      <p className="text-xs text-gray-500 truncate">{user.bio || 'Instagram user'}</p>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-4">No users found</p>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                <p className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-widest">Messages</p>
                {conversations.map((conv) => {
                  const isOnline = onlineUsers.includes(conv.otherUser.username);
                  return (
                    <div 
                      key={conv._id} 
                      onClick={() => {
                        setActiveConversation(conv);
                        // Optimistically clear unread count
                        setConversations(prev => prev.map(c => 
                          c._id === conv._id ? { ...c, unreadCount: 0 } : c
                        ));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeConversation?._id === conv._id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-12 h-12 rounded-full border border-gray-100 overflow-hidden ${isOnline ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
                          <img 
                            src={conv.otherUser.pfp_url ? `${conv.otherUser.pfp_url}?t=${Date.now()}` : `https://api.dicebear.com/7.x/notionists/svg?seed=${conv.otherUser.username}`} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-700 font-medium'}`}>
                            {conv.otherUser.username}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {format(new Date(conv.updatedAt), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                           <p className={`text-xs truncate flex-1 ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                             {conv.lastMessage || 'Start a conversation'}
                           </p>
                           {conv.unreadCount > 0 && (
                             <span className="w-5 h-5 bg-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0">
                               {conv.unreadCount}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {conversations.length === 0 && (
                  <div className="text-center py-20 px-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiSend className="text-3xl text-gray-300" />
                    </div>
                    <h3 className="font-bold text-gray-900">Direct Messages</h3>
                    <p className="text-xs text-gray-500 mt-2">Send private photos and messages to a friend.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 bg-white border-b border-gray-100 flex justify-between items-center z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveConversation(null)}
                    className="p-2 md:hidden hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <FiArrowLeft className="text-xl" />
                  </button>
                  <div 
                    onClick={() => navigate(`/profile/${activeConversation.otherUser.username}`)}
                    className="relative shrink-0 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full border border-gray-50 overflow-hidden">
                      <img 
                        src={activeConversation.otherUser.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${activeConversation.otherUser.username}`} 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                  <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${activeConversation.otherUser.username}`)}>
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {activeConversation.otherUser.username}
                    </p>
                    {typingUsers[activeConversation.otherUser.username] ? (
                        <p className="text-[10px] text-pink-600 font-semibold animate-pulse italic">Typing...</p>
                    ) : onlineUsers.includes(activeConversation.otherUser.username) ? (
                        <p className="text-[10px] text-green-500 font-medium">Active now</p>
                    ) : (
                        <p className="text-[10px] text-gray-400">Offline</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                   <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                     <FiPhone className="text-xl" />
                   </button>
                   <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                     <FiVideo className="text-xl" />
                   </button>
                   <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                     <FiInfo className="text-xl" />
                   </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2 bg-[#fafafa] custom-scrollbar">
                {messagesLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center py-10 mb-4">
                       <div className="w-20 h-20 rounded-full border-2 border-gray-100 overflow-hidden mb-3">
                         <img src={activeConversation.otherUser.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${activeConversation.otherUser.username}`} alt="" className="w-full h-full object-cover" />
                       </div>
                       <h4 className="font-bold text-lg text-gray-900">{activeConversation.otherUser.username}</h4>
                       <p className="text-xs text-gray-500 mt-1 italic">{activeConversation.otherUser.bio || 'Instagram user'}</p>
                       <button 
                         onClick={() => navigate(`/profile/${activeConversation.otherUser.username}`)}
                         className="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-xs font-bold transition-colors"
                       >
                         View Profile
                       </button>
                    </div>

                    <div className="space-y-4">
                      {messages.map((msg, idx) => {
                        const isMe = msg.sender === currentUser?.username;
                        const showAvatar = !isMe && (idx === 0 || messages[idx-1].sender !== msg.sender);
                        
                        return (
                          <div key={msg._id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {!isMe && (
                              <div className="w-8 mr-2 flex items-end">
                                {showAvatar && (
                                  <img 
                                    src={activeConversation.otherUser.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${activeConversation.otherUser.username}`} 
                                    alt="" 
                                    className="w-7 h-7 rounded-full border border-gray-100 mb-1" 
                                  />
                                )}
                              </div>
                            )}
                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                               <div 
                                 className={`px-4 py-2.5 rounded-[20px] text-sm shadow-sm transition-all duration-300 ${
                                   isMe 
                                   ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 text-white rounded-br-none' 
                                   : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                 }`}
                               >
                                 {msg.image && (
                                   <div className="mb-2 rounded-xl overflow-hidden max-w-full">
                                      <img src={msg.image} alt="Sent image" className="w-full h-auto object-cover max-h-80" />
                                   </div>
                                 )}
                                 {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                               </div>
                               <div className={`flex items-center gap-1 mt-1 ${isMe ? 'flex-row-reverse mr-2' : 'ml-2'}`}>
                                  <p className="text-[9px] text-gray-400">
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                  </p>
                                  {isMe && (
                                    <span className={`text-[10px] font-bold ${msg.isRead ? 'text-pink-500' : 'text-gray-300'}`}>
                                      {msg.isRead ? 'Seen' : '✔'}
                                    </span>
                                  )}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                  <div className="flex-1 relative flex items-center">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className="absolute left-3 p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                      <FiImage className="text-xl" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <input
                      type="text"
                      placeholder="Message..."
                      className="w-full bg-gray-50 border border-gray-100 focus:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-500/10 rounded-[24px] pl-12 pr-4 py-3 text-sm transition-all outline-none"
                      value={inputMessage}
                      onChange={handleTyping}
                    />
                  </div>
                  
                  <AnimatePresence>
                    {inputMessage.trim() && (
                      <motion.button 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        type="submit"
                        className="p-3 bg-pink-600 text-white rounded-full hover:bg-pink-700 shadow-md shadow-pink-500/20 active:scale-95 transition-all"
                      >
                        <FiSend className="text-lg translate-x-[1px]" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
               <div className="w-24 h-24 bg-white shadow-xl rounded-full flex items-center justify-center mb-6 text-pink-500 ring-8 ring-pink-50">
                 <FiSend className="text-4xl" />
               </div>
               <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Messages</h2>
               <p className="text-gray-500 max-w-sm">
                 Send private photos and messages to a friend or group. Select a conversation to start chatting.
               </p>
               <button 
                 onClick={() => {
                   const searchInput = document.querySelector('input[type="text"]');
                   if (searchInput) searchInput.focus();
                 }}
                 className="mt-8 px-6 py-2.5 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-colors shadow-lg shadow-pink-500/30"
               >
                 Send Message
               </button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}} />
    </div>
  );
};

export default Chat;
