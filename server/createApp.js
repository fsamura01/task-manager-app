/**
 * @file createApp.js
 * @description Factory function that creates and configures the Express app.
 * Separated from app.js so that tests can import the app without starting
 * the HTTP server or triggering database connections.
 */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");

// Import Modular Routes
const authRoutes = require("./routes/auth_routes");
const taskRoutes = require("./routes/task_routes");
const projectRoutes = require("./routes/project_routes");
const fileRoutes = require("./routes/file_routes");
const githubRoutes = require("./routes/github_routes");

// Import Error Handling
const errorHandler = require("./middleware/error_handler");
const { NotFoundError } = require("./utils/app_error");

function createApp() {
  const app = express();
  
  // Trust the reverse proxy (Render) so req.protocol is correctly 'https'
  app.set("trust proxy", 1);

  // 1. GLOBAL MIDDLEWARE
  // Disable morgan logging during tests to keep output clean
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }
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
  app.use(
    "/uploads",
    express.static("uploads", {
      setHeaders: (res) => {
        res.set("X-Content-Type-Options", "nosniff");
        res.set("Content-Disposition", "inline");
      },
    })
  );

  // 3. MOUNT API ROUTES
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api", githubRoutes);

  // 4. ERROR HANDLING
  // Handle 404
  app.use((req, res, next) => {
    next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
