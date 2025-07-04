const express = require("express");
const cors = require("cors");
const db = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(cors());
app.use(express.json());

// Test database connection on startup
db.testConnection();

// Your first real API endpoint - get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    // Query the database for all tasks with user information
    const result = await db.query(`
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
            ORDER BY tasks.created_at DESC
        `);
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
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description, user_id, due_date } = req.body;

    // Validate required fields
    if (!title || !user_id) {
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
      [title, description, user_id, due_date]
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
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const taskId = req.params.id; // This captures the ID from the URL

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
      WHERE tasks.id = $1
    `,
      [taskId]
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
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    console.log("🚀 ~ app.put ~ req.params.id:", req.params.id);
    const { title, description, due_date, completed } = req.body;

    // Validate the task ID
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid task ID",
      });
    }

    // First, check if the task exists and get current state
    const existingTaskResult = await db.query(
      "SELECT * FROM tasks WHERE id = $1",
      [taskId]
    );

    if (existingTaskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    const existingTask = existingTaskResult.rows[0];

    // Add this right before your UPDATE query
    console.log("=== DETAILED TIMESTAMP ANALYSIS ===");
    console.log("Existing timestamp (raw):", existingTask.updated_at);
    console.log(
      "Existing timestamp (ISO):",
      existingTask.updated_at.toISOString()
    );
    console.log(
      "Existing timestamp (getTime):",
      existingTask.updated_at.getTime()
    );

    // Let's also check what happens when we convert back and forth
    const timestampAsString = existingTask.updated_at.toISOString();
    const timestampParsedBack = new Date(timestampAsString);
    console.log("Parsed back timestamp:", timestampParsedBack.toISOString());
    console.log(
      "Are they equal?",
      existingTask.updated_at.getTime() === timestampParsedBack.getTime()
    );

    // Add this debugging query to see what PostgreSQL actually has stored
    const debugResult = await db.query(
      "SELECT id, updated_at, EXTRACT(microseconds FROM updated_at) as microseconds FROM tasks WHERE id = $1",
      [taskId]
    );

    console.log("=== DATABASE TIMESTAMP ANALYSIS ===");
    console.log("Database timestamp:", debugResult.rows[0].updated_at);
    console.log("Database microseconds:", debugResult.rows[0].microseconds);
    console.log(
      "JavaScript timestamp we are comparing:",
      existingTask.updated_at
    );

    // Add this to see the exact precision difference
    const precisionTestResult = await db.query(
      `SELECT updated_at, 
          EXTRACT(EPOCH FROM updated_at) as epoch_seconds,
          EXTRACT(EPOCH FROM updated_at) * 1000000 as epoch_microseconds,
          updated_at = $1 as exact_match
   FROM tasks WHERE id = $2`,
      [existingTask.updated_at, taskId]
    );

    console.log("=== PRECISION COMPARISON ===");
    console.log("Exact match result:", precisionTestResult.rows[0].exact_match);
    console.log(
      "Database epoch microseconds:",
      precisionTestResult.rows[0].epoch_microseconds
    );
    console.log(
      "JavaScript getTime() * 1000:",
      existingTask.updated_at.getTime() * 1000
    );
    console.log("Existing task updated_at:", existingTask.updated_at);
    console.log("Trying to update with timestamp:", existingTask.updated_at);
    console.log("Current time:", new Date().toISOString());

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

    // Check for meaningful changes (optional optimization)
    const hasChanges =
      sanitizedTitle !== existingTask.title ||
      sanitizedDescription !== existingTask.description ||
      due_date !== existingTask.due_date.toISOString().split("T")[0] ||
      completed !== existingTask.completed;

    if (!hasChanges) {
      // No changes detected, return current task without database operation
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: existingTask,
      });
    }

    // Handle completion timestamp logic
    let completedAt = existingTask.completed_at;

    if (completed && !existingTask.completed) {
      // Task is being marked as completed
      completedAt = new Date().toISOString();
    } else if (!completed && existingTask.completed) {
      // Task is being marked as incomplete
      completedAt = null;
    }

    // Perform the update with optimistic concurrency control
    // This approach uses a reasonable tolerance window instead of exact equality
    const updateResult = await db.query(
      `UPDATE tasks 
   SET title = $1, description = $2, due_date = $3, completed = $4, updated_at = NOW()
   WHERE id = $5 AND ABS(EXTRACT(EPOCH FROM (updated_at - $6))) < 1.0
   RETURNING *`,
      [
        sanitizedTitle,
        sanitizedDescription,
        due_date,
        completed,
        taskId,
        existingTask.updated_at,
      ]
    );

    // Add some helpful logging to understand what's happening
    if (updateResult.rows.length === 0) {
      // Let's see what the actual time difference was
      const timeDiffResult = await db.query(
        `SELECT EXTRACT(EPOCH FROM (updated_at - $1)) as time_difference_seconds
     FROM tasks WHERE id = $2`,
        [existingTask.updated_at, taskId]
      );

      console.log(
        "Time difference in seconds:",
        timeDiffResult.rows[0]?.time_difference_seconds
      );

      return res.status(409).json({
        success: false,
        error: "Conflict detected",
        message:
          "This task has been modified by another user. Please refresh and try again.",
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
      WHERE tasks.id = $1
    `,
      [taskId]
    );

    // Log the successful update
    console.log(
      `Task updated successfully: ID ${taskId}, Title: "${sanitizedTitle}"`
    );

    // Return success response
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
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);

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
      "SELECT id, title FROM tasks WHERE id = $1",
      [taskId]
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
      "DELETE FROM tasks WHERE id = $1 RETURNING *",
      [taskId]
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
      `Task deleted successfully: ID ${taskId}, Title: "${taskToDelete.title}"`
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
