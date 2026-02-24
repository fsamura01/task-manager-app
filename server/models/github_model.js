// utils/githubDbHelpers.js
const db = require("../database");

class GitHubDbHelpers {
  /**
   * Create or update GitHub integration for a user
   * @param {number} userId - User ID from our system
   * @param {Object} githubUser - GitHub user data
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} Integration record
   */
  static async upsertGitHubIntegration(userId, githubUser, accessToken) {
    try {
      const query = `
        INSERT INTO github_integrations (
          user_id, github_user_id, github_username, access_token, 
          avatar_url, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (user_id, github_user_id)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          github_username = EXCLUDED.github_username,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = NOW(),
          is_active = true
        RETURNING *
      `;

      const result = await db.query(query, [
        userId,
        githubUser.id,
        githubUser.username,
        accessToken,
        githubUser.avatar_url,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Error upserting GitHub integration:", error);
      throw new Error("Failed to save GitHub integration");
    }
  }

  /**
   * Get GitHub repositories for an integration
   * @param {number} integrationId - GitHub integration ID
   * @returns {Promise<Array>} Repository configurations
   */
  static async getGitHubRepositories(integrationId) {
    try {
      const query = `
        SELECT gr.*, p.name as project_name
        FROM github_repositories gr
        LEFT JOIN projects p ON gr.project_id = p.id
        WHERE gr.integration_id = $1
        ORDER BY gr.updated_at DESC
      `;

      const result = await db.query(query, [integrationId]);
      return result.rows;
    } catch (error) {
      console.error("Error getting GitHub repositories:", error);
      throw new Error("Failed to retrieve GitHub repositories");
    }
  }

  /**
   * Create tasks from GitHub issues
   * @param {Array} issues - Array of GitHub issues
   * @param {number} userId - User ID
   * @param {number} projectId - Project ID
   * @param {string} repoFullName - Repository full name
   * @returns {Promise<Array>} Created task records
   */
  static async createTasksFromIssues(issues, userId, projectId, repoFullName) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");
      const createdTasks = [];

      for (const issue of issues) {
        // Check if task already exists for this GitHub issue
        const existingTask = await client.query(
          "SELECT id FROM tasks WHERE github_issue_id = $1 AND user_id = $2",
          [issue.github_issue_id, userId]
        );

        if (existingTask.rows.length > 0) {
          console.log(
            `Task already exists for issue #${issue.github_issue_number}`
          );
          continue;
        }

        // Create new task from GitHub issue
        const taskQuery = `
          INSERT INTO tasks (
            title, description, user_id, project_id, completed, due_date,
            github_issue_id, github_issue_number, github_repo_name, 
            github_issue_url, github_labels, github_state, github_assignees,
            synced_from_github, last_github_sync, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())
          RETURNING *
        `;

        const taskResult = await client.query(taskQuery, [
          issue.title,
          issue.description || "",
          userId,
          projectId,
          issue.completed,
          issue.due_date,
          issue.github_issue_id,
          issue.github_issue_number,
          repoFullName,
          issue.github_issue_url,
          JSON.stringify(issue.github_labels),
          issue.github_state,
          JSON.stringify(issue.github_assignees),
          true,
        ]);

        createdTasks.push(taskResult.rows[0]);
        console.log(
          `Created task from GitHub issue #${issue.github_issue_number}: ${issue.title}`
        );
      }

      await client.query("COMMIT");
      return createdTasks;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error creating tasks from issues:", error);
      throw new Error("Failed to create tasks from GitHub issues");
    } finally {
      client.release();
    }
  }

  /**
   * Update task with GitHub issue data
   * @param {number} taskId - Task ID
   * @param {Object} issueData - GitHub issue data
   * @returns {Promise<Object>} Updated task
   */
  static async updateTaskFromIssue(taskId, issueData) {
    try {
      const query = `
        UPDATE tasks SET
          title = $1,
          description = $2,
          completed = $3,
          due_date = $4,
          github_labels = $5,
          github_state = $6,
          github_assignees = $7,
          last_github_sync = NOW(),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `;

      const result = await db.query(query, [
        issueData.title,
        issueData.description || "",
        issueData.completed,
        issueData.due_date,
        JSON.stringify(issueData.github_labels),
        issueData.github_state,
        JSON.stringify(issueData.github_assignees),
        taskId,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Error updating task from issue:", error);
      throw new Error("Failed to update task from GitHub issue");
    }
  }

  /**
   * Get tasks that are synced from GitHub for a repository
   * @param {string} repoFullName - Repository full name
   * @param {number} userId - User ID
   * @returns {Promise<Array>} GitHub-synced tasks
   */
  static async getGitHubSyncedTasks(repoFullName, userId) {
    try {
      const query = `
        SELECT * FROM tasks 
        WHERE github_repo_name = $1 
        AND user_id = $2 
        AND synced_from_github = true
        ORDER BY github_issue_number ASC
      `;

      const result = await db.query(query, [repoFullName, userId]);
      return result.rows;
    } catch (error) {
      console.error("Error getting GitHub synced tasks:", error);
      throw new Error("Failed to retrieve GitHub synced tasks");
    }
  }

  /**
   * Update GitHub integration sync timestamp
   * @param {number} integrationId - Integration ID
   * @returns {Promise<void>}
   */
  static async updateLastSyncTime(integrationId) {
    try {
      const query = `
        UPDATE github_integrations 
        SET last_sync_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `;

      await db.query(query, [integrationId]);
    } catch (error) {
      console.error("Error updating sync time:", error);
      throw new Error("Failed to update sync timestamp");
    }
  }

  /**
   * Deactivate GitHub integration
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async deactivateGitHubIntegration(userId) {
    try {
      const query = `
        UPDATE github_integrations 
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1
      `;

      await db.query(query, [userId]);
    } catch (error) {
      console.error("Error deactivating GitHub integration:", error);
      throw new Error("Failed to deactivate GitHub integration");
    }
  }

  /**
   * Get GitHub integration statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Integration statistics
   */
  static async getGitHubIntegrationStats(userId) {
    try {
      const integration = await this.getGitHubIntegration(userId);
      if (!integration) {
        return null;
      }

      const statsQuery = `
        SELECT 
          COUNT(DISTINCT gr.repo_full_name) as total_repositories,
          COUNT(DISTINCT t.id) as total_synced_tasks,
          COUNT(DISTINCT CASE WHEN t.completed = false THEN t.id END) as open_tasks,
          COUNT(DISTINCT CASE WHEN t.completed = true THEN t.id END) as closed_tasks,
          MAX(t.last_github_sync) as last_sync
        FROM github_repositories gr
        LEFT JOIN tasks t ON t.github_repo_name = gr.repo_full_name AND t.synced_from_github = true
        WHERE gr.integration_id = $1
      `;

      const result = await db.query(statsQuery, [integration.id]);
      const stats = result.rows[0];

      return {
        integration_id: integration.id,
        github_username: integration.github_username,
        avatar_url: integration.avatar_url,
        connected_since: integration.created_at,
        last_activity: integration.updated_at,
        total_repositories: parseInt(stats.total_repositories) || 0,
        total_synced_tasks: parseInt(stats.total_synced_tasks) || 0,
        open_tasks: parseInt(stats.open_tasks) || 0,
        closed_tasks: parseInt(stats.closed_tasks) || 0,
        last_sync: stats.last_sync,
      };
    } catch (error) {
      console.error("Error getting GitHub integration stats:", error);
      throw new Error("Failed to retrieve GitHub integration statistics");
    }
  }

  /**
   * Remove repository configuration
   * @param {number} integrationId - Integration ID
   * @param {string} repoFullName - Repository full name
   * @returns {Promise<void>}
   */
  static async removeGitHubRepository(integrationId, repoFullName) {
    try {
      const query = `
        DELETE FROM github_repositories 
        WHERE integration_id = $1 AND repo_full_name = $2
      `;

      await db.query(query, [integrationId, repoFullName]);
    } catch (error) {
      console.error("Error removing GitHub repository:", error);
      throw new Error("Failed to remove GitHub repository configuration");
    }
  }

  /*integration for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Integration record or null
   */
  static async getGitHubIntegration(userId) {
    try {
      const query = `
        SELECT * FROM github_integrations 
        WHERE user_id = $1 AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error getting GitHub integration:", error);
      throw new Error("Failed to retrieve GitHub integration");
    }
  }

  /**
   * Add or update a GitHub repository configuration
   * @param {number} integrationId - GitHub integration ID
   * @param {Object} repoData - Repository data
   * @param {number} projectId - Project ID to associate with
   * @returns {Promise<Object>} Repository configuration
   */
  static async upsertGitHubRepository(
    integrationId,
    repoData,
    projectId = null
  ) {
    try {
      const query = `
        INSERT INTO github_repositories (
          integration_id, repo_full_name, repo_id, project_id,
          sync_enabled, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (integration_id, repo_full_name)
        DO UPDATE SET
          project_id = COALESCE(EXCLUDED.project_id, github_repositories.project_id),
          sync_enabled = EXCLUDED.sync_enabled,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await db.query(query, [
        integrationId,
        repoData.full_name,
        repoData.id,
        projectId,
        true,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("Error upserting GitHub repository:", error);
      throw new Error("Failed to save GitHub repository configuration");
    }
  }
}

module.exports = GitHubDbHelpers;
