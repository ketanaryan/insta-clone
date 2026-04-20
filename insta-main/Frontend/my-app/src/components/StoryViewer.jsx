import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const StoryViewer = ({ stories, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    const duration = 5000; // 5 seconds
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center sm:p-4"
    >
      <div className="relative w-full h-full sm:max-w-[450px] sm:h-[800px] bg-gray-900 sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-20">
          {stories.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300 ease-linear"
                style={{ 
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500 p-0.5">
              <img 
                src={currentStory.author?.pfp_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentStory.username}`} 
                className="w-full h-full rounded-full object-cover bg-white" 
                alt="" 
              />
            </div>
            <div>
              <p className="text-white text-sm font-bold shadow-sm">{currentStory.username}</p>
              <p className="text-white/60 text-[10px] shadow-sm">
                {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white transition-colors bg-black/20 rounded-full backdrop-blur-sm"
          >
            <FiX className="text-2xl" />
          </button>
        </div>

        {/* Navigation Buttons (Desktop) */}
        <button 
          onClick={handlePrev}
          className="hidden sm:flex absolute left-[-60px] top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white transition-colors"
        >
          <FiChevronLeft className="text-4xl" />
        </button>
        <button 
          onClick={handleNext}
          className="hidden sm:flex absolute right-[-60px] top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white transition-colors"
        >
          <FiChevronRight className="text-4xl" />
        </button>

        {/* Tap Controls (Mobile) */}
        <div className="absolute inset-0 flex z-10">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Image Content */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          <img 
            src={currentStory.image} 
            className="max-w-full max-h-full object-contain" 
            alt="Story content" 
          />
        </div>

      </div>
    </motion.div>
  );
};

export default StoryViewer;
