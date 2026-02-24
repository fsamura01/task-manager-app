const db = require("../database");

class ProjectModel {
  static async getAllProjects(userId, search) {
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = $1
    `;

    let params = [userId];

    if (search) {
      query += ` AND (p.name ILIKE $2 OR p.description ILIKE $2)`;
      params.push(`%${search.trim()}%`);
    }

    query += `
      GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async createProject(name, description, userId) {
    const result = await db.query(
      `
      INSERT INTO projects (name, description, user_id)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [name.trim(), description?.trim() || null, userId]
    );
    return result.rows[0];
  }

  static async getProjectById(projectId, userId) {
    const result = await db.query(
      `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        u.name as owner_name
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND p.user_id = $2
      `,
      [projectId, userId]
    );
    return result.rows[0];
  }

  static async updateProject(projectId, userId, name, description) {
    const result = await db.query(
      `UPDATE projects 
       SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [name.trim(), description?.trim() || null, projectId, userId]
    );
    return result.rows[0];
  }

  static async deleteProject(projectId, userId) {
    const result = await db.query(
      "DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *",
      [projectId, userId]
    );
    return result.rows[0];
  }
}

module.exports = ProjectModel;
