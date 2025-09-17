const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const db = require("./database");
const fs = require("fs-extra");
const path = require("path");
const calculateFileHash = require("./utils/calculate-filehash");
const http = require("http");
const { Server } = require("socket.io");
const {
  upload,
  handleUploadErrors,
  generatePresignedUrl,
  deleteFromS3,
} = require("./middleware/s3_upload_middleware");
const verifyToken = require("./middleware/verifytoken");
const {
  loginLimiter,
  generateToken,
} = require("./utils/jwttoken-loginlimiter");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
console.log(require("crypto").randomBytes(32).toString("base64")); // 'hex'

// Middleware setup
app.use(cors());
app.use(express.json());

// Static file serving with basic security
app.use(
  "/uploads",
  express.static("uploads", {
    // Add security headers to prevent certain attacks
    setHeaders: (res, path, stat) => {
      res.set("X-Content-Type-Options", "nosniff");
      res.set("Content-Disposition", "inline"); // or 'attachment' to force download
    },
  })
);
// Test database connection on startup
db.testConnection();

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

/* MODIFIED: Update the existing tasks endpoint to work with projects
    Replace your existing GET /api/tasks endpoint with this version 
    Get all tasks end-point*/
app.get("/api/tasks", verifyToken, async (req, res) => {
  try {
    const { project_id } = req.query; // Allow filtering by project

    let query = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.completed,
        t.created_at,
        t.updated_at,
        t.due_date,
        t.project_id,
        p.name as project_name,
        u.name as user_name,
        u.email as user_email
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id = $1
    `;

    let params = [req.user.userId];

    // Add project filter if specified
    if (project_id) {
      query += ` AND t.project_id = $2`;
      params.push(parseInt(project_id));
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await db.query(query, params);

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

/* MODIFIED: Update the existing task creation endpoint to require project_id
    Replace your existing POST /api/tasks endpoint with this version 
    Create a task end-point*/
app.post("/api/tasks", verifyToken, async (req, res) => {
  try {
    const { title, description, due_date, project_id } = req.body;
    //const {project_id}

    // Validate required fields
    if (!title || !project_id) {
      return res.status(400).json({
        success: false,
        error: "Title and project_id are required",
      });
    }

    // Verify the project exists and belongs to the user
    const projectCheck = await db.query(
      "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
      [project_id, req.user.userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found or access denied",
      });
    }

    // Create the new task
    const result = await db.query(
      `
      INSERT INTO tasks (title, description, user_id, project_id, due_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [title, description, req.user.userId, project_id, due_date]
    );

    // *** ADD THIS WEBSOCKET BROADCASTING CODE ***
    const io = req.app.get("io");
    if (io) {
      const roomName = `project_${project_id}`;

      // Broadcast new task creation to project room
      io.to(roomName).emit("task_created", {
        task: result.rows[0],
        createdBy: {
          id: req.user.userId,
          username: req.user.username,
        },
        timestamp: new Date().toISOString(),
        changeType: "create",
      });

      console.log(`Broadcasted new task to room: ${roomName}`);
    }
    // *** END OF WEBSOCKET CODE ***

    res.status(201).json({
      success: true,
      message: "Task created successfully",
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
        tasks.project_id,
        tasks.due_date,
        users.name as user_name,
        users.email as user_email
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.id = $1 AND tasks.user_id = $2
      `,
      [taskId, userId]
    );

    /* Find your existing PUT /api/tasks/:id endpoint and add WebSocket broadcasting
    Add this code right before the final res.status(200).json() response:

    *** ADD THIS WEBSOCKET BROADCASTING CODE ***
    Get the Socket.io instance and broadcast the update to project room */
    const io = req.app.get("io");
    if (io && updatedTaskWithUser.rows[0].project_id) {
      const roomName = `project_${updatedTaskWithUser.rows[0].project_id}`;

      // Broadcast task update to all users in the project room
      io.to(roomName).emit("task_updated", {
        task: updatedTaskWithUser.rows[0],
        updatedBy: {
          id: req.user.userId,
          username: req.user.username,
        },
        timestamp: new Date().toISOString(),
        changeType: "update",
      });

      console.log(`Broadcasted task update to room: ${roomName}`);
    }
    // *** END OF WEBSOCKET CODE ***

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

    // *** ADD THIS WEBSOCKET BROADCASTING CODE ***
    const io = req.app.get("io");
    if (io && deleteResult.rows[0].project_id) {
      const roomName = `project_${deleteResult.rows[0].project_id}`;

      // Broadcast task deletion to project room
      io.to(roomName).emit("task_deleted", {
        taskId: taskId,
        taskTitle: taskToDelete.title,
        deletedBy: {
          id: req.user.userId,
          username: req.user.username,
        },
        timestamp: new Date().toISOString(),
        changeType: "delete",
      });

      console.log(`Broadcasted task deletion to room: ${roomName}`);
    }
    // *** END OF WEBSOCKET CODE ***

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

// GET /api/projects - Fetch all projects for the authenticated user
app.get("/api/projects", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = $1
      GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
      `,
      [req.user.userId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch projects",
    });
  }
});

// POST /api/projects - Create a new project
app.post("/api/projects", verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error:
          "Project name is required and must be at least 3 characters long",
      });
    }

    // Check if project name already exists for this user
    const existingProject = await db.query(
      "SELECT id FROM projects  WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
      [req.user.userId, name.trim()]
    );

    if (existingProject.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "A project with this name already exists",
      });
    }

    // Create the new project
    const result = await db.query(
      `
      INSERT INTO projects (name, description, user_id)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [name.trim(), description?.trim() || null, req.user.userId]
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create project",
    });
  }
});

// GET /api/projects/with-tasks - Fetch all projects with their tasks for authenticated user
// This endpoint provides a comprehensive view of the user's project structure
app.get("/api/projects/with-tasks", verifyToken, async (req, res) => {
  try {
    // Extract optional query parameters for filtering and pagination
    const {
      include_completed = "true", // Whether to include completed tasks
      include_empty_projects = "true", // Whether to include projects with no tasks
      limit, // Optional limit on number of projects
      offset = 0, // Pagination offset
    } = req.query;

    console.log(`Fetching projects with tasks for user ${req.user.userId}`);

    // Step 1: Build the main query to get projects with task counts
    // We use LEFT JOIN to ensure we get projects even if they have no tasks
    // The aggregation functions help us get useful statistics about each project
    let projectsQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        COUNT(t.id) as total_task_count,
        COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_task_count,
        COUNT(CASE WHEN t.completed = false THEN 1 END) as pending_task_count,
        COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.completed = false THEN 1 END) as overdue_task_count,
        MAX(t.updated_at) as last_task_activity
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = $1
    `;

    let queryParams = [req.user.userId];
    let paramIndex = 2;

    // Step 2: Add filtering based on include_empty_projects parameter
    // This allows clients to exclude projects that have no tasks
    if (include_empty_projects === "false") {
      projectsQuery += ` AND EXISTS (SELECT 1 FROM tasks WHERE project_id = p.id)`;
    }

    // Group by all non-aggregated columns (required for PostgreSQL)
    projectsQuery += ` 
      GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;

    // Step 3: Add pagination if limit is specified
    // Pagination helps manage large datasets and improves performance
    if (limit) {
      projectsQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit), parseInt(offset));
    }

    // Execute the projects query
    const projectsResult = await db.query(projectsQuery, queryParams);

    // Step 4: If no projects found, return early with empty result
    // This avoids unnecessary database queries when user has no projects
    if (projectsResult.rows.length === 0) {
      return res.json({
        success: true,
        message: "No projects found for this user",
        data: [],
        summary: {
          total_projects: 0,
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          overdue_tasks: 0,
        },
      });
    }

    // Step 5: Get project IDs for the tasks query
    // We'll fetch all tasks for the returned projects in a single query
    const projectIds = projectsResult.rows.map((project) => project.id);

    // Step 6: Build and execute the tasks query
    // This fetches all tasks for the projects we found, with optional filtering
    let tasksQuery = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.completed,
        t.created_at,
        t.updated_at,
        t.due_date,
        t.project_id,
        -- Calculate if task is overdue
        CASE 
          WHEN t.due_date < CURRENT_DATE AND t.completed = false THEN true
          ELSE false
        END as is_overdue,
        -- Calculate days until due (negative if overdue)
        CASE 
          WHEN t.due_date IS NOT NULL THEN 
            EXTRACT(DAYS FROM (t.due_date - CURRENT_DATE))::integer
          ELSE NULL
        END as days_until_due
      FROM tasks t
      WHERE t.project_id = ANY($1)
    `;

    const taskParams = [projectIds];

    // Add completed task filtering if requested
    if (include_completed === "false") {
      tasksQuery += ` AND t.completed = false`;
    }

    // Order tasks by due date (nulls last) and creation date
    tasksQuery += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;

    const tasksResult = await db.query(tasksQuery, taskParams);

    // Step 7: Group tasks by project_id for efficient lookup
    // This creates a map where each key is a project ID and value is array of tasks
    const tasksByProject = {};
    tasksResult.rows.forEach((task) => {
      if (!tasksByProject[task.project_id]) {
        tasksByProject[task.project_id] = [];
      }
      tasksByProject[task.project_id].push(task);
    });

    // Step 8: Combine projects with their tasks and calculate additional metrics
    // We enhance each project object with its tasks and computed statistics
    const projectsWithTasks = projectsResult.rows.map((project) => {
      const projectTasks = tasksByProject[project.id] || [];

      // Calculate additional project-level metrics
      const upcomingTasks = projectTasks.filter(
        (task) =>
          !task.completed &&
          task.due_date &&
          task.days_until_due !== null &&
          task.days_until_due >= 0 &&
          task.days_until_due <= 7
      );

      const recentActivity = projectTasks.filter((task) => {
        const daysSinceUpdate =
          (Date.now() - new Date(task.updated_at).getTime()) /
          (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 7;
      });

      return {
        // Project basic information
        id: project.id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        updated_at: project.updated_at,

        // Task statistics (from aggregation query)
        statistics: {
          total_tasks: parseInt(project.total_task_count),
          completed_tasks: parseInt(project.completed_task_count),
          pending_tasks: parseInt(project.pending_task_count),
          overdue_tasks: parseInt(project.overdue_task_count),
          upcoming_tasks: upcomingTasks.length, // Due within 7 days
          recent_activity_count: recentActivity.length, // Updated within 7 days
          completion_percentage:
            project.total_task_count > 0
              ? Math.round(
                  (project.completed_task_count / project.total_task_count) *
                    100
                )
              : 0,
        },

        // Project status indicators
        status: {
          has_tasks: parseInt(project.total_task_count) > 0,
          has_overdue_tasks: parseInt(project.overdue_task_count) > 0,
          has_upcoming_deadlines: upcomingTasks.length > 0,
          is_completed:
            parseInt(project.total_task_count) > 0 &&
            parseInt(project.completed_task_count) ===
              parseInt(project.total_task_count),
          last_activity: project.last_task_activity,
        },

        // All tasks for this project
        tasks: projectTasks,
      };
    });

    // Step 9: Calculate overall summary statistics
    // This provides useful aggregate information across all projects
    const summary = {
      total_projects: projectsWithTasks.length,
      projects_with_tasks: projectsWithTasks.filter(
        (p) => p.statistics.total_tasks > 0
      ).length,
      total_tasks: projectsWithTasks.reduce(
        (sum, p) => sum + p.statistics.total_tasks,
        0
      ),
      completed_tasks: projectsWithTasks.reduce(
        (sum, p) => sum + p.statistics.completed_tasks,
        0
      ),
      pending_tasks: projectsWithTasks.reduce(
        (sum, p) => sum + p.statistics.pending_tasks,
        0
      ),
      overdue_tasks: projectsWithTasks.reduce(
        (sum, p) => sum + p.statistics.overdue_tasks,
        0
      ),
      projects_with_overdue_tasks: projectsWithTasks.filter(
        (p) => p.statistics.overdue_tasks > 0
      ).length,
      overall_completion_percentage: 0,
    };

    // Calculate overall completion percentage
    if (summary.total_tasks > 0) {
      summary.overall_completion_percentage = Math.round(
        (summary.completed_tasks / summary.total_tasks) * 100
      );
    }

    // Step 10: Log successful operation for monitoring
    console.log(
      `Successfully retrieved ${summary.total_projects} projects with ${summary.total_tasks} tasks for user ${req.user.userId}`
    );

    // Step 11: Return the comprehensive response
    res.json({
      success: true,
      message: `Retrieved ${summary.total_projects} projects with their tasks`,
      data: projectsWithTasks,
      summary: summary,
      // Include pagination info if limit was used
      ...(limit && {
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          returned_count: projectsWithTasks.length,
        },
      }),
    });
  } catch (error) {
    console.error("Error fetching projects with tasks:", error);

    // Provide specific error handling for common database issues
    if (error.code === "42P01") {
      return res.status(500).json({
        success: false,
        error: "Database schema error",
        message: "Required tables not found. Please check database setup.",
      });
    }

    if (error.code === "42703") {
      return res.status(500).json({
        success: false,
        error: "Database column error",
        message: "Required columns not found. Please check database schema.",
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: "Failed to fetch projects with tasks",
      message: "An internal server error occurred while retrieving the data",
    });
  }
});

// GET /api/projects/:id - Get a specific project with its tasks
app.get("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid project ID",
      });
    }

    // Get project details
    const projectResult = await db.query(
      `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        u.name as name
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND p.user_id = $2
      `,
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Get all tasks for this project
    const tasksResult = await db.query(
      `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.completed,
        t.created_at,
        t.updated_at,
        t.due_date,
        t.project_id
      FROM tasks t
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
      `,
      [projectId]
    );

    // Combine project and tasks data
    const projectWithTasks = {
      ...projectResult.rows[0],
      tasks: tasksResult.rows,
      task_count: tasksResult.rows.length,
      completed_count: tasksResult.rows.filter((task) => task.completed).length,
    };

    res.json({
      success: true,
      data: projectWithTasks,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch project",
    });
  }
});

// PUT /api/projects/:id - Update a project
app.put("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { name, description } = req.body;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid project ID",
      });
    }

    // Validate input
    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error:
          "Project name is required and must be at least 3 characters long",
      });
    }

    // Check if project exists and belongs to user
    const existingProject = await db.query(
      "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
      [projectId, userId]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found or access denied",
      });
    }

    // Check for name conflicts (excluding current project)
    const nameConflict = await db.query(
      "SELECT id FROM projects WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3",
      [userId, name.trim(), projectId]
    );

    if (nameConflict.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "A project with this name already exists",
      });
    }

    // Update the project
    const result = await db.query(
      `
      UPDATE projects 
      SET name = $1, description = $2, updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING *
      `,
      [name.trim(), description?.trim() || null, projectId, userId]
    );

    res.json({
      success: true,
      message: "Project updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update project",
    });
  }
});

// DELETE /api/projects/:id - Delete a project and all its tasks
app.delete("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid project ID",
      });
    }

    // Check if project exists and belongs to user
    const existingProject = await db.query(
      "SELECT name FROM projects WHERE id = $1 AND user_id = $2",
      [projectId, userId]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found or access denied",
      });
    }

    // Get task count for confirmation
    const taskCount = await db.query(
      "SELECT COUNT(*) as count FROM tasks WHERE project_id = $1",
      [projectId]
    );

    // Delete the project (CASCADE will handle related tasks)
    const deleteResult = await db.query(
      "DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *",
      [projectId, userId]
    );

    res.json({
      success: true,
      message: "Project and all associated tasks deleted successfully",
      data: {
        deletedProjectId: projectId,
        deletedProjectName: existingProject.rows[0].name,
        deletedTaskCount: parseInt(taskCount.rows[0].count),
      },
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete project",
    });
  }
});

/* Replace your existing file upload endpoints with these S3 - compatible versions
 POST /api/files - Upload single file to S3 */
app.post(
  "/api/files",
  verifyToken,
  upload.single("file"),
  handleUploadErrors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
          message: "Please select a file to upload",
        });
      }

      const { task_id, task_ids, project_id, description } = req.body;

      console.log(
        `Processing S3 upload for user ${req.user.userId}: ${req.file.originalname}`
      );

      // Handle task IDs validation (same as before)
      let taskIdsToProcess = [];
      if (task_id) {
        taskIdsToProcess = [parseInt(task_id)];
      } else if (task_ids) {
        if (Array.isArray(task_ids)) {
          taskIdsToProcess = task_ids.map((id) => parseInt(id));
        } else if (typeof task_ids === "string") {
          taskIdsToProcess = task_ids
            .split(",")
            .map((id) => parseInt(id.trim()));
        }
      }

      // Validate tasks and project (same validation logic)
      if (taskIdsToProcess.length > 0) {
        const taskCheck = await db.query(
          "SELECT id FROM tasks WHERE id = ANY($1) AND user_id = $2",
          [taskIdsToProcess, req.user.userId]
        );

        if (taskCheck.rows.length !== taskIdsToProcess.length) {
          return res.status(404).json({
            success: false,
            error: "One or more tasks not found or access denied",
          });
        }
      }

      if (project_id) {
        const projectExists = await db.query(
          "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
          [parseInt(project_id), req.user.userId]
        );

        if (projectExists.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: "Project not found or access denied",
          });
        }
      }

      const createdFiles = [];

      // Prepare file data for database insertion
      const storedFilename = req.file.key.split("/").pop(); // Extract filename from S3 key
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const filePath = req.file.key; // Use S3 key as file_path

      // Generate upload hash for file validation (optional)
      const crypto = require("crypto");
      const uploadHash = crypto
        .createHash("md5")
        .update(req.file.key + Date.now())
        .digest("hex");

      // Store file information in database with correct column names matching your schema
      if (taskIdsToProcess.length === 0) {
        const fileRecord = await db.query(
          `INSERT INTO files (
            filename, stored_filename, file_path, file_size, mime_type, 
            file_extension, upload_hash, is_validated, user_id, task_id, 
            project_id, s3_key, s3_url, storage_provider
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
          RETURNING *`,
          [
            req.file.originalname, // filename (original name)
            storedFilename, // stored_filename (filename in S3)
            filePath, // file_path (S3 key path)
            req.file.size, // file_size
            req.file.mimetype, // mime_type
            fileExtension, // file_extension
            uploadHash, // upload_hash
            true, // is_validated (set to true for S3 uploads)
            req.user.userId, // user_id
            null, // task_id (null when no specific task)
            project_id ? parseInt(project_id) : null, // project_id
            req.file.key, // s3_key
            req.file.location, // s3_url
            "s3", // storage_provider
          ]
        );
        createdFiles.push(fileRecord.rows[0]);
      } else {
        // Create record for each task
        for (const taskId of taskIdsToProcess) {
          const fileRecord = await db.query(
            `INSERT INTO files (
              filename, stored_filename, file_path, file_size, mime_type, 
              file_extension, upload_hash, is_validated, user_id, task_id, 
              project_id, s3_key, s3_url, storage_provider
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
            RETURNING *`,
            [
              req.file.originalname, // filename (original name)
              storedFilename, // stored_filename (filename in S3)
              filePath, // file_path (S3 key path)
              req.file.size, // file_size
              req.file.mimetype, // mime_type
              fileExtension, // file_extension
              uploadHash, // upload_hash
              true, // is_validated
              req.user.userId, // user_id
              taskId, // task_id
              project_id ? parseInt(project_id) : null, // project_id
              req.file.key, // s3_key
              req.file.location, // s3_url
              "s3", // storage_provider
            ]
          );
          createdFiles.push(fileRecord.rows[0]);
        }
      }

      console.log(`File uploaded to S3 successfully: ${req.file.key}`);

      const primaryRecord = createdFiles[0];

      res.status(201).json({
        success: true,
        message: `File uploaded successfully to S3 and associated with ${createdFiles.length} task(s)`,
        data: {
          id: primaryRecord.id,
          filename: primaryRecord.filename,
          stored_filename: primaryRecord.stored_filename,
          file_path: primaryRecord.file_path,
          s3_key: primaryRecord.s3_key,
          s3_url: primaryRecord.s3_url,
          file_size: primaryRecord.file_size,
          mime_type: primaryRecord.mime_type,
          file_extension: primaryRecord.file_extension,
          task_id: primaryRecord.task_id,
          project_id: primaryRecord.project_id,
          is_validated: primaryRecord.is_validated,
          created_at: primaryRecord.created_at,
          total_associations: createdFiles.length,
          associated_task_ids: createdFiles
            .map((f) => f.task_id)
            .filter(Boolean),
        },
      });
    } catch (error) {
      console.error("S3 file upload error:", error);

      res.status(500).json({
        success: false,
        error: "File upload failed",
        message: "An error occurred while uploading to S3",
      });
    }
  }
);

// GET /api/files/:id/download - Generate presigned URL for secure download
app.get("/api/files/:id/download", verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file ID",
      });
    }

    // Get file information from database
    const result = await db.query(
      `SELECT filename, s3_key, s3_url, mime_type, file_size, storage_provider
       FROM files 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [fileId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    const fileInfo = result.rows[0];

    // Check if file is stored in S3
    if (fileInfo.storage_provider !== "s3" || !fileInfo.s3_key) {
      return res.status(400).json({
        success: false,
        error: "File not stored in S3 or missing S3 key",
      });
    }

    try {
      // Generate presigned URL valid for 1 hour
      const presignedUrl = await generatePresignedUrl(fileInfo.s3_key, 3600);

      res.json({
        success: true,
        data: {
          download_url: presignedUrl,
          filename: fileInfo.filename,
          file_size: fileInfo.file_size,
          mime_type: fileInfo.mime_type,
          expires_in: 3600, // seconds
        },
      });
    } catch (s3Error) {
      console.error(
        `Error generating presigned URL for ${fileInfo.s3_key}:`,
        s3Error
      );
      return res.status(500).json({
        success: false,
        error: "Failed to generate download URL",
      });
    }
  } catch (error) {
    console.error("Error processing download request:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process download request",
    });
  }
});

// DELETE /api/files/:id - Delete file from S3 and database
app.delete("/api/files/:id", verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file ID",
      });
    }

    // Get file information before deletion
    const fileResult = await db.query(
      "SELECT s3_key, filename, storage_provider FROM files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [fileId, req.user.userId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "File not found or already deleted",
      });
    }

    const fileInfo = fileResult.rows[0];

    // Delete from S3 if it's stored there
    if (fileInfo.storage_provider === "s3" && fileInfo.s3_key) {
      const s3DeleteSuccess = await deleteFromS3(fileInfo.s3_key);
      if (!s3DeleteSuccess) {
        console.warn(
          `Failed to delete ${fileInfo.s3_key} from S3, but continuing with database deletion`
        );
      }
    }

    // Soft delete from database
    const result = await db.query(
      `UPDATE files 
       SET deleted_at = $1, updated_at = $1
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING id, filename`,
      [new Date(), fileId, req.user.userId]
    );

    res.json({
      success: true,
      message: "File deleted successfully from S3 and database",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete file",
    });
  }
});

// POST /api/files/multiple - Upload multiple files at once
app.post(
  "/api/files/multiple",
  verifyToken,
  upload.array("files", 10),
  handleUploadErrors,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files provided",
          message: "Please select at least one file to upload",
        });
      }

      const { task_id, project_id } = req.body;
      const uploadedFiles = [];
      const failedFiles = [];

      console.log(
        `Processing ${req.files.length} files for user ${req.user.userId}`
      );

      // Validate associations once if provided
      if (task_id) {
        const taskExists = await db.query(
          "SELECT id FROM tasks WHERE id = $1 AND user_id = $2",
          [parseInt(task_id), req.user.userId]
        );

        if (taskExists.rows.length === 0) {
          // Clean up all uploaded files
          for (const file of req.files) {
            await fs.remove(file.path);
          }
          return res.status(404).json({
            success: false,
            error: "Task not found or access denied",
          });
        }
      }

      // Process each file individually
      for (const file of req.files) {
        try {
          const fileHash = await calculateFileHash(file.path);

          const fileRecord = await db.query(
            `INSERT INTO files (
            filename, stored_filename, file_path, file_size, mime_type, 
            file_extension, upload_hash, user_id, task_id, project_id, is_validated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
          RETURNING id, filename, file_size, mime_type, created_at`,
            [
              file.originalname,
              file.filename,
              file.path,
              file.size,
              file.mimetype,
              path.extname(file.originalname).toLowerCase(),
              fileHash,
              req.user.userId,
              task_id ? parseInt(task_id) : null,
              project_id ? parseInt(project_id) : null,
              true,
            ]
          );

          uploadedFiles.push(fileRecord.rows[0]);
          console.log(`Successfully processed: ${file.originalname}`);
        } catch (error) {
          console.error(`Failed to process file ${file.originalname}:`, error);
          failedFiles.push({
            filename: file.originalname,
            error: "Database insertion failed",
          });

          // Clean up this specific file
          try {
            await fs.remove(file.path);
          } catch (cleanupError) {
            console.error(`Failed to cleanup ${file.path}:`, cleanupError);
          }
        }
      }

      // Return response with results
      const response = {
        success: uploadedFiles.length > 0,
        message: `${uploadedFiles.length} of ${req.files.length} files uploaded successfully`,
        data: {
          uploaded: uploadedFiles,
          failed: failedFiles,
          total_attempted: req.files.length,
          successful_count: uploadedFiles.length,
          failed_count: failedFiles.length,
        },
      };

      const statusCode = failedFiles.length > 0 ? 207 : 201; // 207 = Multi-Status
      res.status(statusCode).json(response);
    } catch (error) {
      console.error("Multiple file upload error:", error);

      // Clean up all uploaded files on complete failure
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.remove(file.path);
          } catch (cleanupError) {
            console.error(`Failed to cleanup ${file.path}:`, cleanupError);
          }
        }
      }

      res.status(500).json({
        success: false,
        error: "Multiple file upload failed",
        message: "An error occurred while processing your file uploads",
      });
    }
  }
);

// GET /api/files - List files for authenticated user with optional filtering
app.get("/api/files", verifyToken, async (req, res) => {
  try {
    const { task_id, project_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        f.id,
        f.filename,
        f.file_size,
        f.mime_type,
        f.file_extension,
        f.created_at,
        f.updated_at,
        f.task_id,
        f.project_id,
        t.title as task_title,
        p.name as project_name
      FROM files f
      LEFT JOIN tasks t ON f.task_id = t.id
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.user_id = $1 AND f.deleted_at IS NULL
    `;

    const params = [req.user.userId];
    let paramIndex = 2;

    // Add filters if provided
    if (task_id) {
      query += ` AND f.task_id = $${paramIndex}`;
      params.push(parseInt(task_id));
      paramIndex++;
    }

    if (project_id) {
      query += ` AND f.project_id = $${paramIndex}`;
      params.push(parseInt(project_id));
      paramIndex++;
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count for pagination - this needs to match the main query filters exactly
    let countQuery = `
  SELECT COUNT(*) as total
  FROM files f  
  WHERE f.user_id = $1 AND f.deleted_at IS NULL
`;
    const countParams = [req.user.userId];
    let countParamIndex = 2;

    // Apply the same filters to the count query as the main query
    if (task_id) {
      countQuery += ` AND f.task_id = $${countParamIndex}`;
      countParams.push(parseInt(task_id));
      countParamIndex++;
    }

    if (project_id) {
      countQuery += ` AND f.project_id = $${countParamIndex}`;
      countParams.push(parseInt(project_id));
      countParamIndex++;
    }
    const countResult = await db.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more:
          parseInt(offset) + result.rows.length <
          parseInt(countResult.rows[0].total),
      },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch files",
    });
  }
});

// GET /api/files/:id/download - Download a file
app.get("/api/files/:id/download", verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file ID",
      });
    }

    // Get file information from database
    const result = await db.query(
      `SELECT filename, stored_filename, file_path, mime_type, file_size, upload_hash
       FROM files 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [fileId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    const fileInfo = result.rows[0];
    const filePath = path.resolve(fileInfo.file_path);

    // Verify file still exists on disk
    const fileExists = await fs.pathExists(filePath);
    if (!fileExists) {
      console.error(`File missing from disk: ${filePath}`);
      console.error(`File missing: ${filePath}`);
      console.error(`Stored path: ${fileInfo.file_path}`);
      console.error(`Resolved path: ${filePath}`);
      return res.status(404).json({
        success: false,
        error: "File not found on server",
      });
    }

    // Optional: Verify file integrity
    try {
      const currentHash = await calculateFileHash(filePath);
      if (currentHash !== fileInfo.upload_hash) {
        console.error(`File integrity check failed for ${filePath}`);
        return res.status(500).json({
          success: false,
          error: "File integrity verification failed",
        });
      }
    } catch (hashError) {
      console.warn(
        `Could not verify file integrity for ${filePath}:`,
        hashError
      );
      // Continue with download - hash verification is optional
    }

    // Set appropriate headers for download
    res.setHeader("Content-Type", fileInfo.mime_type);
    res.setHeader("Content-Length", fileInfo.file_size);

    // Safely encode filename for Content-Disposition header
    // This handles special characters and prevents header injection attacks
    const safeFilename = fileInfo.filename.replace(/[^\w\-_.]/g, "_");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`
    );

    // Add cache control headers for better performance
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader(
      "Last-Modified",
      new Date(fileInfo.updated_at || fileInfo.created_at).toUTCString()
    );

    // Stream the file to the client
    // Using streams is memory-efficient for large files
    const fileStream = fs.createReadStream(filePath);

    // Handle stream errors gracefully
    fileStream.on("error", (streamError) => {
      console.error(`Stream error for file ${filePath}:`, streamError);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: "Error reading file",
        });
      }
    });

    // Pipe the file stream directly to the response
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to download file",
      });
    }
  }
});

// PUT /api/files/:id - Update file metadata (rename or change associations)
app.put("/api/files/:id", verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const { filename, task_id, project_id } = req.body;

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file ID",
      });
    }

    // Verify file exists and user owns it
    const existingFile = await db.query(
      "SELECT id FROM files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [fileId, req.user.userId]
    );

    if (existingFile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "File not found or access denied",
      });
    }

    // Build dynamic update query based on provided fields
    let updateFields = [];
    let updateValues = [];
    let valueIndex = 1;

    if (filename && filename.trim()) {
      updateFields.push(`filename = $${valueIndex++}`);
      updateValues.push(filename.trim());
    }

    if (task_id !== undefined) {
      // Verify task exists and user owns it if task_id is not null
      if (task_id !== null) {
        const taskCheck = await db.query(
          "SELECT id FROM tasks WHERE id = $1 AND user_id = $2",
          [task_id, req.user.userId]
        );

        if (taskCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: "Invalid task ID or access denied",
          });
        }
      }
      updateFields.push(`task_id = $${valueIndex++}`);
      updateValues.push(task_id);
    }

    if (project_id !== undefined) {
      // Verify project exists and user owns it if project_id is not null
      if (project_id !== null) {
        const projectCheck = await db.query(
          "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
          [project_id, req.user.userId]
        );
        if (projectCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: "Invalid project ID or access denied",
          });
        }
      }
      updateFields.push(`project_id = $${valueIndex++}`);
      updateValues.push(project_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields provided for update",
      });
    }

    // Add updated_at and file ID to the query
    updateFields.push(`updated_at = $${valueIndex++}`);
    updateValues.push(new Date());
    updateValues.push(fileId);

    const updateQuery = `
      UPDATE files 
      SET ${updateFields.join(", ")}
      WHERE id = $${valueIndex}
      RETURNING id, filename, task_id, project_id, updated_at
    `;

    const result = await db.query(updateQuery, updateValues);

    res.json({
      success: true,
      message: "File updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update file",
    });
  }
});

// DELETE /api/files/:id - Soft delete a file
app.delete("/api/files/:id", verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file ID",
      });
    }

    // Verify file exists and user owns it
    const result = await db.query(
      `UPDATE files 
       SET deleted_at = $1, updated_at = $1
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING id, filename`,
      [new Date(), fileId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "File not found or already deleted",
      });
    }

    res.json({
      success: true,
      message: "File deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete file",
    });
  }
});

// POST /api/files/:id/  - Restore a soft-deleted file
app.post("/api/files/:id/restore", verifyToken, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    if (!fileId || isNaN(fileId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file ID",
      });
    }

    // Restore the file by setting deleted_at to NULL
    const result = await db.query(
      `UPDATE files 
       SET deleted_at = NULL, updated_at = $1
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NOT NULL
       RETURNING id, filename, created_at`,
      [new Date(), fileId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "File not found or not deleted",
      });
    }

    res.json({
      success: true,
      message: "File restored successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error restoring file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to restore file",
    });
  }
});

// GET /api/files/deleted - List soft-deleted files
app.get("/api/files/deleted", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        f.id,
        f.filename,
        f.file_size,
        f.mime_type,
        f.created_at,
        f.deleted_at,
        f.task_id,
        f.project_id,
        t.title as task_title,
        p.name as project_name
      FROM files f
      LEFT JOIN tasks t ON f.task_id = t.id
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.user_id = $1 AND f.deleted_at IS NOT NULL
      ORDER BY f.deleted_at DESC
      `,
      [req.user.userId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching deleted files:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch deleted files",
    });
  }
});

// GET /api/projects/:id/files - Get all files for a specific project
// This endpoint follows RESTful conventions: /resource/:id/sub-resource
app.get("/api/projects/:id/files", verifyToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.userId;

    // Extract pagination and filtering options from query parameters
    const {
      limit = 50,
      offset = 0,
      include_deleted = false, // Option to include soft-deleted files
    } = req.query;

    // Validate the project ID parameter
    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid project ID provided",
      });
    }

    // First, verify the project exists and the user has access to it
    // This is crucial for security - we don't want users accessing files
    // from projects they don't own
    const projectCheck = await db.query(
      "SELECT id, name FROM projects WHERE id = $1 AND user_id = $2",
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found or access denied",
        message:
          "The requested project doesn't exist or you don't have permission to view it",
      });
    }

    const projectInfo = projectCheck.rows[0];

    // Build the main query to fetch files for this project
    let filesQuery = `
      SELECT 
        f.id,
        f.filename,
        f.file_size,
        f.mime_type,
        f.file_extension,
        f.created_at,
        f.updated_at,
        f.deleted_at,
        f.task_id,
        t.title as task_title,
        t.completed as task_completed
      FROM files f
      LEFT JOIN tasks t ON f.task_id = t.id AND t.project_id = $1
      WHERE f.project_id = $1 AND f.user_id = $2
    `;

    const queryParams = [projectId, userId];
    let paramIndex = 3;

    // Add deletion filter based on include_deleted parameter
    if (include_deleted !== "true") {
      filesQuery += ` AND f.deleted_at IS NULL`;
    }

    // Add pagination
    filesQuery += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute the main query
    const filesResult = await db.query(filesQuery, queryParams);

    // Get total count for pagination metadata
    let countQuery = `
      SELECT COUNT(*) as total
      FROM files f  
      WHERE f.project_id = $1 AND f.user_id = $2
    `;

    const countParams = [projectId, userId];

    if (include_deleted !== "true") {
      countQuery += ` AND f.deleted_at IS NULL`;
    }

    const countResult = await db.query(countQuery, countParams);
    const totalFiles = parseInt(countResult.rows[0].total);

    // Calculate some useful statistics for the project
    const statsQuery = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_files,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_files,
        SUM(CASE WHEN deleted_at IS NULL THEN file_size ELSE 0 END) as total_size_bytes,
        COUNT(DISTINCT task_id) as tasks_with_files
      FROM files 
      WHERE project_id = $1 AND user_id = $2
    `;

    const statsResult = await db.query(statsQuery, [projectId, userId]);
    const stats = statsResult.rows[0];

    // Format the response with comprehensive information
    const response = {
      success: true,
      message: `Retrieved files for project: ${projectInfo.name}`,
      data: {
        project: {
          id: projectInfo.id,
          name: projectInfo.name,
        },
        files: filesResult.rows,
        statistics: {
          total_files: parseInt(stats.total_files),
          active_files: parseInt(stats.active_files),
          deleted_files: parseInt(stats.deleted_files),
          total_size_bytes: parseInt(stats.total_size_bytes || 0),
          total_size_mb:
            Math.round(((stats.total_size_bytes || 0) / (1024 * 1024)) * 100) /
            100,
          tasks_with_files: parseInt(stats.tasks_with_files),
        },
        pagination: {
          total: totalFiles,
          limit: parseInt(limit),
          offset: parseInt(offset),
          current_page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
          total_pages: Math.ceil(totalFiles / parseInt(limit)),
          has_more: parseInt(offset) + filesResult.rows.length < totalFiles,
          has_previous: parseInt(offset) > 0,
        },
      },
    };

    // Log successful access for monitoring purposes
    console.log(
      `Files retrieved for project ${projectId} (${projectInfo.name}): ${filesResult.rows.length} files returned`
    );

    res.json(response);
  } catch (error) {
    console.error("Error fetching project files:", error);

    // Provide different error messages based on the type of error
    if (error.code === "22P02") {
      // Invalid input syntax for integer
      return res.status(400).json({
        success: false,
        error: "Invalid project ID format",
        message: "Project ID must be a valid number",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to fetch project files",
      message: "An internal server error occurred while retrieving the files",
    });
  }
});

/* app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
 */

// Create HTTP server and integrate Socket.io
const server = http.createServer(app);
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

app.set("io", io);

// Add this after your Socket.io server setup but before the connection handler

// Middleware to authenticate Socket.io connections
io.use(async (socket, next) => {
  try {
    // Get the token from the client connection
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Verify the token (reusing your existing JWT verification logic)
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details from database
    const user = await db.query(
      "SELECT id, username, email, name FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (user.rows.length === 0) {
      return next(new Error("User not found"));
    }

    // Attach user info to socket object
    socket.user = {
      id: decoded.userId,
      username: decoded.username,
      ...user.rows[0],
    };

    console.log(
      `Authenticated WebSocket connection for user: ${socket.user.username}`
    );
    next();
  } catch (error) {
    console.error("WebSocket authentication error:", error);
    next(new Error("Invalid authentication token"));
  }
});

// Basic connection handling - we'll expand this
// Replace your basic connection handler with this enhanced version:
// Add this enhanced error handling to your io.on('connection') handler:

io.on("connection", (socket) => {
  console.log(
    `User ${socket.user.username} connected with socket ID: ${socket.id}`
  );

  // Enhanced join_project with better error handling
  socket.on("join_project", async (projectId) => {
    try {
      // Validate input
      if (!projectId || isNaN(projectId)) {
        socket.emit("error", { message: "Invalid project ID" });
        return;
      }

      // Leave current project if user is switching projects
      if (socket.currentProject) {
        socket.leave(socket.currentProject.room);
        console.log(
          `User ${socket.user.username} left project: ${socket.currentProject.name}`
        );
      }

      // Verify user has access to this project
      const projectAccess = await db.query(
        "SELECT id, name FROM projects WHERE id = $1 AND user_id = $2",
        [projectId, socket.user.id]
      );

      if (projectAccess.rows.length === 0) {
        socket.emit("error", {
          message: "Project not found or access denied",
          code: "PROJECT_ACCESS_DENIED",
        });
        return;
      }

      // Join the project room
      const roomName = `project_${projectId}`;
      socket.join(roomName);

      // Store current project on socket for cleanup
      socket.currentProject = {
        id: projectId,
        name: projectAccess.rows[0].name,
        room: roomName,
      };

      console.log(
        `User ${socket.user.username} joined project: ${projectAccess.rows[0].name}`
      );

      // Notify user they successfully joined
      socket.emit("joined_project", {
        projectId: projectId,
        projectName: projectAccess.rows[0].name,
      });

      // Optionally, notify other users in the project that someone joined
      socket.to(roomName).emit("user_joined_project", {
        user: {
          id: socket.user.id,
          username: socket.user.username,
        },
        projectId: projectId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in join_project:", error);
      socket.emit("error", {
        message: "Failed to join project",
        code: "JOIN_PROJECT_ERROR",
      });
    }
  });

  // Enhanced leave_project
  socket.on("leave_project", () => {
    if (socket.currentProject) {
      const roomName = socket.currentProject.room;

      // Notify others that user left
      socket.to(roomName).emit("user_left_project", {
        user: {
          id: socket.user.id,
          username: socket.user.username,
        },
        projectId: socket.currentProject.id,
        timestamp: new Date().toISOString(),
      });

      socket.leave(roomName);
      console.log(
        `User ${socket.user.username} left project: ${socket.currentProject.name}`
      );

      socket.currentProject = null;
      socket.emit("left_project", { message: "Successfully left project" });
    }
  });

  // Handle disconnection with cleanup
  socket.on("disconnect", (reason) => {
    if (socket.currentProject) {
      // Notify others in project that user disconnected
      socket.to(socket.currentProject.room).emit("user_left_project", {
        user: {
          id: socket.user.id,
          username: socket.user.username,
        },
        projectId: socket.currentProject.id,
        timestamp: new Date().toISOString(),
        reason: "disconnected",
      });
    }
    console.log(`User ${socket.user.username} disconnected (${reason})`);
  });

  // Handle any WebSocket errors
  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.user.username}:`, error);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("WebSocket server is ready");
});
