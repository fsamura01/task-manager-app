/**
 * @file app.js
 * @description Main application entry point for the Task Manager API.
 * Refactored to use modular routes and controllers.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const http = require("http");
const db = require("./database");
const initSocket = require("./sockets/socket_manager");

// Import Modular Routes
const authRoutes = require("./routes/auth_routes");
const taskRoutes = require("./routes/task_routes");
const projectRoutes = require("./routes/project_routes");
const fileRoutes = require("./routes/file_routes");
const githubRoutes = require("./routes/github_routes");

const app = express();
const PORT = process.env.PORT || 5000;

// 1. GLOBAL MIDDLEWARE
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 3600000,
      sameSite: "lax",
      httpOnly: true,
    },
  })
);

// 2. STATIC FILES & STORAGE
app.use("/uploads", express.static("uploads", {
  setHeaders: (res) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Content-Disposition", "inline");
  },
}));

// Test database connection
db.testConnection();

// 3. MOUNT API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);

// Consistently mount all GitHub related routes under the /api base
app.use("/api", githubRoutes);

// 4. ERROR HANDLING
const errorHandler = require("./middleware/error_handler");
const { NotFoundError } = require("./utils/app_error");

// Handle 404
app.use((req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Global Error Handler
app.use(errorHandler);

// 5. SERVER & SOCKET INITIALIZATION
const server = http.createServer(app);
const io = initSocket(server);

// Share 'io' instance globally for controllers to use req.app.get('io')
app.set("io", io);

server.listen(PORT, () => {
  console.log(`\n🚀 Mission Control: Server active on port ${PORT}`);
  console.log("📡 Real-time sync engine is ONLINE\n");
});
