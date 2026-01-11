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

  // Connect to server and setup socket listeners
  // Why useRef? You use socketRef.current because you want the socket connection to persist for the entire life of the component without causing a re-render every time the socket object updates.
  useEffect(() => {

    // This line is what triggers the "connection" event on the server
    //It initiates a specialized Socket.io Handshake. The client sends an HTTP request to the server with a special header: Upgrade: websocket.
    //This tells the server, "I don't want a standard webpage; I want to open a permanent, two-way tunnel."

    //ye send kar rha request to 5000 port server to upgrade http to websocket connection
    socketRef.current = io("http://localhost:5000");


      // The Listener: This is an Event Listener. It waits for the server to send back an "Acknowledgement" that the handshake was successful.
     //The ID: Once connected, the server assigns a unique id to this specific browser tab(e.g., socketRef.current.id).This is like a temporary passport for that user session.
    socketRef.current.on("connect", () => {
      console.log("✅ Connected to server:", socketRef.current.id);

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

  
      
    // disconnect is Built-in Listener on the frontend.
    // It fires when the connection is lost. This could happen if the server crashes, the user loses internet, or the backend manually kicks the user.
    socketRef.current.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });
     
    // cleanup function of useEffect. t runs right before the component "Unmounts" (i.e., when the user navigates away from the Room page to the Home page or closes the tab).
    // when we do sockerRef.current.disconnect(), It manually tells the server: "I am leaving now, you can close this specific socket and remove me from all rooms."
    return () => {
      socketRef.current.disconnect();
      if (providerRef.current) providerRef.current.destroy();
      if (docRef.current) docRef.current.destroy();
    };
  }, 
  
    //dependency array.. [] - this tells React: "Run this effect only once, immediately after the component is first rendered, and then never run it again."
    //if you don't put [] - The code would run on every single re-render. Every time you typed a letter in the editor, your app would create a brand-new WebSocket connection, crashing your server with thousands of requests.
    // [roomId] - code would run when component mounts and when roomId changes
  []);

  // Called when editor mounts
  const afterMounting = (editor, monaco) => {
    editorRef.current = editor;


    /*

 
A. What happens when you type?
Monaco catches the keystroke.

The Binding (the translator) calculates the index of the change and tells the yText.

The Doc updates its internal linked-list of character IDs.

The Provider detects a change in the Doc, converts it into a Binary Update, and emits it over the socket.

B. What happens when the server receives the update?
The yjsHandler on the server receives the binary blob.

It merges this update into its own "Master Doc" (the librarian's copy).

It broadcasts that same blob to everyone else in the roomId.

C. What happens when your friend receives the update?
Their Provider catches the blob and feeds it to their Doc.

The Doc merges the data.

Their Binding sees the yText has changed and tells Monaco to "paint" the new letter on the screen.

    */

    const doc = new Y.Doc();
    docRef.current = doc;
    
    const yText = doc.getText("monaco-content");
    // Add an options object as the 4th argument
    const provider = new SocketIOProvider(
      "http://localhost:5000",
      roomId,
      doc,
      { autoConnect: true } // This satisfies the 'reading autoConnect' requirement
    );
    providerRef.current = provider;

     new MonacoBinding(yText, editorRef.current.getModel(), new Set([editorRef.current]), provider.awareness);
    // provider.awareness.setLocalStateField("user", {
    //   name: location.state?.username,
    //   color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    // });
     

  };

  const handleLeave = () => {
    socketRef.current.disconnect();
    // You can navigate away or show a confirmation
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
            onMount={afterMounting} // it says what to do after editor is ready(Mounted)
            /*
            In the context of the Monaco Editor (and many React libraries), onMount is a lifecycle callback. It means: "The editor is now fully loaded, attached to the webpage, and ready for you to control it."
            Think of it like a "Welcome" ceremony. Before this function runs, the editor is just a set of instructions. After it runs, you have a "living" editor instance that you can talk to.
            When your React component renders, it puts a <div> on the screen. However, Monaco is a very complex piece of software (it’s basically a mini VS Code). It takes a few milliseconds to initialize its internal engines.
            If you try to change the code or language before it's ready, your app will crash because the editor doesn't exist yet. The onMount prop ensures you only start interacting with it when it's safe.
            When onMount triggers, it gives you two powerful tools(monaco, editor) and has a callback function: onMount={(editor, monaco) => { ... }}
            editor (The Instance): This represents the specific editor window on your screen. You use this to get/set text, handle scrolling, or manage the cursor.
            */
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
