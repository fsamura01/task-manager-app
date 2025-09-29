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

// Function to get a client from the pool for transactions
// This is needed for the GitHub integration's transaction handling
const getClient = async () => {
  try {
    const client = await pool.connect();

    // Add query method to client for consistency
    const query = client.query;
    const release = client.release;

    // Set a timeout for the client
    const timeout = setTimeout(() => {
      console.error("A client has been checked out for more than 5 seconds!");
      console.error(
        "The last executed query on this client was: ",
        client.lastQuery
      );
    }, 5000);

    // Override the release method to clear the timeout
    client.release = (err) => {
      clearTimeout(timeout);
      // Call the actual release method
      release.call(client, err);
    };

    // Override query method to track last query for debugging
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };

    return client;
  } catch (error) {
    console.error("Error getting database client:", error);
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

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("Received SIGINT, closing database pool...");
  pool.end(() => {
    console.log("Database pool closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, closing database pool...");
  pool.end(() => {
    console.log("Database pool closed");
    process.exit(0);
  });
});

module.exports = {
  query,
  getClient,
  testConnection,
  pool,
};
