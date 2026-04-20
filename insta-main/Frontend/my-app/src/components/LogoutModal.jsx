import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogOut, FiX } from 'react-icons/fi';

const LogoutModal = ({ onConfirm, onCancel }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <AnimatePresence>
      <motion.div
        key="logout-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          key="logout-modal"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl"
        >
          {/* Icon */}
          <div className="flex flex-col items-center pt-8 pb-4 px-6">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <FiLogOut className="text-3xl text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center">Log out?</h3>
            <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
              Are you sure you want to log out of your InstaVibe account?
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mx-6" />

          {/* Buttons */}
          <div className="p-4 flex flex-col gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-2xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <FiLogOut className="text-base" />
              Yes, Log Out
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <FiX className="text-base" />
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LogoutModal;
