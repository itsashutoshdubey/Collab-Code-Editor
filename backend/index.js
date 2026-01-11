import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from 'cors';
import { YSocketIO } from "y-socket.io/dist/server"; 
import {Queue, QueueEvents} from 'bullmq';




const app = express();
const server = http.createServer(app);


app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());


const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
}); 

// 1. Create the Yjs Backend Manager
const ysocketio = new YSocketIO(io);

// 2. Start the Manager (This sets up all the binary listeners)
ysocketio.initialize();

//initialize a queue 
const executionQueue = new Queue('execute-code', {
  connection: {
    host: 'localhost',
    port: 6379
  }
    });
// producer of jobs
async function addJob(code, language, socketId) {
  const uniqueJobId = `${socketId}:${Date.now()}`;
  return await executionQueue.add('code-execution', {
    codeToExecute: code,
    languageToExecute: language, 
    
  }, {
    jobId: uniqueJobId,
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: { type: 'exponential', delay: 1000 }
  }
);  
}

app.post('/api/execute', async(req, res)=>{
const {code, language, socketId} = req.body;
console.log("Code received for execution:", code);
console.log("Language:", language);
const job = await addJob(code, language, socketId);
console.log("Job added to queue with ID:", job.id);
  return res.status(202).json({ jobId: job.id }); // 202 means "Accepted for processing"
} );


// 1. QueueEvents Listener: This is the "Bridge"
// It listens globally for any job finishing and pushes the result to the user
const queueEvents = new QueueEvents('execute-code', { connection:{
  host: 'localhost',
  port: 6379
} });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  // Extract socketId from the jobId format "socketId-timestamp"
  const socketId = jobId.split(':')[0];
  console.log(` Job ${jobId} completed. Sending result to socket: ${socketId}`);

  // Emit result back to the specific user who requested it
  io.to(socketId).emit('execution-result', returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  const socketId = jobId.split('-')[0];
  console.log(`❌ Job ${jobId} failed: ${failedReason}`);

  io.to(socketId).emit('execution-error', { error: failedReason });
});


const userNameMap = {};

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  socket.on("join", ({ roomId, username }) => {
    userNameMap[socket.id] = username;
    socket.join(roomId);

    console.log(`${username} joined room: ${roomId}`);

    // send updated user list
    //// Get an array of all connected Socket IDs. 
    // const allConnectedIds = Array.from(io.sockets.sockets.keys());
    // The server maintains a Map of all connected clients in io.sockets.sockets. 


    // This returns a Map where keys are Room IDs and values are Sets of Socket IDs
    //const allRooms = io.sockets.adapter.rooms;

    // io.sockets.adapter.rooms.get(roomId) returns a 'Set' of IDs
   // const socketIdsInRoom = io.sockets.adapter.rooms.get(roomId);
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
      (id) => ({ socketId: id, username: userNameMap[id] })
    );


    // You cannot use .map() on a Set.
    //Array.from converts that collection of IDs into a standard JavaScript Array(e.g., ['abc12', 'xyz78']) so we can manipulate it.


    //io: This refers to the entire Socket.io server instance. Using io (instead of socket) means you are speaking to the whole building, not just one person.
    //.to(roomId): This is the Filter.It tells the server: "Don't shout this to every single user on the website. Only send this message to the sockets that have previously joined this specific roomId."

    //2. Why use io.to() instead of socket.to()?
   // This is a common interview "trap" question.
       //socket.to(roomId): Sends the message to everyone in the room EXCEPT the person who triggered the event.
        // io.to(roomId): Sends the message to EVERYONE in the room, including the person who just joined.
    io.to(roomId).emit("room-users", clients);
  });

 
  


  // disconnecting: The user has closed their tab, but Socket.io hasn't removed them from the "Rooms" list yet. The server still knows exactly where they were.
   //disconnect: The user is completely gone.The server has already wiped their room data.If you try to find out which room they were in, you'll get an empty list.
  socket.on("disconnecting", () => {

    // socket.rooms is a built-in property designed specifically for tracking membership
    //socket.rooms is effectively the user’s "Subscription Portfolio." It keeps track of every group the user currently belongs to so that when they disconnect, the server knows which groups need to be notified.
    for (let roomId of socket.rooms) {

      //In Socket.io, every user is automatically joined to a room named after their own socket.id.
      //You don't want to send a "User Left" notification to the user's private ID room(because they are gone!).You only care about the custom project rooms(like "Room-101").This if statement filters out the private ID room.
      if (roomId !== socket.id) {
        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
          .filter(id => id !== socket.id) // You manually remove the current user's ID from the list. If you don't do this, the "updated" list you send to other users will still include the person who just left!
          .map(id => ({ socketId: id, username: userNameMap[id] }));
        io.to(roomId).emit("room-users", clients);
      }
    }
    delete userNameMap[socket.id];
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

