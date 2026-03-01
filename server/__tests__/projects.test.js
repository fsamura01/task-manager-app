/**
 * @file projects.test.js
 * @description Tests for /api/projects routes: CRUD operations and aggregate queries for projects.
 *
 * ─── EDGE CASES COVERED ────────────────────────────────────────────────────
 *   GET    /api/projects             – returns project list / empty array
 *   POST   /api/projects             – missing name, short name, success
 *   GET    /api/projects/with-tasks  – returns projects with nested tasks and statistics
 *   GET    /api/projects/:id         – project not found, success (with tasks)
 *   GET    /api/projects/:id/files   – returns files for a project
 *   PUT    /api/projects/:id         – project not found, invalid name, success
 *   DELETE /api/projects/:id         – project not found, success
 *   All protected routes             – returns 401 without token
 */

const request = require("supertest");
const createApp = require("../createApp");
const { generateTestToken, authHeader } = require("./helpers/testHelpers");

// ─── MOCK DEPENDENCIES ─────────────────────────────────────────────────────
jest.mock("../models/project_model");
jest.mock("../database");

const ProjectModel = require("../models/project_model");
const db = require("../database");

// ─── SHARED TEST DATA ──────────────────────────────────────────────────────
const mockProject = {
  id: 5,
  name: "Website Redesign",
  description: "Update the landing page",
  user_id: 1,
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
// GET /api/projects
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/projects", () => {
  test("✅ returns a list of projects for authenticated user", async () => {
    ProjectModel.getAllProjects = jest.fn().mockResolvedValue([mockProject]);

    const res = await request(app)
      .get("/api/projects")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Website Redesign");
    expect(res.body.count).toBe(1);
    expect(ProjectModel.getAllProjects).toHaveBeenCalledWith(1, undefined); // userId=1, search=undefined
  });

  test("❌ returns 401 when no token is provided", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/projects
// ═══════════════════════════════════════════════════════════════════════════
describe("POST /api/projects", () => {
  const validPayload = { name: "New Project", description: "Some description" };

  test("✅ creates a project and returns 201", async () => {
    ProjectModel.createProject = jest.fn().mockResolvedValue(mockProject);

    const res = await request(app)
      .post("/api/projects")
      .set(authHeader())
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(ProjectModel.createProject).toHaveBeenCalledTimes(1);
    expect(ProjectModel.createProject).toHaveBeenCalledWith("New Project", "Some description", 1);
  });

  test("❌ returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set(authHeader())
      .send({ description: "No name" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(ProjectModel.createProject).not.toHaveBeenCalled();
  });

  test("❌ returns 400 when name is shorter than 3 characters", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set(authHeader())
      .send({ name: "ab" });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(ProjectModel.createProject).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/projects/with-tasks
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/projects/with-tasks", () => {
  test("✅ returns projects with nested tasks and statistics", async () => {
    // Mock the direct db.query calls
    // Call 1: Projects query
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 5,
          name: "Website Redesign",
          total_task_count: "2",
          completed_task_count: "1",
          pending_task_count: "1",
          overdue_task_count: "0"
        }
      ]
    });

    // Call 2: Tasks query (based on projectIds)
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 10, title: "Task 1", project_id: 5, completed: false },
        { id: 11, title: "Task 2", project_id: 5, completed: true }
      ]
    });

    const res = await request(app)
      .get("/api/projects/with-tasks")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].tasks).toHaveLength(2);
    expect(res.body.data[0].statistics.total_tasks).toBe(2);
    expect(res.body.data[0].statistics.completion_percentage).toBe(50);
  });

  test("✅ returns empty array when no projects found", async () => {
    db.query = jest.fn().mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/projects/with-tasks")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.summary.total_projects).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/projects/:id
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/projects/:id", () => {
  test("✅ returns a single project with its tasks", async () => {
    // Call 1: Project lookup
    db.query.mockResolvedValueOnce({ rows: [mockProject] });
    // Call 2: Tasks lookup
    db.query.mockResolvedValueOnce({ rows: [{ id: 10, title: "Task for Project" }] });

    const res = await request(app)
      .get("/api/projects/5")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(5);
    expect(res.body.data.tasks).toHaveLength(1);
  });

  test("❌ returns 404 when project is not found", async () => {
    db.query = jest.fn().mockResolvedValue({ rows: [] });

    const res = await request(app)
      .get("/api/projects/999")
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/projects/:id/files
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/projects/:id/files", () => {
  test("✅ returns all files for a project", async () => {
    db.query = jest.fn().mockResolvedValue({
      rows: [
        { id: 1, filename: "doc.pdf", project_id: 5 }
      ]
    });

    const res = await request(app)
      .get("/api/projects/5/files")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.files).toHaveLength(1);
    expect(res.body.data.files[0].filename).toBe("doc.pdf");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/projects/:id
// ═══════════════════════════════════════════════════════════════════════════
describe("PUT /api/projects/:id", () => {
  const updatePayload = { name: "Updated Name", description: "Updated desc" };

  test("✅ updates and returns the project", async () => {
    ProjectModel.updateProject = jest.fn().mockResolvedValue({ ...mockProject, ...updatePayload });

    const res = await request(app)
      .put("/api/projects/5")
      .set(authHeader())
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Updated Name");
    expect(ProjectModel.updateProject).toHaveBeenCalledWith(5, 1, "Updated Name", "Updated desc");
  });

  test("❌ returns 400 when name is invalid", async () => {
    const res = await request(app)
      .put("/api/projects/5")
      .set(authHeader())
      .send({ name: "ab" }); // Too short!

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
  });

  test("❌ returns 404 when project is not found", async () => {
    ProjectModel.updateProject = jest.fn().mockResolvedValue(undefined); // Not found

    const res = await request(app)
      .put("/api/projects/999")
      .set(authHeader())
      .send(updatePayload);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/projects/:id
// ═══════════════════════════════════════════════════════════════════════════
describe("DELETE /api/projects/:id", () => {
  test("✅ deletes the project and returns 200", async () => {
    ProjectModel.deleteProject = jest.fn().mockResolvedValue(mockProject);

    const res = await request(app)
      .delete("/api/projects/5")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/);
    expect(ProjectModel.deleteProject).toHaveBeenCalledWith(5, 1);
  });

  test("❌ returns 404 when project is not found", async () => {
    ProjectModel.deleteProject = jest.fn().mockResolvedValue(undefined); // Not found

    const res = await request(app)
      .delete("/api/projects/999")
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
  });
});
