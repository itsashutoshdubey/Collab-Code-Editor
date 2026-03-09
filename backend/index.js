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

//  Creating the Yjs Backend Manager
const ysocketio = new YSocketIO(io);


ysocketio.initialize();

//initialize a queue 
const executionQueue = new Queue('execute-code', {
  connection: {
    host: '127.0.0.1',
    port: 6379
  }
    });
// producer of jobs
async function addJob(code, language, socketId) {
  const uniqueJobId = `${socketId}-${Date.now()}`;
  return await executionQueue.add('code-execution', {
    codeToExecute: code,
    languageToExecute: language, 
    
  }, {
    jobId: uniqueJobId,
    attempts: 3, 
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
  return res.status(202).json({ jobId: job.id }); // 202 means Accepted for processing
} );



// listens globally for any job finishing and pushes the result to the user
const queueEvents = new QueueEvents('execute-code', { connection:{
  host: '127.0.0.1',
  port: 6379
} });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  // Extracting socketId from the jobId format "socketId-timestamp"
  const socketId = jobId.split('-')[0];
  console.log(` Job ${jobId} completed. Sending result to socket: ${socketId}`);

  // Emit result back to the specific user who requested it
  io.to(socketId).emit('execution-result', returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  const socketId = jobId.split('-')[0];
  console.log(` Job ${jobId} failed: ${failedReason}`);

  io.to(socketId).emit('execution-error', { error: failedReason });
});


const userNameMap = {};

io.on("connection", (socket) => {
  console.log(" A user connected:", socket.id);

  socket.on("join", ({ roomId, username }) => {
    userNameMap[socket.id] = username;
    socket.join(roomId);

    console.log(`${username} joined room: ${roomId}`);

    
     //mapping people in this room with their socketid and username
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
      (id) => ({ socketId: id, username: userNameMap[id] })
    );
    // send updated user list
     io.to(roomId).emit("room-users", clients);
  });

 
  


 
  socket.on("disconnecting", () => {

    
    for (let roomId of socket.rooms) {
        if (roomId !== socket.id) {
        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
          .filter(id => id !== socket.id) //  manually remove the current user
        io.to(roomId).emit("room-users", clients);
      }
    }
    delete userNameMap[socket.id];
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

