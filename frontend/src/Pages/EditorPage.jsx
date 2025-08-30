import React, { useState } from 'react';
import '../App.css';
import Avatar from 'react-avatar'
import Editor from "@monaco-editor/react";


const EditorPage = () => {
  const [language, setLanguage] = useState('cpp');

  const handleLeave = () => {
    // You can add your leave logic here (e.g., navigate away, disconnect socket)
  };

  

  const handleEditorDidMount = (editor, monaco) => {
    editor.onDidChangeModelContent((event) => {
      console.log("Diff:", event.changes);
    });
  };



  const [clients, setClients] = useState([
    { socketId: 1, username: 'User1' },
    { socketId: 2, username: 'User2' },
    { socketId: 3, username: 'User3' },
    { socketId: 1, username: 'User1' },
    { socketId: 2, username: 'User2' },
    { socketId: 3, username: 'User3' },
    { socketId: 1, username: 'User1' },
    { socketId: 2, username: 'User2' },
    { socketId: 3, username: 'User3' },
]);

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