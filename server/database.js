require("dotenv").config();
const { Pool } = require("pg");

// Create a connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // These settings help manage connections efficiently
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client can be idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting
});

// Helper function to run queries with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

// Function to test database connectivity
const testConnection = async () => {
  try {
    const result = await query("SELECT NOW()");
    console.log("Database connected successfully at:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
};

module.exports = {
  query,
  testConnection,
  pool,
};
