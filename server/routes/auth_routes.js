const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth_controller");
const verifyToken = require("../middleware/verifytoken");
const { loginLimiter } = require("../utils/jwttoken-loginlimiter");

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new user
 */
router.post("/register", authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates a user
 */
router.post("/login", loginLimiter, authController.login);

/**
 * @route   GET /api/auth/profile
 * @desc    Gets current user profile
 */
router.get("/profile", verifyToken, authController.getProfile);

module.exports = router;
