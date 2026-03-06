# 🚀 Task Manager Application Deployment Guide

This guide documents the entire process of deploying the Task Manager application to production using a modern, 100% free hosting stack.

## ✅ Live URLs

| Layer | Service | URL |
|:---|:---|:---|
| 🗄️ Database | Neon (PostgreSQL) | `ep-young-heart-ai42kj6l-pooler.c-4.us-east-1.aws.neon.tech` |
| 🧮 Backend | Render (Node.js/Express) | [task-manager-api-8uzs.onrender.com](https://task-manager-api-8uzs.onrender.com) |
| 🎨 Frontend | Vercel (React/Vite) | *(Add your Vercel URL here)* |

---

## 📋 Prerequisites
Before starting, ensure you have:
- Pushed your code to a **GitHub repository**.
- Admin access to that repository.
- A basic understanding of Environment Variables.

---

## 🗄️ Step 1: Database Setup (Neon)
Neon provides entirely free managed Serverless Postgres databases.

1. **Create an Account:** Go to [Neon.tech](https://neon.tech/) and sign up.
2. **Create a Project:** Click "New Project", name it (e.g., `task-manager-db`), select a region close to you (we chose **US East**), and click "Create Project".
3. **Get the Connection String:** Copy the provided connection string from the dashboard.
   - Format: `postgres://username:password@ep-something.region.aws.neon.tech/neondb?sslmode=require`
4. **Initialize the Schema:**
   - Option A (Manual): Go to Neon's **SQL Editor** tab, paste the contents of `server/task_manager.sql`, and click "Run".
   - Option B (Terminal): Run `psql "YOUR_CONNECTION_STRING" -f server/task_manager.sql` from your local terminal.

### ⚠️ Schema File Gotchas (Fixed)
The `task_manager.sql` file required three fixes before it could run on a blank Neon database:
1. Added `CREATE SCHEMA IF NOT EXISTS "task_management";` at the top (Neon only has a `public` schema by default).
2. Added `CASCADE` to all `DROP TABLE` statements so foreign key dependencies don't block drops.
3. Reordered `INSERT` statements so `tasks` are inserted before `files` (since `files` references `task_id`).

---

## 🧮 Step 2: Backend Deployment (Render)
Render is an excellent free host for Node.js backends.

> **Note:** Free Render instances "spin down" to sleep after 15 minutes of inactivity. The first request after sleeping takes ~30-50 seconds to respond.

1. **Create an Account:** Go to [Render.com](https://render.com/) and sign up using your GitHub account.
2. **Create a Web Service:**
   - Click "New" -> "Web Service".
   - Connect your GitHub repository.
3. **Configure the Service:**
   - **Name:** `task-manager-api`
   - **Region:** Virginia (US East) — matches Neon for low latency.
   - **Root Directory:** `server` *(Critical! The backend is in a subfolder)*
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Set Environment Variables (Required):**
   | Key | Value |
   |:---|:---|
   | `DB_URL` | Your Neon connection string |
   | `JWT_SECRET` | A long random string for token signing |
   | `PORT` | `10000` |
   | `NODE_ENV` | `production` |
5. **Optional Environment Variables (for extra features):**
   | Key | Purpose |
   |:---|:---|
   | `GITHUB_CLIENT_ID` | Enables GitHub OAuth integration |
   | `GITHUB_CLIENT_SECRET` | Enables GitHub OAuth integration |
   | `STORAGE_STRATEGY` | Set to `s3` to use AWS S3 instead of local storage |
   | `S3_BUCKET_NAME` | Your S3 bucket name |
   | `AWS_ACCESS_KEY_ID` | Your AWS access key |
   | `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
   | `AWS_REGION` | Your AWS region (e.g., `us-east-1`) |
6. **Deploy:** Click "Create Web Service". Wait 2-3 minutes.

### 🐛 Deployment Crashes We Fixed
Two issues caused the initial Render deploys to crash:
1. **`multer-s3` bucket error:** The S3 upload middleware threw `Error: bucket is required` because `S3_BUCKET_NAME` wasn't set. Fixed by adding a fallback string and changing the default storage strategy to `local`.
2. **GitHub OAuth crash:** The `GitHubOAuthService` constructor threw `Error: GitHub OAuth credentials not configured`. Fixed by replacing the `throw` with a `console.warn()` so the server starts without GitHub credentials.

---

## 🎨 Step 3: Frontend Deployment (Vercel)

### How API Routing Works
The frontend uses a **relative URL** (`/api`) in `client/src/utils/api.js`. This means:
- **Local dev:** Vite's proxy in `vite.config.js` forwards `/api` requests to `localhost:5000`.
- **Production:** A `vercel.json` rewrite rule forwards `/api` requests to the Render backend.

No environment variables or code changes are needed!

### The `vercel.json` File
Created at `client/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://task-manager-api-8uzs.onrender.com/api/:path*"
    }
  ]
}
```

### Deployment Steps
1. Go to [Vercel.com](https://vercel.com/) and log in with GitHub.
2. Click **"Add New Project"** and import your repository.
3. **Root Directory:** Set to `client` *(Critical!)*
4. **Framework Preset:** Auto-detected as Vite.
5. Leave Build Command and Output Directory toggles **grey (auto-detect)**.
6. Click **"Deploy"** — takes about 30 seconds.

---

## 🚦 Step 4: Final Testing
1. Visit your live Vercel frontend URL.
2. **Register** a new user or log in with the seeded test user.
   - *(First request may take ~30s if the Render backend is waking up from sleep.)*
3. Create a **Project** and add a **Task** to verify database persistence.
4. Test **File Upload** (files stored locally on Render will be wiped on restart — consider S3 for permanent storage).

---

## 🏗️ Architecture Summary

```text
┌─────────────┐     /api/*      ┌─────────────────┐      SQL       ┌──────────┐
│   Vercel     │ ──────────────> │     Render       │ ─────────────> │   Neon   │
│  (Frontend)  │   vercel.json   │    (Backend)     │   DB_URL env   │  (Postgres)│
│  React/Vite  │    rewrite      │  Node/Express    │                │          │
└─────────────┘                  └─────────────────┘                └──────────┘
```

### 🎉 Deployment Complete!
Deployed on **March 1, 2026**.
