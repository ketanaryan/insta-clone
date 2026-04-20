import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiHome, FiPlusSquare, FiMessageCircle, FiLogOut, FiMenu, FiX, FiSearch, FiHeart, FiSettings } from 'react-icons/fi';
import { FaInstagram } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import api from '../services/api';
import LogoutModal from './LogoutModal';

const Navbar = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (!currentUser?.username) return;
    
    const fetchCounts = async () => {
      try {
        // Notifications
        const resNotif = await api.get(`/notifications/${currentUser.username}`);
        const countNotif = (resNotif.data || []).filter(n => !n.isRead).length;
        setUnreadCount(countNotif);

        // Unread Messages
        const resDMs = await api.get(`/messages/unread-total/${currentUser.username}`);
        setUnreadMessages(resDMs.data.total || 0);
      } catch (_) {}
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000); // 15s polling fallback

    // Socket listener for instant updates
    const socket = io('http://localhost:3000');
    socket.emit('join', currentUser.username);
    socket.on('receive_message', () => {
       setUnreadMessages(prev => prev + 1);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [currentUser]);

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  if (!currentUser) return null;

  const NavLink = ({ to, icon: Icon, label, badge }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        onClick={() => { setMobileMenuOpen(false); if (to === '/notifications') setUnreadCount(0); }}
        className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 relative group
          ${isActive ? 'text-gray-900 font-bold' : 'text-gray-600 hover:bg-gray-50/50 hover:text-gray-900 font-medium'}`}
      >
        {isActive && (
          <motion.div 
            layoutId="nav-pill" 
            className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-2xl border border-pink-500/20 backdrop-blur-sm z-0" 
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: isActive ? 0 : -5 }}
              whileTap={{ scale: 0.95 }}
              className={`text-2xl ${isActive ? 'text-pink-600' : 'text-gray-700'}`}
            >
              <Icon />
            </motion.div>
            {badge > 0 && (
              <AnimatePresence>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md"
                >
                  {badge > 9 ? '9+' : badge}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          <span className="hidden lg:block text-base tracking-wide">{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 w-full bg-white/70 backdrop-blur-xl border-b border-gray-100 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
        <Link to="/" className="flex items-center gap-2 text-2xl font-black tracking-tighter">
          <FaInstagram className="text-pink-600 text-3xl" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400">InstaVibe</span>
        </Link>
        <div className="flex gap-4 items-center">
          <FiSearch className="text-2xl text-gray-700" />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-2xl text-gray-700 focus:outline-none">
            {mobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar / Mobile overlay menu */}
      <nav className={`fixed md:left-0 top-0 h-full bg-white/60 backdrop-blur-2xl border-r border-gray-100/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col pt-20 md:pt-0
        ${mobileMenuOpen ? 'left-0 w-64' : '-left-full w-64 md:left-0 md:w-20 lg:w-72'}
      `}>
        
        {/* Logo Area */}
        <div className="hidden md:flex items-center gap-3 px-6 py-10 mb-2">
          <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}>
             <FaInstagram className="text-[34px] text-pink-600 drop-shadow-sm" />
          </motion.div>
          <h1 className="text-2xl font-black tracking-tighter hidden lg:block bg-clip-text text-transparent bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400">
            InstaVibe
          </h1>
        </div>

        {/* Links */}
        <div className="flex-1 flex flex-col gap-2 px-3 lg:px-4">
          <NavLink to="/" icon={FiHome} label="Home" />
          <NavLink to="/search" icon={FiSearch} label="Search" />
          <NavLink to="/upload" icon={FiPlusSquare} label="Create" />
          <NavLink to="/chat" icon={FiMessageCircle} label="Messages" badge={unreadMessages} />
          <NavLink to="/notifications" icon={FiHeart} label="Notifications" badge={unreadCount} />
          <NavLink to="/profile" icon={FiSettings} label="Profile" />
        </div>

        {/* User / Bottom Area */}
        <div className="p-4 mt-auto border-t border-gray-100/80 bg-gradient-to-t from-white/80 to-transparent">
          <div className="flex items-center gap-3 p-2 mb-4 hover:bg-gray-50/80 rounded-2xl cursor-pointer transition-colors backdrop-blur-md">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 via-pink-500 to-purple-600 p-[2px]">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-gray-800 text-sm overflow-hidden border border-white shadow-sm transition-transform hover:scale-105">
                   {currentUser?.pfp_url ? (
                     <img 
                       src={currentUser.pfp_url} 
                       alt="Profile" 
                       className="w-full h-full object-cover" 
                     />
                   ) : (
                     currentUser?.username?.charAt(0).toUpperCase()
                   )}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            
            <div className={`hidden ${mobileMenuOpen ? 'block' : 'lg:block'} overflow-hidden`}>
              <p className="font-bold text-sm text-gray-900 truncate">{currentUser?.username}</p>
              <p className="text-xs text-gray-500 font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Active now</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-red-50 hover:text-red-600 text-gray-600 transition-all group font-medium"
          >
            <FiLogOut className="text-2xl group-hover:-translate-x-1 transition-transform duration-300" />
            <span className={`hidden ${mobileMenuOpen ? 'block' : 'lg:block'}`}>Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Backdrop */}
      <AnimatePresence>
      {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
};

export default Navbar;
