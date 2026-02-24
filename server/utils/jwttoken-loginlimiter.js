const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");


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

const secret = process.env.JWT_SECRET || "your-fallback-secret-key";
// Helper function to generate JWT tokens
// Think of this like creating a secure ID badge with expiration date
const generateToken = (userId, username) => {

  const payload = {
        userId: userId,
        username: username,
        // Including a timestamp helps with debugging and token lifecycle management
        iat: Math.floor(Date.now() / 1000)
  };
  
  const options = {
        expiresIn: '24h',
        issuer: 'Task-Manager-App',
        audience: 'Task-Manager-App-Users'
  };

  return jwt.sign(
    payload,
    secret,
    options
  );
};

module.exports = {
  loginLimiter,
  generateToken,
};
