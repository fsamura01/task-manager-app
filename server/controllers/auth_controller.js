const bcrypt = require("bcryptjs");
const db = require("../database");
const AuthenticationDbHelper = require("../models/auth_model");
const { generateToken } = require("../utils/jwttoken-loginlimiter");
const catchAsync = require("../utils/catch_async");
const { BadRequestError, UnauthorizedError, ConflictError } = require("../utils/app_error");

/**
 * @description Registers a new user account.
 */
exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password, name } = req.body;

  if (!username || !email || !password) {
    throw new BadRequestError("Username, email, and password are required");
  }

  const displayName = name || username;

  if (password.length < 6) {
    throw new BadRequestError("Password must be at least 6 characters long");
  }

  const existingUser = await AuthenticationDbHelper.getExistingUser(
    username,
    email
  );
  if (existingUser.length > 0) {
    throw new ConflictError("Username or email already exists");
  }

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = await AuthenticationDbHelper.createNewUser(
    username,
    email,
    hashedPassword,
    displayName
  );

  const token = generateToken(newUser[0].id, newUser[0].username);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: {
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        name: newUser[0].name,
      },
      token: token,
    },
  });
});

/**
 * @description Authenticates an existing user.
 */
exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new BadRequestError("Username and password are required");
  }

  const user = await AuthenticationDbHelper.login(username);
  if (user.length === 0) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const validPassword = await bcrypt.compare(password, user[0].password_hash);

  if (!validPassword) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const token = generateToken(user[0].id, user[0].username);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        name: user[0].name,
      },
      token: token,
    },
  });
});

/**
 * @description Retrieves current user profile.
 */
exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await db.query(
    "SELECT id, username, email, name FROM users WHERE id = $1",
    [req.user.userId]
  );

  res.json({
    success: true,
    data: user.rows[0],
  });
});
