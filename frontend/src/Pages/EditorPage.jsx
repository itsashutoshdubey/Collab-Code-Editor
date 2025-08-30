import React, { useState, useEffect, useRef } from 'react';
import '../App.css';
import Avatar from 'react-avatar'
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import { useLocation, useParams } from 'react-router-dom';


const EditorPage = () => {
  const [language, setLanguage] = useState('cpp');
  const socketRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000", {
      //transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log(" Connected to server:", socketRef.current.id);
    });

    socketRef.current.emit("join", {
       roomId,
       username: location.state?.username ,
      });

   
    socketRef.current.on("room-users", (clients) => {
      console.log("Users in room:", clients);
     
      setClients(clients);
    });

        // Receive changes from server
      socketRef.current.on("code-change", ({ changes, versionId: incomingVersionId }) => {
        // Ignore if this change originated from this client
        if (incomingVersionId <= editor.getModel().getVersionId()) return;

        editor.getModel().applyEdits(
          changes.map(c => ({
            range: new monaco.Range(
              c.range.startLineNumber,
              c.range.startColumn,
              c.range.endLineNumber,
              c.range.endColumn
            ),
            text: c.text,
            forceMoveMarkers: true
          }))
        );
      });


    socketRef.current.on("disconnect", () => {
      console.log(" Disconnected from server");
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);


  const handleLeave = () => {
    // You can add your leave logic here (e.g., navigate away, disconnect socket)
    socketRef.current.disconnect();
  };

  

  
    
    const handleEditorDidMount = (editor, monaco) => {
      // Send changes to server
      editor.onDidChangeModelContent((event) => {
        socketRef.current.emit("code-change", {
          roomId,
          changes: event.changes,      // Only the changes
          versionId: editor.getModel().getVersionId()
        });
      });
    };

  
    

  



  

  return (
    <div className="editor-container">
     
      <div className="editor-left">
        <div className="editor-header">
          <h2> Collaborative Editor</h2>
          <p>Room-based real-time coding</p>
        </div>
        <div className="connected-users">
          <h3> Connected Users</h3>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {clients.map((clients) => (
              <div
                key={clients.socketId} // unique key
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: "1px solid #ddd",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              >
                <Avatar name={clients.username} size="50" round={true} />
                <span style={{ marginTop: "6px", fontSize: "14px" }}>
                  {clients.username}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      
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
           
            onMount={handleEditorDidMount}
          />
        </div>


        <div className="leave-button-container">
          <button onClick={handleLeave}>Leave Room</button>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;