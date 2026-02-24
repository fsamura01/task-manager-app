const express = require("express");
const router = express.Router();
const githubController = require("../controllers/github_controller");
const verifyToken = require("../middleware/verifytoken");

/**
 * GITHUB AUTH ROUTES
 */
router.get("/auth/github", verifyToken, githubController.initiateAuth);
router.get("/auth/github/callback", githubController.handleCallback);

/**
 * GITHUB INTEGRATION MANAGEMENT
 */
router.post("/integrations/github/connect", verifyToken, githubController.connect);
router.get("/integrations/github/status", verifyToken, githubController.getStatus);
router.delete("/integrations/github", verifyToken, githubController.disconnect);
router.get("/integrations/github/repositories", verifyToken, githubController.getRepos);
router.get("/integrations/github/repositories/:owner/:repo/issues/preview", verifyToken, githubController.getPreview);
router.post("/integrations/github/import-issues", verifyToken, githubController.importIssues);

module.exports = router;
