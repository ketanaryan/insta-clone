import React, { useState } from "react";
import axios from "axios";
import "./Styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function CreatePost(props){
  const [file, setFile] = useState(null);
  const [username, setUsername] = useState("");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !username.trim() || !caption.trim()) {
      setMessage("Please fill in username, caption and select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", username);
    formData.append("caption", caption);

    try {
      await axios.post(`${API_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Post created successfully!");
      props.setRefreshTrigger(
        (prev)=>prev+1
      );
      setUsername("");
      setCaption("");
      setFile(null);
    } catch (error) {
      console.error("Upload error:", error.response?.data || error.message);
      setMessage(
        error.response?.data?.error || "Error uploading post."
      );
    }
  };

  return (
    <div className="create-post-container">
      <h2>Create a New Post</h2>
      <form onSubmit={handleSubmit} className="upload-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="text-input"
        />

        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="caption-input"
        />

        <input
          type="file"
          onChange={handleFileChange}
          className="file-input"
        />

        <button type="submit" className="upload-button">
          Upload
        </button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default CreatePost;
