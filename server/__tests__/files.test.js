/**
 * @file files.test.js
 * @description Tests for /api/files routes: listing, uploading, downloading, and soft-deleting files.
 *
 * ─── HOW THIS FILE WORKS ───────────────────────────────────────────────────
 *
 * 1. MOCKING STORAGE CONFIG
 *    File uploads rely on `multer` parsing `multipart/form-data`. To avoid dealing
 *    with real file buffers and temp files in our unit tests, we mock the exported
 *    `activeUpload` middleware from `config/storage.js`. When a test hits POST /api/files,
 *    our mock bypasses multer entirely and injects a fake `req.file` object.
 *
 * 2. MOCKING DB CALLS
 *    The `file_controller` makes multiple direct `db.query` calls. We use `jest.fn()`
 *    on `db.query` to simulate finding tasks, checking file ownership, and generating
 *    insert/update statements.
 *
 * ─── EDGE CASES COVERED ────────────────────────────────────────────────────
 *   GET    /api/files             – returns files list (with/without query filters)
 *   POST   /api/files             – no file provided, validation success, inserts
 *   GET    /api/files/:id/download– file not found, returns valid direct URL
 *   DELETE /api/files/:id         – file not found, successfully soft deletes
 */

const request = require("supertest");
const { generateTestToken, authHeader } = require("./helpers/testHelpers");

// ─── MOCK STORAGE DEPENDENCIES ─────────────────────────────────────────────
// Must run before `createApp` imports routes
jest.mock("../config/storage", () => {
  return {
    STORAGE_STRATEGIES: { S3: "s3", LOCAL: "local" },
    activeStrategy: "local",
    // Fake the multer `single('file')` middleware
    activeUpload: {
      single: (fieldName) => (req, res, next) => {
        // We only simulate a file upload if the test explicitly passed one via a custom header
        // This is a neat trick to test the "No file provided" error without real multipart forms.
        if (req.headers["x-simulate-upload"] === "true") {
          req.file = {
            filename: "12345-fake-file.pdf",
            originalname: "fake-file.pdf",
            mimetype: "application/pdf",
            size: 2048,
            path: "uploads/12345-fake-file.pdf"
          };
        }
        next();
      }
    },
    activeUploadErrorHandler: (err, req, res, next) => next()
  };
});

jest.mock("../database");

const createApp = require("../createApp");
const db = require("../database");

// ─── TEST SETUP ────────────────────────────────────────────────────────────
let app;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/files
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/files", () => {
  test("✅ returns a list of files for authenticated user", async () => {
    // Mock the DB response
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 100, filename: "report.pdf", file_size: 2048 }
      ]
    });

    const res = await request(app)
      .get("/api/files")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].filename).toBe("report.pdf");
    // Verify the query was made
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/files
// ═══════════════════════════════════════════════════════════════════════════
describe("POST /api/files", () => {
  test("✅ uploads a file and returns 201", async () => {
    // We mock the DB insert (which happens when no explicit task_id triggers the security check)
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 100, filename: "fake-file.pdf", file_path: "uploads/12345-fake-file.pdf" }
      ]
    });

    const res = await request(app)
      .post("/api/files")
      .set(authHeader())
      // Use our custom header to tell the mocked multer to inject req.file
      .set("x-simulate-upload", "true")
      .send({ project_id: 5 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/File processed/i);
    expect(res.body.data.id).toBe(100);
  });

  test("❌ returns 400 when no file is uploaded", async () => {
    // DO NOT send "x-simulate-upload: true" -> req.file will be undefined
    const res = await request(app)
      .post("/api/files")
      .set(authHeader())
      .send({ project_id: 5 });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail"); // Standard Global Error Handler format
    expect(res.body.message).toBe("No file provided");
    expect(db.query).not.toHaveBeenCalled();
  });

  test("❌ returns 403 Forbidden when task validation fails", async () => {
    // If a task_id is passed, the controller queries the DB to ensure the user owns it.
    // We mock it to return an empty array (simulating task not found / not owned).
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/files")
      .set(authHeader())
      .set("x-simulate-upload", "true")
      .send({ task_id: 99 }); // triggers security check

    expect(res.status).toBe(403);
    expect(res.body.status).toBe("fail");
    expect(res.body.message).toMatch(/Access denied/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/files/:id/download
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/files/:id/download", () => {
  test("✅ returns a local download URL when storage is local", async () => {
    // Mock the DB lookup for the file
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 100,
          filename: "fake-file.pdf",
          file_path: "uploads/12345-fake-file.pdf",
          storage_provider: "local"
        }
      ]
    });

    const res = await request(app)
      .get("/api/files/100/download")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Express Supertest sets the host to 127.0.0.1:<random-port> dynamically
    expect(res.body.data.download_url).toContain("uploads/12345-fake-file.pdf");
    expect(res.body.data.filename).toBe("fake-file.pdf");
  });

  test("❌ returns 404 when file is not found (or deleted)", async () => {
    // Empty rows means file wasn't found or was soft-deleted
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/files/999/download")
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/files/:id
// ═══════════════════════════════════════════════════════════════════════════
describe("DELETE /api/files/:id", () => {
  test("✅ soft-deletes a file when it exists", async () => {
    // Call 1: Check if file exists
    db.query.mockResolvedValueOnce({
      rows: [
        { s3_key: null, filename: "fake-file.pdf", storage_provider: "local" }
      ]
    });
    // Call 2: The actual UPDATE (soft-delete) query
    db.query.mockResolvedValueOnce({
      rows: [{ id: 100 }]
    });

    const res = await request(app)
      .delete("/api/files/100")
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("File deleted.");
    expect(db.query).toHaveBeenCalledTimes(2); // The SELECT and the UPDATE
  });

  test("❌ returns 404 when trying to delete a non-existent file", async () => {
    // Call 1: Checking if file exists returns nothing
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/files/999")
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("fail");
    // Ensure the UPDATE query is never reached
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
