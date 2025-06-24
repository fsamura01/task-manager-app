// Import required packages
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Pool } = require("pg");

// Create Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(cors()); // Allow cross-origin requests from your React app
app.use(express.json()); // Parse JSON request bodies

// Basic test route to verify server is working
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running successfully!" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully!",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});
