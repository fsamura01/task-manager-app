const GitHubDbHelpers = require("../models/github_model");
const GitHubOAuthService = require("../services/github_oauth_service");
const GitHubApiService = require("../services/github_api_service");
const crypto = require("crypto");
const db = require("../database");
const catchAsync = require("../utils/catch_async");
const { BadRequestError, NotFoundError } = require("../utils/app_error");

const githubOAuth = new GitHubOAuthService();
const githubApi = new GitHubApiService();

const oauthStates = new Map();
const completedOAuthFlows = new Map();

const OAUTH_CONFIG = {
  STATE_EXPIRY_MS: 10 * 60 * 1000,
  FLOW_EXPIRY_MS: 5 * 60 * 1000,
  FRONTEND_CALLBACK_URL: process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/github-callback`
    : "http://localhost:3000/github-callback",
};

/**
 * @description Initiates GitHub OAuth flow.
 */
exports.initiateAuth = catchAsync(async (req, res, next) => {
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
  const { url, state } = githubOAuth.generateAuthUrl(redirectUri);

  oauthStates.set(state, { userId: req.user.userId, createdAt: Date.now() });

  return res.json({ success: true, authorization_url: url });
});

/**
 * @description Handles GitHub OAuth callback.
 */
exports.handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedData = oauthStates.get(state);

    if (!storedData || (Date.now() - storedData.createdAt > OAUTH_CONFIG.STATE_EXPIRY_MS)) {
      return res.redirect(`${OAUTH_CONFIG.FRONTEND_CALLBACK_URL}?error=state_expired`);
    }

    const tokenData = await githubOAuth.exchangeCodeForToken(code, state);
    const githubUser = await githubOAuth.getUserInfo(tokenData.access_token);

    const flowId = crypto.randomBytes(16).toString("hex");
    completedOAuthFlows.set(flowId, {
      userId: storedData.userId,
      githubUser,
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + OAUTH_CONFIG.FLOW_EXPIRY_MS,
    });

    oauthStates.delete(state);

    res.redirect(`${OAUTH_CONFIG.FRONTEND_CALLBACK_URL}?success=true&username=${githubUser.username}&flow_id=${flowId}`);
  } catch (error) {
    console.error("GitHub Callback Error:", error);
    res.redirect(`${OAUTH_CONFIG.FRONTEND_CALLBACK_URL}?error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * @description Completes GitHub integration.
 */
exports.connect = catchAsync(async (req, res, next) => {
  const { flow_id } = req.body;
  const oauthData = completedOAuthFlows.get(flow_id);

  if (!oauthData || Date.now() > oauthData.expiresAt || oauthData.userId !== req.user.userId) {
    throw new BadRequestError("Invalid or expired OAuth flow session.");
  }

  const integration = await GitHubDbHelpers.upsertGitHubIntegration(
    req.user.userId,
    oauthData.githubUser,
    oauthData.accessToken
  );
  completedOAuthFlows.delete(flow_id);

  res.json({ success: true, data: integration });
});

/**
 * @description Retrieves integration status.
 */
exports.getStatus = catchAsync(async (req, res, next) => {
  const stats = await GitHubDbHelpers.getGitHubIntegrationStats(req.user.userId);
  res.json({ success: true, data: stats || { connected: false } });
});

/**
 * @description Lists repositories.
 */
exports.getRepos = catchAsync(async (req, res, next) => {
  const integration = await GitHubDbHelpers.getGitHubIntegration(req.user.userId);
  if (!integration) {
    throw new NotFoundError("GitHub integration not found for this user.");
  }

  const repositories = await githubOAuth.getUserRepositories(integration.access_token);
  const configuredRepos = await GitHubDbHelpers.getGitHubRepositories(integration.id);

  const configuredMap = configuredRepos.reduce((acc, repo) => {
      acc[repo.repo_full_name] = repo;
      return acc;
  }, {});

  const enrichedRepos = repositories.filter(r => r.has_issues).map(repo => ({
      ...repo,
      configured: !!configuredMap[repo.full_name],
      project_id: configuredMap[repo.full_name]?.project_id || null,
  }));

  res.json({ success: true, data: enrichedRepos });
});

/**
 * @description Imports issues from GitHub.
 */
exports.importIssues = catchAsync(async (req, res, next) => {
  const { repo_full_name, project_id, options = {} } = req.body;
  const integration = await GitHubDbHelpers.getGitHubIntegration(req.user.userId);
  if (!integration) {
    throw new NotFoundError("GitHub integration not found.");
  }

  const [owner, repo] = repo_full_name.split("/");
  const { issues } = await githubApi.getRepositoryIssues(owner, repo, integration.access_token, options);

  const createdTasks = await GitHubDbHelpers.createTasksFromIssues(
      issues, req.user.userId, project_id, repo_full_name
  );

  res.json({ 
    success: true, 
    message: `Imported ${createdTasks.length} issues.`,
    data: {
      imported_count: createdTasks.length,
      total_found: issues.length
    }
  });
});

/**
 * @description Disconnects GitHub integration.
 */
exports.disconnect = catchAsync(async (req, res, next) => {
  await db.query("DELETE FROM github_integrations WHERE user_id = $1", [req.user.userId]);
  res.json({ success: true, message: "Disconnected successfully" });
});

/**
 * @description Gets preview of issues.
 */
exports.getPreview = catchAsync(async (req, res, next) => {
  const { owner, repo } = req.params;
  const integration = await GitHubDbHelpers.getGitHubIntegration(req.user.userId);
  if (!integration) {
    throw new NotFoundError("GitHub integration not found.");
  }

  const { issues } = await githubApi.getRepositoryIssues(owner, repo, integration.access_token, req.query);
  res.json({ success: true, data: issues });
});
