const express = require("express");
const router = express.Router();
const projectController = require("../controllers/project_controller");
const verifyToken = require("../middleware/verifytoken");

// All project routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/projects
 * @desc    Get all projects for user
 */
router.get("/", projectController.getProjects);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 */
router.post("/", projectController.createProject);

/**
 * @route   GET /api/projects/with-tasks
 * @desc    Get projects with nested task data
 */
router.get("/with-tasks", projectController.getProjectsWithTasks);

/**
 * @route   GET /api/projects/:id
 * @desc    Get a single project with its tasks
 */
router.get("/:id", projectController.getProjectById);

/**
 * @route   GET /api/projects/:id/files
 * @desc    Get all files for a project
 */
router.get("/:id/files", projectController.getProjectFiles);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update a project
 */
router.put("/:id", projectController.updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project
 */
router.delete("/:id", projectController.deleteProject);

module.exports = router;
