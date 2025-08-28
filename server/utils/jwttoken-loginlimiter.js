const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";
// Create different rate limiters for different types of endpoints
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 2, // Maximum 5 attempts per window per IP
  message: {
    success: false,
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
  // Skip successful requests from counting against the limit
  skipSuccessfulRequests: true,
  // Consider implementing more sophisticated tracking by user account
  // not just IP address, to prevent attackers from bypassing IP-based limits
  keyGenerator: (req) => {
    // You might combine IP and username for more precise rate limiting
    return req.ip + ":" + (req.body.email || "");
  },
});

// Helper function to generate JWT tokens
// Think of this like creating a secure ID badge with expiration date
const generateToken = (userId, username) => {
  return jwt.sign(
    {
      userId: userId,
      username: username,
    },
    JWT_SECRET,
    { expiresIn: "24h" } // Token expires in 24 hours for security
  );
};

module.exports = {
  loginLimiter,
  generateToken,
};
