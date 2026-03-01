/**
 * @file testHelpers.js
 * @description Shared utilities used across all test files.
 *
 * KEY CONCEPT — Why we generate tokens here:
 * Protected routes use the verifyToken middleware which validates a real JWT.
 * In tests we don't have a running login flow, so we mint a token manually
 * with the same secret the app uses. This lets us test authenticated routes
 * without a real database.
 */

const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";

/**
 * Generates a valid signed JWT for a fake test user.
 * Shape must match what verifyToken puts on req.user.
 *
 * @param {object} [overrides] - Optional fields to override in the payload.
 * @returns {string} A signed JWT string.
 */
function generateTestToken(overrides = {}) {
  const payload = {
    userId: 1,
    username: "testuser",
    ...overrides,
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
    issuer: "Task-Manager-App",
    audience: "Task-Manager-App-Users",
  });
}

/**
 * Returns the Authorization header object for supertest requests.
 *
 * Usage:
 *   request(app).get('/api/tasks').set(authHeader())
 *
 * @param {string} [token] - Optional token override (defaults to a fresh test token).
 * @returns {{ Authorization: string }}
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token || generateTestToken()}` };
}

module.exports = { generateTestToken, authHeader };
