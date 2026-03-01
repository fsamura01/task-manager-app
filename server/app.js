/**
 * @file app.js
 * @description Main application entry point for the Task Manager API.
 * Imports the configured Express app from createApp.js and starts
 * the HTTP + WebSocket server.
 */

require("dotenv").config();
const http = require("http");
const db = require("./database");
const initSocket = require("./sockets/socket_manager");
const createApp = require("./createApp");

const app = createApp();
const PORT = process.env.PORT || 5000;

// Test database connection on startup
db.testConnection();

// SERVER & SOCKET INITIALIZATION
const server = http.createServer(app);
const io = initSocket(server);

// Share 'io' instance globally for controllers to use req.app.get('io')
app.set("io", io);

server.listen(PORT, () => {
  console.log(`\n🚀 Mission Control: Server active on port ${PORT}`);
  console.log("📡 Real-time sync engine is ONLINE\n");
});
