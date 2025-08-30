import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const userNameMap = {};

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  socket.on("join", ({ roomId, username }) => {
    userNameMap[socket.id] = username;
    socket.join(roomId);

    console.log(`${username} joined room: ${roomId}`);

    // send updated user list
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
      (id) => ({ socketId: id, username: userNameMap[id] })
    );
    io.to(roomId).emit("room-users", clients);
  });

  // receive code changes and broadcast to others
  socket.on("code-change", ({ roomId, code }) => {
    socket.to(roomId).emit("code-change", code);
  });

  socket.on("disconnecting", () => {
    for (let roomId of socket.rooms) {
      if (roomId !== socket.id) {
        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
          .filter(id => id !== socket.id)
          .map(id => ({ socketId: id, username: userNameMap[id] }));
        io.to(roomId).emit("room-users", clients);
      }
    }
    delete userNameMap[socket.id];
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

