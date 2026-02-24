// services/githubOAuthService.js
const crypto = require("crypto");

class GitHubOAuthService {
  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.baseUrl =
      process.env.GITHUB_OAUTH_BASE_URL || "https://github.com/login/oauth";
    this.apiBaseUrl =
      process.env.GITHUB_API_BASE_URL || "https://api.github.com";

    if (!this.clientId || !this.clientSecret) {
      throw new Error("GitHub OAuth credentials not configured");
    }
  }

  /**
   * Generate GitHub OAuth authorization URL
   * @param {string} redirectUri - The callback URL after authorization
   * @param {string} state - CSRF protection state parameter
   * @returns {string} Authorization URL
   */
  generateAuthUrl(redirectUri, state = null) {
    // Generate secure random state if not provided
    if (!state) {
      state = crypto.randomBytes(32).toString("hex");
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: "repo,user:email,read:user", // Permissions we need
      state: state,
      allow_signup: "true",
    });

    return {
      url: `${this.baseUrl}/authorize?${params.toString()}`,
      state: state,
    };
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from GitHub callback
   * @param {string} state - State parameter for CSRF protection
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code, state) {
    try {
      const response = await fetch(`${this.baseUrl}/access_token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "TaskManager-App/1.0",
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          state: state,
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub OAuth error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(
          `GitHub OAuth error: ${data.error_description || data.error}`,
        );
      }

      return {
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
        refresh_token: data.refresh_token, // GitHub doesn't provide refresh tokens for OAuth apps
      };
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      throw new Error(
        `Failed to exchange authorization code: ${error.message}`,
      );
    }
  }

  /**
   * Get GitHub user information using access token
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} User information
   */
  async getUserInfo(accessToken) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "TaskManager-App/1.0",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `GitHub API error: ${response.status} - ${
            errorData.message || "Unknown error"
          }`,
        );
      }

      const userData = await response.json();

      return {
        id: userData.id,
        username: userData.login,
        email: userData.email,
        name: userData.name,
        avatar_url: userData.avatar_url,
        bio: userData.bio,
        company: userData.company,
        location: userData.location,
        public_repos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        created_at: userData.created_at,
      };
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw new Error(`Failed to fetch GitHub user info: ${error.message}`);
    }
  }

  /**
   * Get user's GitHub repositories
   * @param {string} accessToken - GitHub access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User repositories
   */
  async getUserRepositories(accessToken, options = {}) {
    console.log(
      "🚀 ~ GitHubOAuthService ~ getUserRepositories ~ accessToken:",
      accessToken,
    );
    try {
      const params = new URLSearchParams({
        sort: options.sort || "updated",
        direction: options.direction || "desc",
        per_page: options.per_page || "100",
        page: options.page || "1",
        type: options.type || "all", // all, owner, public, private, member
      });

      const response = await fetch(`${this.apiBaseUrl}/user/repos?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "TaskManager-App/1.0",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `GitHub API error: ${response.status} - ${
            errorData.message || "Unknown error"
          }`,
        );
      }

      const repositories = await response.json();

      return repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
        default_branch: repo.default_branch,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        watchers_count: repo.watchers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        has_issues: repo.has_issues,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
          type: repo.owner.type,
        },
      }));
    } catch (error) {
      console.error("Error fetching repositories:", error);
      throw new Error(`Failed to fetch GitHub repositories: ${error.message}`);
    }
  }

  /**
   * Test if access token is valid
   * @param {string} accessToken - GitHub access token to test
   * @returns {Promise<boolean>} Whether token is valid
   */
  async validateToken(accessToken) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "TaskManager-App/1.0",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }

  /**
   * Get rate limit information
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} Rate limit information
   */
  async getRateLimit(accessToken) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/rate_limit`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "TaskManager-App/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      return data.rate;
    } catch (error) {
      console.error("Error fetching rate limit:", error);
      throw new Error(`Failed to fetch rate limit: ${error.message}`);
    }
  }
}

module.exports = GitHubOAuthService;
