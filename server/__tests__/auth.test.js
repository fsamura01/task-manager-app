/**
 * @file auth.test.js
 * @description Tests for /api/auth routes: register, login, and get profile.
 *
 * ─── HOW THIS FILE WORKS ───────────────────────────────────────────────────
 *
 * 1. MOCKING THE DATABASE (jest.mock)
 *    Our controllers call database models (AuthenticationDbHelper, db.query).
 *    We don't want real DB calls in tests because:
 *      - They would be slow and flaky (depends on a running Postgres instance)
 *      - They would pollute real data
 *    Instead, jest.mock() replaces the module with a "spy" version we control.
 *
 * 2. MOCKING THE RATE LIMITER
 *    The login route uses express-rate-limit. In tests, running multiple
 *    requests in quick succession would trigger the limiter and return 429.
 *    We replace the limiter with a pass-through middleware so tests are
 *    isolated from rate limit state.
 *
 * 3. SUPERTEST
 *    `supertest` lets us make real HTTP requests to our Express app without
 *    a server running on a port — it uses the app object directly.
 *
 * 4. ERROR RESPONSE SHAPE
 *    The global error handler returns:
 *      { status: "fail" | "error", message: "..." }
 *    NOT { success: false }. Our tests assert this actual shape.
 *
 * 5. EDGE CASES COVERED
 *    - Missing required fields → 400
 *    - Password too short → 400
 *    - Duplicate user → 409
 *    - Wrong credentials → 401
 *    - Accessing protected route without token → 401
 *    - Accessing protected route with invalid token → 403
 *    - Happy path for register, login, and getProfile
 */

const request = require("supertest");
const { generateTestToken } = require("./helpers/testHelpers");

// ─── MOCK DEPENDENCIES ─────────────────────────────────────────────────────
// Must come BEFORE the app is created.

// Mock the DB model used by auth_controller
jest.mock("../models/auth_model");

// Mock the database module (used directly by getProfile)
jest.mock("../database");

// Mock the rate limiter to a simple pass-through.
// Without this, repeated login test requests trigger 429 Too Many Requests.
jest.mock("../utils/jwttoken-loginlimiter", () => {
  const jwt = require("jsonwebtoken");
  const secret = process.env.JWT_SECRET || "your-fallback-secret-key";

  return {
    // Pass-through middleware — no rate limiting in tests
    loginLimiter: (req, res, next) => next(),
    // Keep the real generateToken function so JWTs are valid
    generateToken: (userId, username) =>
      jwt.sign({ userId, username }, secret, {
        expiresIn: "1h",
        issuer: "Task-Manager-App",
        audience: "Task-Manager-App-Users",
      }),
  };
});

// ─── APP & MOCK SETUP ──────────────────────────────────────────────────────
// Import after mocks are registered
const createApp = require("../createApp");
const AuthModel = require("../models/auth_model");
const db = require("../database");

let app;

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  // Clear call history before each test so tests don't bleed into each other
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ═══════════════════════════════════════════════════════════════════════════
describe("POST /api/auth/register", () => {
  const validUser = {
    username: "newuser",
    email: "newuser@example.com",
    password: "securepass123",
    name: "New User",
  };

  test("✅ registers a new user and returns 201 with a token", async () => {
    // Arrange: no existing user found, then the new user is created
    AuthModel.getExistingUser = jest.fn().mockResolvedValue([]);
    AuthModel.createNewUser = jest.fn().mockResolvedValue([
      { id: 1, username: "newuser", email: "newuser@example.com", name: "New User" },
    ]);

    // Act
    const res = await request(app).post("/api/auth/register").send(validUser);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user.username).toBe("newuser");
  });

  test("❌ returns 400 when username is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "a@b.com", password: "password123" }); // No username!

    // The error handler sends { status: "fail", message: "..." }
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    // The DB should never be called if validation fails early
    expect(AuthModel.getExistingUser).not.toHaveBeenCalled();
  });

  test("❌ returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "user", password: "password123" }); // No email!

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
  });

  test("❌ returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "user", email: "a@b.com" }); // No password!

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
  });

  test("❌ returns 400 when password is shorter than 6 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "user", email: "a@b.com", password: "abc" }); // Too short!

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(res.body.message).toMatch(/6 characters/i);
  });

  test("❌ returns 409 Conflict when username or email already exists", async () => {
    // Arrange: mock DB to say a user already exists
    AuthModel.getExistingUser = jest.fn().mockResolvedValue([{ id: 99 }]);

    const res = await request(app).post("/api/auth/register").send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.status).toBe("fail");
    // Should NOT proceed to create the user
    expect(AuthModel.createNewUser).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═══════════════════════════════════════════════════════════════════════════
describe("POST /api/auth/login", () => {
  test("✅ logs in successfully and returns a token", async () => {
    // bcrypt.compare in the controller needs a real hash to verify.
    // We use bcryptjs to produce one matching "mypassword".
    const bcrypt = require("bcryptjs");
    const hash = await bcrypt.hash("mypassword", 10);

    AuthModel.login = jest.fn().mockResolvedValue([
      { id: 1, username: "testuser", email: "test@test.com", name: "Test User", password_hash: hash },
    ]);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser", password: "mypassword" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user.username).toBe("testuser");
  });

  test("❌ returns 400 when username is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "mypassword" }); // No username

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(AuthModel.login).not.toHaveBeenCalled();
  });

  test("❌ returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser" }); // No password

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
  });

  test("❌ returns 401 when user does not exist", async () => {
    // Empty array means the user was not found in the database
    AuthModel.login = jest.fn().mockResolvedValue([]);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "ghost", password: "password" });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe("fail");
  });

  test("❌ returns 401 when password is incorrect", async () => {
    const bcrypt = require("bcryptjs");
    const hash = await bcrypt.hash("correctpassword", 10);

    AuthModel.login = jest.fn().mockResolvedValue([
      { id: 1, username: "testuser", password_hash: hash },
    ]);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "testuser", password: "wrongpassword" }); // Wrong!

    expect(res.status).toBe(401);
    expect(res.body.status).toBe("fail");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/auth/profile
// ═══════════════════════════════════════════════════════════════════════════
describe("GET /api/auth/profile", () => {
  test("✅ returns profile for authenticated user", async () => {
    // Mock the direct db.query call used in getProfile
    db.query = jest.fn().mockResolvedValue({
      rows: [{ id: 1, username: "testuser", email: "test@test.com", name: "Test User" }],
    });

    const token = generateTestToken({ userId: 1, username: "testuser" });

    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe("testuser");
  });

  test("❌ returns 401 when no token is provided", async () => {
    // verifyToken middleware returns its own JSON (not via error handler)
    const res = await request(app).get("/api/auth/profile");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Access token required");
  });

  test("❌ returns 403 when token is invalid/expired", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", "Bearer this.is.not.a.valid.token");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Invalid or expired token");
  });
});
