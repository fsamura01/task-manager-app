// Create a file called debug-connection-string.js
require("dotenv").config();

console.log("=== DATABASE_URL Diagnostics ===");

// First, check if DATABASE_URL exists and what type it is
console.log("DATABASE_URL exists:", process.env.DATABASE_URL !== undefined);
console.log("DATABASE_URL type:", typeof process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL length:", process.env.DATABASE_URL.length);

  // Show the structure without revealing sensitive data
  // We'll mask the password portion for security
  const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = process.env.DATABASE_URL.match(urlPattern);

  if (match) {
    console.log("URL structure appears valid:");
    console.log("  Protocol: postgresql://");
    console.log("  Username:", match[1]);
    console.log("  Password: [present, length=" + match[2].length + "]");
    console.log("  Host:", match[3]);
    console.log("  Port:", match[4]);
    console.log("  Database:", match[5]);
  } else {
    console.log(
      "URL structure appears invalid or doesn't match expected pattern"
    );
    console.log(
      "Expected format: postgresql://username:password@host:port/database"
    );
  }
} else {
  console.log("DATABASE_URL is undefined - this is likely your problem!");
}
