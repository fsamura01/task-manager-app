const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task_controller");
const verifyToken = require("../middleware/verifytoken");

// All task routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks for user
 */
router.get("/", taskController.getTasks);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 */
router.post("/", taskController.createTask);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get a single task by ID
 */
router.get("/:id", taskController.getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 */
router.put("/:id", taskController.updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 */
router.delete("/:id", taskController.deleteTask);

module.exports = router;
