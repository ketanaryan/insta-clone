import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function ShowPost(props){
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(()=>{
    fetchFiles();
  },[props.refreshTrigger]);

  const fetchFiles = () => {
    axios
      .get(`${API_URL}/files`)
      .then((response) => {
        setFiles(response.data);
      })
      .catch((error) => {
        console.error("Error fetching files", error);
      });
  };

  const handleDelete = (id) => {
    axios
      .delete(`${API_URL}/delete/${id}`)
      .then(() => {
        fetchFiles();
      })
      .catch((error) => {
        console.error("Error deleting file", error);
      });
  };

  const formatTime = (time) => {
    const date = new Date(time);
    return date.toLocaleString(); 
  };

  return (
    <div className="show-posts-container">
      <h2>Your Feed</h2>
      <div className="posts-grid">
        {files.map((file) => (
          <div key={file._id} className="post-card">
            <div className="post-image-container">
              <img
                src={file.file_url}
                alt={file.file_name}
                className="post-image"
              />
            </div>
            <div className="post-footer">
              <p className="post-caption">{file.caption}</p>
              <p className="post-time">{formatTime(file.upload_time)}</p>
              <button
                className="delete-button"
                onClick={() => handleDelete(file._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowPost;
