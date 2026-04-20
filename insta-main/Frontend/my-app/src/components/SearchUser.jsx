import React, { useState } from "react";
import axios from "axios";
import "./Styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function SearchUser(){
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false); 

  const handleSearch = () => {
    if (!username.trim()) {
      setError("Please enter a username to search.");
      return;
    }

    axios
      .get(`${API_URL}/files?username=${username}`)
      .then((response) => {
        setSearchResults(response.data);
        setError("");
        setSearched(true);
      })
      .catch((error) => {
        console.error("Search error:", error);
        setError("Error fetching user posts. Make sure the server is running.");
        setSearchResults([]);
        setSearched(true);
      });
  };

  return (
    <div className="search-user-container">
      <input
        type="text"
        placeholder="Search by username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="search-input"
      />
      <button onClick={handleSearch} className="search-btn">
        Search
      </button>

      {error && <p className="error-message">{error}</p>}

      <div className="search-results">
        {searched ? (
          searchResults.length > 0 ? (
            searchResults.map((file) => (
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
                </div>
              </div>
            ))
          ) : (
            <p>No posts found for this username.</p>
          )
        ) : null}
      </div>
    </div>
  );
};

export default SearchUser;
