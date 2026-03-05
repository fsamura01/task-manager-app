# Deployment Troubleshooting & Fixes

This document records the major hurdles encountered while transitioning the Task Manager Application from a local development environment to a production environment (Neon, Render, Vercel), and what required fixing to make it work.

## 1. Hardcoded Localhost API URLs
**The Issue:** The frontend code had hardcoded `http://localhost:5000/api` references in several files (`ProjectsPage.jsx`, `GithubIntegrationPage.jsx`, etc.). While this works perfectly in local development, it fundamentally breaks when the frontend is hosted on a cloud provider like Vercel because the client attempts to connect to the user's local machine instead of the cloud backend (Render).
**The Fix:** We replaced all hardcoded `http://localhost:5000` strings with relative paths (e.g., `/api`). This allows Vercel's `vercel.json` rewrite configuration to seamlessly proxy API requests to the Render backend domain, while Vite handles the proxying smoothly in local development.

## 2. Invalid URL Construction
**The Issue:** After converting hardcoded paths to relative paths (`/api/projects/with-tasks`), `new URL('/api/...')` started throwing 500 errors. `new URL()` strictly requires an absolute URL (with an `http://` or `https://` prefix). 
**The Fix:** We replaced the strict `new URL()` constructor with manual string concatenation (`let endpoint = '/api/projects/with-tasks';`), which handles optional search parameters and safely works with relative paths in any environment.

## 3. Neon Database Connection Options (PgBouncer Pooling)
**The Issue:** The PostgreSQL driver's connection `search_path` behavior fails intermittently when connected to Neon's **pooled** connections (`-pooler` in the connection string). Neon uses PgBouncer in transaction mode to save memory; this means a connection drops state (like the `search_path` setting that was defined on the `pool.on('connect')` listener) between individual queries.
**The Fix:** Our programmatic workaround inside `database.js` was unreliable. The permanent fix was connecting directly to the Neon database and updating the database user role's default settings via SQL (`ALTER ROLE "neondb_owner" SET search_path TO task_management, public;`). Once applied at the role level, PgBouncer properly respects the schema for every transaction. Note that we later removed the unreliable `pool.on('connect', ...)` logic entirely from the codebase.

## 4. Uncreated Tables Due to Dependency Order
**The Issue:** A 500 Server Error was thrown citing `relation "files" does not exist` when accessing project attachments or opening WebSockets. The source `task_manager.sql` script defined the `files` table BEFORE the `tasks` table. Because `files` has a foreign key constraint referencing `tasks`, the PostgreSQL execution halted during database initialization, completely skipping the table creation.
**The Fix:** We temporarily ran a one-off database script against Neon to properly create the `files` table and its indices. We then updated the `task_manager.sql` schema file, properly re-ordering it so that the `tasks` table is declared before the `files` table to guarantee that any future database resets will execute smoothly.

## 5. Single Page Application (SPA) Client-Side Routing
**The Issue:** Attempting to refresh or directly link to nested frontend pages (e.g., `https://domain.com/projects/1/tasks`) resulted in a 404 Not Found error from Vercel. Vercel acts as a static file server and assumes `/projects/1/tasks` is actually a directory folder on the server.
**The Fix:** Added a "catch-all" rewrite rule inside the `client/vercel.json` file. This tells Vercel's edge network that for any requested route that does NOT begin with `/api/`, it should simply serve the root `index.html` file and allow React Router to mount the correct UI view based on the URL path.

## 6. Mixed-Content Security Policy on Downloads
**The Issue:** File downloads failed silently with a `Mixed Content` security error in the browser console. The browser, running on Vercel (`https://`), blocked the backend download URL because it was prefixed with `http://`. Render (like most platforms) proxies incoming `https` traffic into the internal Node container as standard `http`. Thus, `req.protocol` evaluated to `http`.
**The Fix:** Modified the Express server setup (`createApp.js`) to include `app.set("trust proxy", 1);`. This tells Express it sits behind a trusted reverse proxy and should inspect the `X-Forwarded-Proto` header, ensuring `req.protocol` resolves to correctly serve `https://` links.

## 7. Ephemeral File Storage Constraints
**The Issue:** After restarting or redeploying the Render backend, any previously uploaded files instantly returned a 404 response. Free-tier cloud providers operate isolated containers representing ephemeral file systems; any files saved locally to `./uploads ` disappear as soon as the system stops or rebuilds. 
**The Recommendation:** Rather than relying on cloud local file storage `local` strategy, the configuration supports integrating Amazon S3 `s3` object storage via environment variables `STORAGE_STRATEGY=s3` to completely separate uploaded asset data from the fragile container lifecycle.

## 8. Swallowed Database Errors & Generic 500 Responses
**The Issue:** While debugging the registration and files modules, the API repeatedly returned a generic `"Something went very wrong!"` message with a 500 status code. This happened because the production error handler was configured to hide internal details for security, and the `AuthenticationDbHelper` model was using `try-catch` blocks that swallowed the original PostgreSQL error and re-threw a generic one. This made it impossible to identify root causes like missing tables or schema mismatches.
**The Fix:** We performed a two-step debugging fix: 
1. Temporarily modified `server/middleware/error_handler.js` to send `err.message` instead of the generic string.
2. Refactored `server/models/auth_model.js` to remove redundant `try-catch` blocks, allowing raw database errors (e.g., `relation "files" does not exist`) to bubble up to the global handler. This "fail-loud" approach in development/debugging is crucial for moving from a local environment to a cloud-managed schema.
+
+## 9. Scalable API Proxying via Greedy Wildcards (`:path*`)
+**The Issue:** Manually configuring a separate rewrite rule in `vercel.json` for every new API module (e.g., `/api/auth`, `/api/projects`, `/api/tasks`, `/api/files`) would be unsustainable and error-prone during rapid development.
+**The Fix:** We implemented a "catch-all" or "greedy" wildcard using the syntax `:path*`. 
+In the configuration:
+```json
+{
+  "source": "/api/:path*",
+  "destination": "https://task-manager-api-8uzs.onrender.com/api/:path*"
+}
+```
+*   The `:` designates `path` as a dynamic variable.
+*   The `*` makes it "greedy," meaning it captures every segment of the URL after `/api/`, including nested slashes and query parameters.
+
+This single rule acts as a universal bridge, allowing the frontend to call any existing or future backend endpoint without ever needing to update the Vercel configuration again. It effectively decouples the frontend deployment from backend endpoint additions.
+
+## 10. GitHub OAuth "redirect_uri" Mismatch
+**The Issue:** When attempting to connect GitHub in production, the error `"The redirect_uri is not associated with this application"` is thrown. This occurs because the GitHub OAuth application settings on GitHub.com have hardcoded `localhost` callback URLs, but the production app (Render) is sending its own live URL as the `redirect_uri`.
+**The Fix:**
+1.  Go to **GitHub Settings -> Developer Settings -> OAuth Apps**.
+2.  Update the **Homepage URL** to the live Vercel frontend URL.
+3.  Update the **Authorization callback URL** to the live Render backend URL: `https://task-manager-api-8uzs.onrender.com/api/auth/github/callback`.
+4.  Ensure both the frontend and backend environment variables (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) are correctly synced between the local `.env` and the Render/Vercel dashboards.
+
+## 11. Post-OAuth Redirecting to "localhost" instead of Dashboard
+**The Issue:** After a successful GitHub authorization, the browser attempts to redirect to `http://localhost:3000/github-callback` instead of the live Vercel dashboard, resulting in an `ERR_CONNECTION_REFUSED`. This happens because the backend code uses a default `localhost:3000` fallback for the frontend URL if the `FRONTEND_URL` environment variable is not explicitly set on Render.
+**The Fix:**
+1.  **Backend Code Update:** We updated `github_controller.js` to be more flexible, checking for both `FRONTEND_URL` and `CLIENT_URL` environment variables.
+2.  **Environment Variable:** You must add the following variable to your **Render Dashboard** (Backend Service):
+    *   **Key:** `FRONTEND_URL`
+    *   **Value:** `https://task-manager-app-seven-blond.vercel.app`
+3.  **Result:** Once set, the backend will correctly "bounce" you back to your live Vercel dashboard to complete the synchronization.

## 12. GitHub OAuth "Stuck" on Authorization Page
**The Issue:** After clicking "Authorize," the user remained on the GitHub page instead of being redirected. This happened because the `redirect_uri` sent by the backend was being dynamically generated from the `host` header, which can be unreliable (reporting `localhost` or internal IDs) on Render's proxy. GitHub requires an exact string match for security.
**The Fix:**
1.  **Backend Code Update:** Refactored `github_controller.js` to prioritize a hardcoded `BACKEND_URL` environment variable when constructing the redirect URI.
2.  **Environment Variable:** Add the following to **Render**:
    *   **Key:** `BACKEND_URL`
    *   **Value:** `https://task-manager-api-8uzs.onrender.com`
3.  **Result:** This forces the backend to always send the official, whitelisted return address to GitHub, regardless of its internal server name.

## 13. GitHub Dashboard "Stuck" on Connect Button (UI State Sync)
**The Issue:** Even after a successful OAuth flow and database update, the frontend continued to show the "Connect GitHub" button instead of the user's repos. Console logs confirmed the API was returning `success: true`, but the integration stats were missing the critical `connected: true` boolean.
**The Fix:**
1.  **Backend Model Update:** Modified `server/models/github_model.js` in the `getGitHubIntegrationStats` method to explicitly include `connected: true` when a valid integration is found.
2.  **Result:** The frontend now correctly identifies the active connection state and automatically flips the UI to show the repository management dashboard.
