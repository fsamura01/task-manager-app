// services/githubApiService.js
class GitHubApiService {
  constructor() {
    this.apiBaseUrl =
      process.env.GITHUB_API_BASE_URL || "https://api.github.com";
    this.rateLimitBuffer =
      parseInt(process.env.GITHUB_RATE_LIMIT_BUFFER) || 100;
  }

  /**
   * Make authenticated request to GitHub API with error handling and rate limiting
   * @param {string} endpoint - API endpoint (e.g., '/repos/owner/repo/issues')
   * @param {string} accessToken - GitHub access token
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, accessToken, options = {}) {
    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${this.apiBaseUrl}${endpoint}`;

      const requestOptions = {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "TaskManager-App/1.0",
          ...options.headers,
        },
      };

      if (options.body) {
        requestOptions.body =
          typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body);
        requestOptions.headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, requestOptions);

      // Handle rate limiting
      if (
        response.status === 403 &&
        response.headers.get("x-ratelimit-remaining") === "0"
      ) {
        const resetTime =
          parseInt(response.headers.get("x-ratelimit-reset")) * 1000;
        const waitTime = resetTime - Date.now();
        throw new Error(
          `Rate limit exceeded. Reset at ${new Date(
            resetTime
          ).toISOString()}. Wait ${Math.ceil(waitTime / 1000)} seconds.`
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `GitHub API error ${response.status}: ${
            errorData.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();

      // Return data along with pagination and rate limit info
      return {
        data: data,
        pagination: this.extractPaginationInfo(response),
        rateLimit: this.extractRateLimitInfo(response),
      };
    } catch (error) {
      console.error(`GitHub API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get repository issues
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} accessToken - GitHub access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Repository issues
   */
  async getRepositoryIssues(owner, repo, accessToken, options = {}) {
    try {
      const params = new URLSearchParams({
        state: options.state || "open", // open, closed, all
        sort: options.sort || "updated", // created, updated, comments
        direction: options.direction || "desc", // asc, desc
        per_page: options.per_page || "30",
        page: options.page || "1",
        since: options.since || "", // ISO 8601 format
        labels: options.labels || "", // comma-separated list
        assignee: options.assignee || "", // username or 'none' or '*'
        milestone: options.milestone || "", // milestone number or 'none' or '*'
      });

      // Remove empty parameters
      /*  for (let [key, value] of params.entries()) {
        if (!value) params.delete(key);
      }
 */

      // Remove empty parameters - ADD THIS SECTION
      for (let [key, value] of [...params.entries()]) {
        if (!value || value === "") {
          params.delete(key);
        }
      }

      const endpoint = `/repos/${owner}/${repo}/issues?${params}`;
      const response = await this.makeRequest(endpoint, accessToken);

      // Filter out pull requests (GitHub treats PRs as issues)
      const issues = response.data.filter((issue) => !issue.pull_request);

      return {
        issues: issues.map(this.transformIssueData),
        pagination: response.pagination,
        rateLimit: response.rateLimit,
      };
    } catch (error) {
      console.error(`Error fetching issues for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific issue
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} issueNumber - Issue number
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} Issue data
   */
  async getIssue(owner, repo, issueNumber, accessToken) {
    try {
      const endpoint = `/repos/${owner}/${repo}/issues/${issueNumber}`;
      const response = await this.makeRequest(endpoint, accessToken);

      // Make sure it's not a pull request
      if (response.data.pull_request) {
        throw new Error("This is a pull request, not an issue");
      }

      return {
        issue: this.transformIssueData(response.data),
        rateLimit: response.rateLimit,
      };
    } catch (error) {
      console.error(
        `Error fetching issue ${owner}/${repo}#${issueNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Transform GitHub issue data to our task format
   * @param {Object} issue - Raw GitHub issue data
   * @returns {Object} Transformed issue data
   */
  transformIssueData(issue) {
    // Calculate due date from milestone or labels
    let dueDate = null;
    if (issue.milestone && issue.milestone.due_on) {
      dueDate = issue.milestone.due_on;
    }

    // Extract priority from labels
    let priority = "medium";
    const priorityLabels = {
      "priority: high": "high",
      "priority: low": "low",
      critical: "high",
      urgent: "high",
      enhancement: "low",
    };

    for (const label of issue.labels || []) {
      const labelName = label.name.toLowerCase();
      if (priorityLabels[labelName]) {
        priority = priorityLabels[labelName];
        break;
      }
    }

    return {
      github_issue_id: issue.id,
      github_issue_number: issue.number,
      github_issue_url: issue.html_url,
      github_state: issue.state,
      github_labels: issue.labels || [],
      github_assignees: issue.assignees || [],
      title: issue.title,
      description: issue.body || "",
      completed: issue.state === "closed",
      due_date: dueDate,
      priority: priority,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      closed_at: issue.closed_at,
      author: {
        username: issue.user.login,
        avatar_url: issue.user.avatar_url,
        html_url: issue.user.html_url,
      },
      milestone: issue.milestone
        ? {
            title: issue.milestone.title,
            description: issue.milestone.description,
            due_on: issue.milestone.due_on,
            state: issue.milestone.state,
          }
        : null,
      comments_count: issue.comments || 0,
    };
  }

  /**
   * Update issue state (close/reopen)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} issueNumber - Issue number
   * @param {string} accessToken - GitHub access token
   * @param {string} state - 'open' or 'closed'
   * @returns {Promise<Object>} Updated issue
   */
  async updateIssueState(owner, repo, issueNumber, accessToken, state) {
    try {
      const endpoint = `/repos/${owner}/${repo}/issues/${issueNumber}`;
      const response = await this.makeRequest(endpoint, accessToken, {
        method: "PATCH",
        body: { state: state },
      });

      return {
        issue: this.transformIssueData(response.data),
        rateLimit: response.rateLimit,
      };
    } catch (error) {
      console.error(
        `Error updating issue state ${owner}/${repo}#${issueNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Create a new issue
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} accessToken - GitHub access token
   * @param {Object} issueData - Issue creation data
   * @returns {Promise<Object>} Created issue
   */
  async createIssue(owner, repo, accessToken, issueData) {
    try {
      const endpoint = `/repos/${owner}/${repo}/issues`;
      const response = await this.makeRequest(endpoint, accessToken, {
        method: "POST",
        body: {
          title: issueData.title,
          body: issueData.body || "",
          labels: issueData.labels || [],
          assignees: issueData.assignees || [],
          milestone: issueData.milestone || null,
        },
      });

      return {
        issue: this.transformIssueData(response.data),
        rateLimit: response.rateLimit,
      };
    } catch (error) {
      console.error(`Error creating issue in ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} accessToken - GitHub access token
   * @returns {Promise<Object>} Repository data
   */
  async getRepository(owner, repo, accessToken) {
    try {
      const endpoint = `/repos/${owner}/${repo}`;
      const response = await this.makeRequest(endpoint, accessToken);

      return {
        repository: {
          id: response.data.id,
          name: response.data.name,
          full_name: response.data.full_name,
          description: response.data.description,
          private: response.data.private,
          html_url: response.data.html_url,
          has_issues: response.data.has_issues,
          open_issues_count: response.data.open_issues_count,
          default_branch: response.data.default_branch,
          permissions: response.data.permissions,
        },
        rateLimit: response.rateLimit,
      };
    } catch (error) {
      console.error(`Error fetching repository ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Extract pagination information from response headers
   * @param {Response} response - Fetch response object
   * @returns {Object} Pagination info
   */
  extractPaginationInfo(response) {
    const linkHeader = response.headers.get("link");
    const pagination = {
      hasNext: false,
      hasPrevious: false,
      hasFirst: false,
      hasLast: false,
      nextPage: null,
      prevPage: null,
      firstPage: null,
      lastPage: null,
    };

    if (!linkHeader) return pagination;

    const links = linkHeader.split(",").reduce((acc, link) => {
      const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const url = match[1];
        const rel = match[2];
        const pageMatch = url.match(/[?&]page=(\d+)/);
        if (pageMatch) {
          acc[rel] = parseInt(pageMatch[1]);
        }
      }
      return acc;
    }, {});

    return {
      hasNext: !!links.next,
      hasPrevious: !!links.prev,
      hasFirst: !!links.first,
      hasLast: !!links.last,
      nextPage: links.next || null,
      prevPage: links.prev || null,
      firstPage: links.first || null,
      lastPage: links.last || null,
    };
  }

  /**
   * Extract rate limit information from response headers
   * @param {Response} response - Fetch response object
   * @returns {Object} Rate limit info
   */
  extractRateLimitInfo(response) {
    return {
      limit: parseInt(response.headers.get("x-ratelimit-limit")) || 5000,
      remaining: parseInt(response.headers.get("x-ratelimit-remaining")) || 0,
      reset: parseInt(response.headers.get("x-ratelimit-reset")) || 0,
      resetDate: new Date(
        parseInt(response.headers.get("x-ratelimit-reset")) * 1000
      ),
      used: parseInt(response.headers.get("x-ratelimit-used")) || 0,
    };
  }

  /**
   * Check if we're approaching rate limit
   * @param {Object} rateLimit - Rate limit info from API response
   * @returns {boolean} Whether we're near the rate limit
   */
  isNearRateLimit(rateLimit) {
    return rateLimit.remaining <= this.rateLimitBuffer;
  }
}

module.exports = GitHubApiService;
