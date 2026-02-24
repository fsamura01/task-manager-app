const db = require("../database");

class AuthenticationDbHelper {
  /**
   * Retrieves user record(s) for the given username or email to support the login flow.
   * Executes a parameterized query selecting id, username, email, password_hash, and name.
   *
   * @param {string} identifier - Username or email to look up.
   * @returns {Promise<Array<{id: number, username: string, email: string, password_hash: string, name: string}>>} Resolves with matching user rows.
   * @throws {Error} If the database query fails.
   */
  static async login(identifier) {
    try {
      const query = `SELECT id, username, email, password_hash, name FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`;
      const user = await db.query(query, [identifier]);
      return user.rows;
    } catch (error) {
      console.error("Login error:", error);
      throw new Error("Failed to login");
    }
  }

  /**
   * Retrieves existing user records that match the provided username or email.
   *
   * Executes a SELECT on the users table and returns any matching ids.
   *
   * @param {string} username - Username to check for existence.
   * @param {string} email - Email to check for existence.
   * @returns {Promise<Array<{id: number}>>} Resolves with matching rows (empty if none).
   * @throws {Error} If the username or email already exists or the query fails.
   */
  static async getExistingUser(username, email) {
    try {
      const query = `SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)`;
      const existingUser = await db.query(query, [username, email]);

      return existingUser.rows;
    } catch (error) {
      console.error("Failed to check existing user:", error);
      throw new Error("Failed to check existing user");
    }
  }

  /**
   * Creates a new user record and returns the inserted row(s).
   *
   * Inserts username, email, password hash, and display name into the users table,
   * then returns the resulting row data (id, username, email, name).
   *
   * @async
   * @param {string} username - Unique username for the account.
   * @param {string} email - User's email address.
   * @param {string} hashedPassword - Pre-hashed password to store.
   * @param {string} displayName - Display name to persist as name.
   * @returns {Promise<Array<{id: number, username: string, email: string, name: string}>>} Resolves with the inserted user row(s).
   * @throws {Error} If the database insert fails.
   */
  static async createNewUser(username, email, hashedPassword, displayName) {
    try {
      // Create the new user in database
      const newUser = await db.query(
        `INSERT INTO users (username, email, password_hash, name) VALUES ($1, $2, $3, $4) 
         RETURNING id, username, email, name`,
        [username, email, hashedPassword, displayName] // Using username as default name
      );

      return newUser.rows;
    } catch (error) {
      console.error("Failed to create new user:", error);
      throw new Error("Failed to create new user");
    }
  }
}

module.exports = AuthenticationDbHelper;
