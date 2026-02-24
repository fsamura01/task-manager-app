const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const db = require("../database");

/**
 * Socket Manager: The "Traffic Controller"
 * 
 * This file handles all the real-time communication.
 * Instead of cluttering app.js, we put all the WebSocket logic here.
 */
const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5500",
      ],
      methods: ["GET", "POST"],
    },
  });

  /**
   * 1. AUTHENTICATION MIDDLEWARE
   * Before a user can connect, we check their "Keycard" (JWT Token).
   */
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("No token provided"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user from DB to ensure they still exist
      const user = await db.query(
        "SELECT id, username FROM users WHERE id = $1",
        [decoded.userId]
      );

      if (user.rows.length === 0) return next(new Error("User not found"));

      // Attach user info to the socket so we know who this is in every event
      socket.user = user.rows[0];
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  /**
   * 2. CONNECTION HANDLER
   * This runs whenever a user successfully opens their "Walkie-Talkie" app.
   */
  io.on("connection", (socket) => {
    console.log(`📡 User Connected: ${socket.user.username}`);

    // JOIN PROJECT ROOM
    socket.on("join_project", async (projectId) => {
      const roomName = `project_${projectId}`;
      socket.join(roomName);
      socket.currentProject = roomName;
      
      console.log(`🏠 ${socket.user.username} joined room: ${roomName}`);
      
      // Notify others in the room
      socket.to(roomName).emit("user_joined_project", {
        user: socket.user,
        timestamp: new Date().toISOString()
      });
    });

    // LEAVE PROJECT ROOM
    socket.on("leave_project", () => {
      if (socket.currentProject) {
        socket.to(socket.currentProject).emit("user_left_project", {
          user: socket.user
        });
        socket.leave(socket.currentProject);
        socket.currentProject = null;
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      console.log(`🔌 User Disconnected: ${socket.user.username}`);
    });
  });

  return io;
};

module.exports = initSocket;
