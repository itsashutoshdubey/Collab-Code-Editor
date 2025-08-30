import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  

  const handleJoin = () => {
    if (!roomId || !username) {
      toast.error('Room ID and Username are required');
      return;  
    }

    
    navigate(`/editor/${roomId}`, {
      state: { username },
    });
  };



  
  const generateNewRoom = (e) => {
    e.preventDefault();
    const id = uuidV4();
    setRoomId(id);
   // console.log(id);
    //alert(`Created a new room with ID: ${id}`);
    toast.success('Created a new room');
  };

  return (
    <div className="home-container">
      <h1>🚀 Join Your Room</h1>
      <div className="form-grid">
        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <button onClick={handleJoin}>Join</button>
      <button onClick={generateNewRoom}>Generate New Room</button>

    </div>
  );
};

export default Home;
