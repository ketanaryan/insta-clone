import React, { useState, useEffect } from 'react';
import { FiSearch, FiX, FiArrowRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 1) {
        setLoading(true);
        try {
          const res = await api.get(`/users/search?q=${query}`);
          setResults(res.data);
        } catch (err) {
          console.error("Search error:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400">Search</h2>
        
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400 group-focus-within:text-pink-500 transition-colors text-lg" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-10 py-4 bg-white border border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 shadow-sm focus:ring-4 focus:ring-pink-500/10 focus:border-pink-300 transition-all outline-none"
            placeholder="Search for friends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
           <div className="flex flex-col items-center justify-center h-64 gap-3">
             <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gray-400 text-sm font-medium">Searching the Vibe...</p>
           </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">Results</h3>
             {results.map((user, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={user._id} 
                  onClick={() => navigate(`/profile/${user.username}`)}
                  className="flex items-center justify-between p-4 bg-white border border-gray-50 hover:border-pink-100 hover:bg-pink-50/10 rounded-2xl cursor-pointer transition-all group shadow-sm hover:shadow-md"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-pink-600">
                         <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                            <img src={user.pfp_url ? `${user.pfp_url}?t=${Date.now()}` : `https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`} alt={user.username} className="w-full h-full object-cover bg-gray-100" />
                         </div>
                      </div>
                      <div>
                         <p className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{user.username}</p>
                         <p className="text-xs text-gray-500 line-clamp-1">{user.bio || 'Snap! No bio yet.'}</p>
                      </div>
                   </div>
                   <FiArrowRight className="text-gray-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                </motion.div>
             ))}
          </div>
        ) : query ? (
           <div className="flex flex-col items-center justify-center h-64 text-gray-400">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
               <FiSearch className="text-2xl" />
             </div>
             <p className="font-medium animate-pulse">No users match "{query}"</p>
           </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 italic">
             <p>Type to explore the world of InstaVibe</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f3f4f6; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e5e7eb; }
      `}} />
    </div>
  );
};

export default Search;
