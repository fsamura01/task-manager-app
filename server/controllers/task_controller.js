const TaskModel = require("../models/task_model");
const db = require("../database");
const catchAsync = require("../utils/catch_async");
const { BadRequestError, NotFoundError } = require("../utils/app_error");

/**
 * @description Retrieves all tasks for the user.
 */
exports.getTasks = catchAsync(async (req, res, next) => {
  const { project_id, search } = req.query;
  const tasks = await TaskModel.getAllTasks(req.user.userId, project_id, search);

  res.json({
    success: true,
    data: tasks,
    count: tasks.length,
  });
});

/**
 * @description Creates a new task and broadcasts it.
 */
exports.createTask = catchAsync(async (req, res, next) => {
  const { title, description, due_date, project_id } = req.body;

  if (!title || !project_id) {
    throw new BadRequestError("Title and project_id are required");
  }

  // Verify project ownership
  const projectCheck = await db.query(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [project_id, req.user.userId]
  );

  if (projectCheck.rows.length === 0) {
    throw new NotFoundError("Project not found or access denied");
  }

  const task = await TaskModel.createTask(title, description, req.user.userId, project_id, due_date);

  // WebSocket Broadcast
  const io = req.app.get("io");
  if (io) {
    const roomName = `project_${project_id}`;
    io.to(roomName).emit("task_created", {
      task: task,
      createdBy: {
        id: req.user.userId,
        username: req.user.username,
      },
      timestamp: new Date().toISOString(),
      changeType: "create",
    });
  }

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: task,
  });
});

/**
 * @description Retrieves a single task.
 */
exports.getTaskById = catchAsync(async (req, res, next) => {
  const taskId = parseInt(req.params.id);
  const task = await TaskModel.getTaskById(taskId, req.user.userId);

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  res.json({
    success: true,
    data: task,
  });
});

/**
 * @description Updates a task.
 */
exports.updateTask = catchAsync(async (req, res, next) => {
  const taskId = parseInt(req.params.id);
  const { title, description, due_date, completed } = req.body;

  if (!taskId || isNaN(taskId)) {
    throw new BadRequestError("Missing or invalid Task ID.");
  }

  const task = await TaskModel.updateTask(taskId, req.user.userId, { title, description, due_date, completed });

  if (!task) {
    throw new NotFoundError("Task not found.");
  }

  // WebSocket Broadcast
  const io = req.app.get("io");
  if (io && task.project_id) {
    const roomName = `project_${task.project_id}`;
    io.to(roomName).emit("task_updated", {
      task: task,
      updatedByUsername: req.user.username,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: task,
  });
});

/**
 * @description Deletes a task.
 */
exports.deleteTask = catchAsync(async (req, res, next) => {
  const taskId = parseInt(req.params.id);

  if (!taskId || isNaN(taskId)) {
    throw new BadRequestError("Invalid task ID.");
  }

  const task = await TaskModel.deleteTask(taskId, req.user.userId);

  if (!task) {
    throw new NotFoundError("Task not found.");
  }

  // WebSocket Broadcast
  const io = req.app.get("io");
  if (io && task.project_id) {
    const roomName = `project_${task.project_id}`;
    io.to(roomName).emit("task_deleted", {
      taskId: taskId,
      taskTitle: task.title,
      deletedBy: {
        id: req.user.userId,
        username: req.user.username,
      },
      timestamp: new Date().toISOString(),
      changeType: "delete",
    });
  }

  res.json({
    success: true,
    message: "Task deleted successfully",
    data: { deletedTaskId: taskId },
  });
});
