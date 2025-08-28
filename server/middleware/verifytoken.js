// MIDDLEWARE TO VERIFY JWT TOKENS
// This is like the security guard that checks key cards
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";
const verifyToken = (req, res, next) => {
  // Look for token in Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Expected format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  try {
    // Verify the token is valid and not expired
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user info to request object for use in other routes
    req.user = decoded;
    next(); // Continue to the next middleware/route
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

module.exports = verifyToken;
