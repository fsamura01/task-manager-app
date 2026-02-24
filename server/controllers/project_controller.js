const ProjectModel = require("../models/project_model");
const db = require("../database");
const catchAsync = require("../utils/catch_async");
const { BadRequestError, NotFoundError } = require("../utils/app_error");

/**
 * @description Retrieves all projects for the user with stats.
 */
exports.getProjects = catchAsync(async (req, res, next) => {
  const { search } = req.query;
  const projects = await ProjectModel.getAllProjects(req.user.userId, search);

  res.json({
    success: true,
    data: projects,
    count: projects.length,
  });
});

/**
 * @description Creates a new project.
 */
exports.createProject = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  if (!name || name.trim().length < 3) {
    throw new BadRequestError("Project name is required and must be at least 3 characters long");
  }

  const result = await ProjectModel.createProject(name, description, req.user.userId);

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * @description Retrieves projects with nested tasks and summary.
 */
exports.getProjectsWithTasks = catchAsync(async (req, res, next) => {
  const {
    include_completed = "true",
    include_empty_projects = "true",
    limit,
    offset = 0,
    search,
  } = req.query;

  const userId = req.user.userId;

  let projectsQuery = `
    SELECT 
      p.id, p.name, p.description, p.created_at, p.updated_at,
      COUNT(t.id) as total_task_count,
      COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_task_count,
      COUNT(CASE WHEN t.completed = false THEN 1 END) as pending_task_count,
      COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.completed = false THEN 1 END) as overdue_task_count,
      MAX(t.updated_at) as last_task_activity
    FROM projects p
    LEFT JOIN tasks t ON p.id = t.project_id
    WHERE p.user_id = $1
  `;

  let queryParams = [userId];
  let paramIndex = 2;

  if (search) {
    projectsQuery += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
    queryParams.push(`%${search.trim()}%`);
    paramIndex++;
  }

  if (include_empty_projects === "false") {
    projectsQuery += ` AND EXISTS (SELECT 1 FROM tasks WHERE project_id = p.id)`;
  }

  projectsQuery += ` 
    GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at
    ORDER BY p.created_at DESC
  `;

  if (limit) {
    projectsQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
  }

  const projectsResult = await db.query(projectsQuery, queryParams);

  if (projectsResult.rows.length === 0) {
    return res.json({ success: true, data: [], summary: { total_projects: 0 } });
  }

  const projectIds = projectsResult.rows.map((p) => p.id);

  let tasksQuery = `
    SELECT t.*, 
           CASE WHEN t.due_date < CURRENT_DATE AND t.completed = false THEN true ELSE false END as is_overdue
    FROM tasks t
    WHERE t.project_id = ANY($1)
  `;
  
  if (include_completed === "false") {
    tasksQuery += ` AND t.completed = false`;
  }
  tasksQuery += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;

  const tasksResult = await db.query(tasksQuery, [projectIds]);

  const tasksByProject = {};
  tasksResult.rows.forEach((task) => {
    if (!tasksByProject[task.project_id]) tasksByProject[task.project_id] = [];
    tasksByProject[task.project_id].push(task);
  });

  const data = projectsResult.rows.map((p) => ({
    ...p,
    tasks: tasksByProject[p.id] || [],
    statistics: {
      total_tasks: parseInt(p.total_task_count),
      completed_tasks: parseInt(p.completed_task_count),
      pending_tasks: parseInt(p.pending_task_count),
      overdue_tasks: parseInt(p.overdue_task_count),
      completion_percentage: p.total_task_count > 0 ? Math.round((p.completed_task_count / p.total_task_count) * 100) : 0
    }
  }));

  res.json({ success: true, data });
});

/**
 * @description Updates project metadata.
 */
exports.updateProject = catchAsync(async (req, res, next) => {
  const projectId = parseInt(req.params.id);
  const { name, description } = req.body;

  if (!name || name.trim().length < 3) {
    throw new BadRequestError("Project name is required and must be at least 3 characters long");
  }

  const project = await ProjectModel.updateProject(projectId, req.user.userId, name, description);

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  res.json({ success: true, data: project });
});

/**
 * @description Deletes a project.
 */
exports.deleteProject = catchAsync(async (req, res, next) => {
  const projectId = parseInt(req.params.id);
  const project = await ProjectModel.deleteProject(projectId, req.user.userId);

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  res.json({ success: true, message: `Project "${project.name}" deleted.` });
});

/**
 * @description Retrieves a single project by ID with its tasks.
 */
exports.getProjectById = catchAsync(async (req, res, next) => {
  const projectId = parseInt(req.params.id);
  const { search } = req.query;

  const projectResult = await db.query(
    "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
    [projectId, req.user.userId]
  );

  if (projectResult.rows.length === 0) {
    throw new NotFoundError("Project not found.");
  }

  const project = projectResult.rows[0];

  let tasksQuery = "SELECT * FROM tasks WHERE project_id = $1";
  const queryParams = [projectId];

  if (search) {
    tasksQuery += " AND (title ILIKE $2 OR description ILIKE $2)";
    queryParams.push(`%${search}%`);
  }

  tasksQuery += " ORDER BY created_at DESC";

  const tasksResult = await db.query(tasksQuery, queryParams);
  project.tasks = tasksResult.rows;

  res.json({ success: true, data: project });
});

/**
 * @description Retrieves all files associated with a specific project.
 */
exports.getProjectFiles = catchAsync(async (req, res, next) => {
  const projectId = parseInt(req.params.id);

  const result = await db.query(
    `SELECT f.*, t.title as task_title 
     FROM files f
     LEFT JOIN tasks t ON f.task_id = t.id
     WHERE f.project_id = $1 AND f.user_id = $2 AND f.deleted_at IS NULL
     ORDER BY f.created_at DESC`,
    [projectId, req.user.userId]
  );

  res.json({ success: true, data: { files: result.rows } });
});
