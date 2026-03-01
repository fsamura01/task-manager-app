/**
 * @file tasks.test.js
 * @description Tests for /api/tasks routes: CRUD operations on tasks.
 *
 * ─── HOW THIS FILE WORKS ───────────────────────────────────────────────────
 *
 * Tasks routes all require authentication (verifyToken middleware is applied
 * to the whole router). To test them, every request must include a valid JWT.
 * We use generateTestToken() from helpers to mint one on the fly.
 *
 * Two things are mocked:
 *   1. TaskModel — so we control what the "database" returns
 *   2. db (direct db.query calls) — used in createTask to check project ownership
 *
 * ─── ERROR RESPONSE SHAPE ────────────────────────────────────────────────
 *   The global error handler returns:
 *     { status: "fail" | "error", message: "..." }
 *   NOT { success: false }. Our tests assert this actual shape.
 *   However, verifyToken's 401 uses its OWN response shape:
 *     { success: false, error: "Access token required" }
 *
 * ─── EDGE CASES COVERED ────────────────────────────────────────────────────
 *   GET    /api/tasks       – returns task list / empty array
 *   POST   /api/tasks       – missing title, missing project_id, project not owned, success
 *   GET    /api/tasks/:id   – task not found, invalid ID, success
 *   PUT    /api/tasks/:id   – task not found, invalid ID, success
 *   DELETE /api/tasks/:id   – task not found, invalid ID, success
 *   All protected routes    – returns 401 without token
 */

const request = require("supertest");
const createApp = require("../createApp");
const { generateTestToken, authHeader } = require("./helpers/testHelpers");

// ─── MOCK DEPENDENCIES ─────────────────────────────────────────────────────
jest.mock("../models/task_model");
jest.mock("../database");

const TaskModel = require("../models/task_model");
const db = require("../database");

// ─── SHARED TEST DATA ──────────────────────────────────────────────────────
const mockTask = {
  id: 10,
  title: "Write unit tests",
  description: "Test all the endpoints",
  completed: false,
  project_id: 5,
  user_id: 1,
  due_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── TEST SETUP ────────────────────────────────────────────────────────────
let app;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/tasks
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/tasks", () => {
  test("✅ returns a list of tasks for authenticated user", async () => {
    TaskModel.getAllTasks = jest.fn().mockResolvedValue([mockTask]);

    const res = await request(app)
      .get("/api/tasks")
      .set(authHeader()); // attach a valid JWT

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Write unit tests");
    expect(res.body.count).toBe(1);
  });

  test("✅ returns empty array when user has no tasks", async () => {
    TaskModel.getAllTasks = jest.fn().mockResolvedValue([]);

    const res = await request(app)
      .get("/api/tasks")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  test("❌ returns 401 when no token is provided", async () => {
    const res = await request(app).get("/api/tasks"); // No auth header!

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false); // verifyToken sends its own 401 format
    expect(TaskModel.getAllTasks).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tasks
// ═══════════════════════════════════════════════════════════════════════════
describe("POST /api/tasks", () => {
  const validPayload = { title: "New Task", project_id: 5 };

  beforeEach(() => {
    // By default, mock the project ownership check to PASS (project belongs to user)
    db.query = jest.fn().mockResolvedValue({ rows: [{ id: 5 }] });
  });

  test("✅ creates a task and returns 201", async () => {
    TaskModel.createTask = jest.fn().mockResolvedValue(mockTask);

    const res = await request(app)
      .post("/api/tasks")
      .set(authHeader())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Write unit tests");
    expect(TaskModel.createTask).toHaveBeenCalledTimes(1);
  });

  test("❌ returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set(authHeader())
      .send({ project_id: 5 }); // No title!

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail"); // Global error handler format
    expect(TaskModel.createTask).not.toHaveBeenCalled();
  });

  test("❌ returns 400 when project_id is missing", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set(authHeader())
      .send({ title: "Some task" }); // No project_id!

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(TaskModel.createTask).not.toHaveBeenCalled();
  });

  test("❌ returns 404 when project doesn't belong to user", async () => {
    // Simulate project not found / not owned by user
    db.query = jest.fn().mockResolvedValue({ rows: [] });

    const res = await request(app)
      .post("/api/tasks")
      .set(authHeader())
      .send(validPayload);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
    expect(TaskModel.createTask).not.toHaveBeenCalled();
  });

  test("❌ returns 401 when no token is provided", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send(validPayload); // No auth header!

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/tasks/:id
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/tasks/:id", () => {
  test("✅ returns a single task by ID", async () => {
    TaskModel.getTaskById = jest.fn().mockResolvedValue(mockTask);

    const res = await request(app)
      .get("/api/tasks/10")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(10);
    // Verify the model was called with the correct IDs
    expect(TaskModel.getTaskById).toHaveBeenCalledWith(10, 1); // taskId=10, userId=1
  });

  test("❌ returns 404 when task is not found or doesn't belong to user", async () => {
    TaskModel.getTaskById = jest.fn().mockResolvedValue(undefined); // Task not found

    const res = await request(app)
      .get("/api/tasks/999")
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/tasks/:id
// ═══════════════════════════════════════════════════════════════════════════
describe("PUT /api/tasks/:id", () => {
  const updatePayload = {
    title: "Updated Title",
    description: "Updated description",
    due_date: null,
    completed: true,
  };

  test("✅ updates and returns the task", async () => {
    const updatedTask = { ...mockTask, title: "Updated Title", completed: true };
    TaskModel.updateTask = jest.fn().mockResolvedValue(updatedTask);

    const res = await request(app)
      .put("/api/tasks/10")
      .set(authHeader())
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Updated Title");
    expect(res.body.data.completed).toBe(true);
    // Verify the model was called with correct arguments
    expect(TaskModel.updateTask).toHaveBeenCalledWith(10, 1, updatePayload);
  });

  test("❌ returns 404 when task is not found", async () => {
    TaskModel.updateTask = jest.fn().mockResolvedValue(undefined); // Task not found

    const res = await request(app)
      .put("/api/tasks/999")
      .set(authHeader())
      .send(updatePayload);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
  });

  test("❌ returns 401 when no token is provided", async () => {
    const res = await request(app)
      .put("/api/tasks/10")
      .send(updatePayload); // No token!

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/tasks/:id
// ═══════════════════════════════════════════════════════════════════════════
describe("DELETE /api/tasks/:id", () => {
  test("✅ deletes the task and returns 200 with the deleted ID", async () => {
    TaskModel.deleteTask = jest.fn().mockResolvedValue(mockTask);

    const res = await request(app)
      .delete("/api/tasks/10")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deletedTaskId).toBe(10);
    expect(TaskModel.deleteTask).toHaveBeenCalledWith(10, 1); // taskId=10, userId=1
  });

  test("❌ returns 404 when task is not found or belongs to another user", async () => {
    TaskModel.deleteTask = jest.fn().mockResolvedValue(undefined); // Task not found

    const res = await request(app)
      .delete("/api/tasks/999")
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
  });

  test("❌ returns 401 when no token is provided", async () => {
    const res = await request(app).delete("/api/tasks/10"); // No token!

    expect(res.status).toBe(401);
  });
});
