import React, { useState, useEffect } from 'react';
import axios from 'axios';

const URL = 'https://tarea-3-stefanocando-production.up.railway.app/query';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false); // Estado para manejar el loading

  const movies_data = [
    { name: "Matrix Reloaded, The", url: "https://imsdb.com/scripts/Matrix-Reloaded,-The.html" },
    { name: "Puss in Boots: The Last Wish", url: "https://imsdb.com/scripts/Puss-in-Boots-The-Last-Wish.html" },
    { name: "Thor: Ragnarok", url: "https://imsdb.com/scripts/Thor-Ragnarok.html" },
    { name: "TRON", url: "https://imsdb.com/scripts/TRON.html" },
    { name: "War Horse", url: "https://imsdb.com/scripts/War-Horse.html" },
    { name: "28 Days Later", url: "https://imsdb.com/scripts/28-Days-Later.html" },
    { name: "I, Robot", url: "https://imsdb.com/scripts/I,-Robot.html" },
    { name: "Guardians of the Galaxy Vol. 2", url: "https://imsdb.com/scripts/Guardians-of-the-Galaxy-Vol-2.html" },
    { name: "The Green Mile", url: "https://imsdb.com/scripts/Green-Mile,-The.html" },
    { name: "American History X", url: "https://imsdb.com/scripts/American-History-X.html" },
  ];


  const handleSend = () => {
    if (input.trim()) {
      setLoading(true);
      const newMessage = { message: input };
      
      axios.post(URL, newMessage)
        .then((response) => {
          setMessages([...messages, response.data]);
          setInput('');
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error sending message:', error);
          setLoading(false);
        });
    }
  };

  return (
    <div>
      <div className="movies-list">
        <h3>Movies Scripts:</h3>
        <ul>
          {movies_data.map((movie, index) => (
            <li key={index}>
              <a href={movie.url} target="_blank" rel="noopener noreferrer">
                {movie.name}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {loading && (
        <div className="loading-screen">
          <p>Loading...</p>
        </div>
      )}

      <div className="chat-container">
        <div className="messages">
          {messages.map((message, index) => (
            <div key={index} className={message.sender}>
              {message.text}
            </div>
          ))}
        </div>
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button onClick={handleSend} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
