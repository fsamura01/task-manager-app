const db = require("../database");

class TaskModel {
  static async getAllTasks(userId, projectId, search) {
    let query = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.completed,
        t.created_at,
        t.updated_at,
        t.due_date,
        t.project_id,
        p.name as project_name,
        u.name as user_name,
        u.email as user_email
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id = $1
    `;

    let params = [userId];

    if (search) {
      query += ` AND (t.title ILIKE $${params.length + 1} OR t.description ILIKE $${params.length + 1})`;
      params.push(`%${search.trim()}%`);
    }

    if (projectId) {
      query += ` AND t.project_id = $${params.length + 1}`;
      params.push(parseInt(projectId));
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async createTask(title, description, userId, projectId, dueDate) {
    const result = await db.query(
      `
      INSERT INTO tasks (title, description, user_id, project_id, due_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [title, description, userId, projectId, dueDate]
    );
    return result.rows[0];
  }

  static async getTaskById(taskId, userId) {
    const result = await db.query(
      `
      SELECT 
        tasks.id,
        tasks.title,
        tasks.description,
        tasks.completed,
        tasks.created_at,
        tasks.updated_at,
        tasks.due_date,
        tasks.project_id,
        users.name as user_name,
        users.email as user_email
      FROM tasks
      JOIN users ON tasks.user_id = users.id
      WHERE tasks.id = $1 AND tasks.user_id = $2
    `,
      [taskId, userId]
    );
    return result.rows[0];
  }

  static async updateTask(taskId, userId, { title, description, due_date, completed }) {
    const result = await db.query(
      `UPDATE tasks 
       SET title = $1, description = $2, due_date = $3, completed = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [title.trim(), description.trim(), due_date, !!completed, taskId, userId]
    );
    return result.rows[0];
  }

  static async deleteTask(taskId, userId) {
    const result = await db.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *",
      [taskId, userId]
    );
    return result.rows[0];
  }
}

module.exports = TaskModel;
