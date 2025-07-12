const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const express = require("express");
const cors = require("cors");
const db = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";
console.log(require("crypto").randomBytes(32).toString("base64")); // 'hex'

// Middleware setup
app.use(cors());
app.use(express.json());

// Test database connection on startup
db.testConnection();

// Create different rate limiters for different types of endpoints
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 2, // Maximum 5 attempts per window per IP
  message: {
    success: false,
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
  // Skip successful requests from counting against the limit
  skipSuccessfulRequests: true,
  // Consider implementing more sophisticated tracking by user account
  // not just IP address, to prevent attackers from bypassing IP-based limits
  keyGenerator: (req) => {
    // You might combine IP and username for more precise rate limiting
    return req.ip + ":" + (req.body.email || "");
  },
});

// Helper function to generate JWT tokens
// Think of this like creating a secure ID badge with expiration date
const generateToken = (userId, username) => {
  return jwt.sign(
    {
      userId: userId,
      username: username,
    },
    JWT_SECRET,
    { expiresIn: "24h" } // Token expires in 24 hours for security
  );
};

// REGISTRATION ENDPOINT
// This is like the "sign up for a new account" process
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    // Step 1: Validate input data
    // We check if all required fields are provided
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Username, email, and password are required",
      });
    }

    // Use provided name or default to username
    const displayName = name || username;

    // Step 2: Validate password strength
    // A weak password is like using a cardboard lock
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
    }

    // Step 3: Check if user already exists
    // Like checking if someone already has an account before creating a new one
    const existingUser = await db.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Username or email already exists",
      });
    }

    // Step 4: Hash the password
    // This is like turning the password into a secure fingerprint
    const saltRounds = 12; // Higher number = more secure but slower
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Step 5: Create the new user in database
    const newUser = await db.query(
      "INSERT INTO users (username, email, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, name",
      [username, email, hashedPassword, displayName] // Using username as default name
    );

    // Step 6: Generate JWT token for immediate login
    // Like giving them their key card right after registration
    const token = generateToken(newUser.rows[0].id, newUser.rows[0].username);

    // Step 7: Send success response (never send back the password!)
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: newUser.rows[0].id,
          username: newUser.rows[0].username,
          email: newUser.rows[0].email,
          name: newUser.rows[0].name,
        },
        token: token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
});

// LOGIN ENDPOINT
// This is like the "sign in to existing account" process
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Step 1: Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    // Step 2: Find user in database
    // Like looking up someone's account information
    const user = await db.query(
      "SELECT id, username, email, password_hash, name FROM users WHERE username = $1",
      [username]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Step 3: Verify password
    // Like checking if their key creates the same fingerprint
    const validPassword = await bcrypt.compare(
      password,
      user.rows[0].password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Step 4: Generate JWT token
    // Like giving them a fresh key card
    const token = generateToken(user.rows[0].id, user.rows[0].username);

    // Step 5: Send success response
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.rows[0].id,
          username: user.rows[0].username,
          email: user.rows[0].email,
          name: user.rows[0].name,
        },
        token: token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

// MIDDLEWARE TO VERIFY JWT TOKENS
// This is like the security guard that checks key cards
const verifyToken = (req, res, next) => {
  // Look for token in Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Expected format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  try {
    // Verify the token is valid and not expired
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("🚀 ~ verifyToken ~ decoded:", decoded);

    // Add user info to request object for use in other routes
    req.user = decoded;
    next(); // Continue to the next middleware/route
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

// PROTECTED ROUTE EXAMPLE
// This shows how to use the middleware to protect routes
app.get("/api/auth/profile", verifyToken, async (req, res) => {
  try {
    // req.user contains the decoded JWT data
    const user = await db.query(
      "SELECT id, username, email, name FROM users WHERE id = $1",
      [req.user.userId]
    );

    res.json({
      success: true,
      data: user.rows[0],
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
});

// Your first real API endpoint - get all tasks
app.get("/api/tasks", verifyToken, async (req, res) => {
  try {
    // Query the database for all tasks with user information
    const result = await db.query(
      `
            SELECT 
                tasks.id,
                tasks.title,
                tasks.description,
                tasks.completed,
                tasks.created_at,
                tasks.updated_at,
                tasks.due_date,
                users.name as user_name,
                users.email as user_email
            FROM tasks 
            JOIN users ON tasks.user_id = users.id
            WHERE tasks.user_id = $1 
            ORDER BY tasks.created_at DESC
        `,
      [req.user.userId]
    );
    // Send the results back as JSON
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tasks",
    });
  }
});

// Endpoint to create a new task
app.post("/api/tasks", verifyToken, async (req, res) => {
  try {
    const { title, description, due_date } = req.body;

    // Validate required fields
    if (!title || !req.user.userId) {
      return res.status(400).json({
        success: false,
        error: "Title and user_id are required",
      });
    }

    // Insert the new task into the database
    const result = await db.query(
      `
            INSERT INTO tasks (title, description, user_id, due_date)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `,
      [title, description, req.user.userId, due_date]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create task",
    });
  }
});

// Get a specific task by ID
app.get("/api/tasks/:id", verifyToken, async (req, res) => {
  try {
    const taskId = req.params.id; // This captures the ID from the URL
    const userId = req.user.userId;

    // Query the database for the specific task
    const result = await db.query(
      `
      SELECT 
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.completed,
        tasks.created_at,
        tasks.updated_at,
        tasks.due_date,
        users.name as user_name,
        users.email as user_email
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.id = $1 AND tasks.user_id = $2
    `,
      [taskId, userId]
    );

    // Check if task exists
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    // Send back the single task
    res.json({
      success: true,
      message: "Task fetch successfully",
      data: result.rows[0], // Just the first (and only) result
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch task",
    });
  }
});

// PUT endpoint for updating tasks
// Protected endpoint - update task for authenticated user
app.put("/api/tasks/:id", verifyToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { title, description, due_date, completed } = req.body;

    // Validate the task ID
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid task ID",
      });
    }

    // First, check if the task exists and belongs to the authenticated user
    const existingTaskResult = await db.query(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [taskId, userId]
    );

    if (existingTaskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found or access denied",
      });
    }

    const existingTask = existingTaskResult.rows[0];

    // Server-side validation
    const validationErrors = [];

    if (!title || typeof title !== "string") {
      validationErrors.push("Title is required and must be a string");
    } else if (title.trim().length < 3) {
      validationErrors.push("Title must be at least 3 characters long");
    } else if (title.trim().length > 200) {
      validationErrors.push("Title cannot exceed 200 characters");
    }

    if (!description || typeof description !== "string") {
      validationErrors.push("Description is required and must be a string");
    } else if (description.trim().length < 10) {
      validationErrors.push("Description must be at least 10 characters long");
    } else if (description.trim().length > 1000) {
      validationErrors.push("Description cannot exceed 1000 characters");
    }

    if (!due_date) {
      validationErrors.push("Due date is required");
    } else {
      const dueDate = new Date(due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(dueDate.getTime())) {
        validationErrors.push("Due date must be a valid date");
      } else if (dueDate < today && !completed) {
        validationErrors.push(
          "Due date cannot be in the past for incomplete tasks"
        );
      }
    }

    // Validate completed status
    if (typeof completed !== "boolean") {
      validationErrors.push("Completed status must be a boolean value");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    // Sanitize input data
    const sanitizedTitle = title.trim();
    const sanitizedDescription = description.trim();

    // Check for meaningful changes
    const hasChanges =
      sanitizedTitle !== existingTask.title ||
      sanitizedDescription !== existingTask.description ||
      due_date !== existingTask.due_date.toISOString().split("T")[0] ||
      completed !== existingTask.completed;

    if (!hasChanges) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: existingTask,
      });
    }

    // Perform the update with user verification
    const updateResult = await db.query(
      `UPDATE tasks 
       SET title = $1, description = $2, due_date = $3, completed = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        sanitizedTitle,
        sanitizedDescription,
        due_date,
        completed,
        taskId,
        userId,
      ]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found or access denied",
      });
    }

    // Get the updated task with user information
    const updatedTaskWithUser = await db.query(
      `
      SELECT 
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.completed,
        tasks.created_at,
        tasks.updated_at,
        tasks.due_date,
        users.name as user_name,
        users.email as user_email
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.id = $1 AND tasks.user_id = $2
      `,
      [taskId, userId]
    );

    console.log(
      `Task updated successfully: ID ${taskId}, Title: "${sanitizedTitle}"`
    );

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: updatedTaskWithUser.rows[0],
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update task",
      message: "An internal server error occurred",
    });
  }
});

// DELETE endpoint for removing tasks
app.delete("/api/tasks/:id", verifyToken, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.userId;
    // Validate the task ID - ensure it's a valid number
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid task ID provided",
      });
    }

    // First, check if the task exists before attempting deletion
    // This helps us provide better error messages to the user
    const existingTaskResult = await db.query(
      "SELECT id, title FROM tasks WHERE id = $1 AND user_id = $2",
      [taskId, userId]
    );

    if (existingTaskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
        message:
          "The task you're trying to delete doesn't exist or has already been deleted",
      });
    }

    // Store task info for logging purposes before deletion
    const taskToDelete = existingTaskResult.rows[0];

    // Perform the actual deletion
    // Using RETURNING * helps us confirm the deletion was successful
    const deleteResult = await db.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *",
      [taskId, userId]
    );

    // Double-check that the deletion actually happened
    if (deleteResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to delete task",
        message: "The task could not be deleted due to an unexpected error",
      });
    }

    // Log the successful deletion for monitoring purposes
    console.log(
      `Task deleted successfully: ID ${taskId}, Title: "${deleteResult.title}"`
    );

    // Return success response with confirmation
    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: {
        deletedTaskId: taskId,
        deletedTaskTitle: taskToDelete.title,
      },
    });
  } catch (error) {
    // Handle any unexpected database errors
    console.error("Error deleting task:", error);

    // Check if this is a foreign key constraint error
    // This might happen if other tables reference this task
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        error: "Cannot delete task",
        message:
          "This task cannot be deleted because it's referenced by other records",
      });
    }

    // Generic error response for any other issues
    res.status(500).json({
      success: false,
      error: "Failed to delete task",
      message: "An internal server error occurred while deleting the task",
    });
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export the middleware so you can use it in other routes
module.exports = { verifyToken };
