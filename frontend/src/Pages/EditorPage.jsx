import React, { useState, useEffect, useRef } from "react";
import "../App.css";
import Avatar from "react-avatar";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useLocation, useParams } from "react-router-dom";
import axios from 'axios';
import {MonacoBinding} from "y-monaco";
import {SocketIOProvider} from "y-socket.io";
import * as Y from 'yjs';


const EditorPage = () => {
  const [language, setLanguage] = useState("cpp");
  const [clients, setClients] = useState([]);
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const docRef = useRef(null);
  const providerRef = useRef(null);

  // Connecting to server and setup socket listeners
  
  useEffect(() => {
//ye send kar rha request to 5000 port server to upgrade http to websocket connection
    socketRef.current = io("http://localhost:5000");


      
     //Once connected, the server assigns a unique id to this specific browser tab - socketRef.current.id
    socketRef.current.on("connect", () => {
      console.log("Connected to server:", socketRef.current.id);

      // Join the room with username
      socketRef.current.emit("join", {
        roomId,
        username: location.state?.username,
      });
    });

    // Listen for users in room
    socketRef.current.on("room-users", (clients) => {
      setClients(clients);
    });

    socketRef.current.on('completed', (returnvalue)=>{
      // const {stdout, stderr} = returnvalue
     console.log(`${returnvalue}`);
    });

    socketRef.current.on('failed', (returnValue) => {
      console.log(`${returnvalue}`);
    });

  
    socketRef.current.on("disconnect", () => {
      console.log(" Disconnected from server");
    });
     
    
    return () => {
      socketRef.current.disconnect();
      if (providerRef.current) providerRef.current.destroy();
      if (docRef.current) docRef.current.destroy();
    };
  }, 
  
    // [] - run once
    //nothing -  run on every single re-render
    // [roomId] - run when component mounts and when roomId changes
  []);

  // Called when editor mounts
  const afterMounting = (editor, monaco) => {
    editorRef.current = editor;  


    const doc = new Y.Doc();
    docRef.current = doc;
    
    const yText = doc.getText("monaco-content");
   
    const provider = new SocketIOProvider(
      "http://localhost:5000",
      roomId,
      doc,
      { autoConnect: true } 
    );
    providerRef.current = provider;

     new MonacoBinding(yText, editorRef.current.getModel(), new Set([editorRef.current]), provider.awareness);
   
     

  };

  const handleLeave = () => {
    socketRef.current.disconnect();
  };

  const handleRun = async() => {
   console.log("Run code in language:", language);
   const SubmittedCode = editorRef.current.getValue();
   console.log(SubmittedCode);
    let SubmitRes = axios.post('http://localhost:5000/api/execute', {
      code: SubmittedCode,
      language: language ,
      socketId: socketRef.current.id
    });
    console.log("Submission response:", SubmitRes);
  };
  

  return (
    <div className="editor-container">
      {/* Left panel: Connected users */}
      <div className="editor-left">
        <div className="editor-header">
          <h2>Collaborative Editor</h2>
          <p>Room-based real-time coding</p>
        </div>

        <div className="connected-users">
          <h3>Connected Users</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {clients.map((client) => (
              <div
                key={client.socketId}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <Avatar name={client.username} size="50" round={true} />
                <span style={{ marginTop: "6px", fontSize: "14px" }}>
                  {client.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Editor */}
      <div className="editor-right">
        <div className="editor-toolbar">
          <label htmlFor="language-select">Language:</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="c">C</option>
          </select>
        </div>

        <div className="code-area" style={{ height: "500px" }}>
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            defaultValue="// Start coding here..."
            onMount={afterMounting} // connect to editor.ref after mounting
           
          />
        </div>

        <div className="leave-button-container">
          <button onClick={handleLeave}>Leave Room</button>
        </div>
        <div className="leave-button-container">
          <button onClick={handleRun}>Run</button>
          </div>
      </div>
    </div>
  );
};

export default EditorPage;
