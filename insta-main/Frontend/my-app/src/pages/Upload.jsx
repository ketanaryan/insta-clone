import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiUploadCloud, FiX } from 'react-icons/fi';
import api from '../services/api';

const Upload = () => {
  const { currentUser } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
    } else {
      setError('Please drop an image file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image to upload');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file); // Adjust to match your backend exactly, some backends use 'image' or 'file'
    formData.append('username', currentUser.username || currentUser.email || 'Anonymous');
    formData.append('caption', caption || '');

    try {
      // Requirements specify POST to http://localhost:3000/upload
      await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearPreview = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Create new post
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* Image Upload Area */}
          <div 
            className={`mb-6 border-2 border-dashed rounded-2xl h-80 flex flex-col justify-center items-center transition-all ${
              preview ? 'border-transparent bg-black relative' : 'border-gray-300 hover:border-pink-400 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                <button 
                  type="button" 
                  onClick={clearPreview}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <FiX className="text-xl" />
                </button>
              </>
            ) : (
              <div className="text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <FiUploadCloud className="mx-auto text-5xl text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2 font-medium">Drag photos here</p>
                <button type="button" className="text-sm font-semibold text-pink-600 hover:text-purple-600">
                  Select from computer
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* User Preview */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
               <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-xs">
                 {currentUser?.username?.charAt(0).toUpperCase()}
               </div>
            </div>
            <span className="font-semibold text-sm">{currentUser?.username}</span>
          </div>

          {/* Caption Input */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full h-24 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none transition-all text-sm mb-6 placeholder-gray-400 text-gray-700"
          ></textarea>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-white/50 border-t-white rounded-full"></span>
                Sharing...
              </span>
            ) : (
              'Share'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Upload;
