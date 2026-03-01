# 🚀 Task Manager Application Deployment Guide

This guide will walk you through the entire process of deploying your Task Manager application to production using a modern, 100% free hosting stack.

We will be deploying the application in three parts:
1. **The Database**: Neon (Serverless PostgreSQL)
2. **The Backend**: Render (Node.js/Express)
3. **The Frontend**: Vercel (React/Vite)

## 📋 Prerequisites
Before starting, ensure you have:
- Pushed your code to a **GitHub repository**.
- Admin access to that repository.
- A basic understanding of Environment Variables.

---

## 🗄️ Step 1: Database Setup (Neon)
Neon provides entirely free managed Serverless Postgres databases.

1. **Create an Account:** Go to [Neon.tech](https://neon.tech/) and sign up.
2. **Create a Project:** Click "New Project", name it (e.g., `task-manager-db`), select a region close to you, and click "Create Project".
3. **Get the Connection String:** Look for the dashboard connection details page. Copy the provided connection string.
   - It will look like this: `postgres://username:password@ep-something.region.aws.neon.tech/neondb?sslmode=require`
4. **Initialize the Schema:**
   - In Neon, go to the **SQL Editor** tab on the left menu.
   - Open your local file `server/task_manager.sql` (or whatever file contains your table definitions).
   - Copy the contents, paste them into the Neon SQL Editor, and execute the query to build your remote database structure.

---

## 🧮 Step 2: Backend Deployment (Render)
Render is an excellent free host for Node.js backends. Note: Free Render instances "spin down" to sleep after 15 minutes of inactivity, so the very first request after sleeping might take ~50 seconds to respond.

1. **Create an Account:** Go to [Render.com](https://render.com/) and sign up using your GitHub account.
2. **Create a Web Service:** 
   - Click "New" -> "Web Service".
   - Connect your GitHub repository containing the task manager app.
3. **Configure the Service:**
   - **Name:** task-manager-api (or similar)
   - **Region:** Match your Neon region if possible.
   - **Root Directory:** `server` *(Extremely important! Since your backend is in a subfolder)*
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (or whatever command runs your `app.js`)
   - **Instance Type:** Free
4. **Set Environment Variables:**
   - Scroll down to "Environment Variables" and click "Add Environment Variable". Add the following:
     - `DB_URL`: (Paste your Neon Connection String here)
     - `JWT_SECRET`: (Create a random long string for token signing, e.g., `my-super-secret-key-123456`)
     - `PORT`: `10000` (Render prefers overriding this)
     - `NODE_ENV`: `production`
5. **Deploy:** Click "Create Web Service". Wait 2-3 minutes while Render installs packages and boots up the API.
6. **Save the API URL:** Once deployed, Render will give you a live URL (e.g., `https://task-manager-api-xxxx.onrender.com`). Copy this!

---

## 🎨 Step 3: Frontend Deployment (Vercel)
Vercel is the creator of Next.js and provides the best hosting experience for modern React frontends.

1. **Update API Endpoint:**
   - In your local project, go to `client/src/utils/api.js` (or wherever you define the base backend URL).
   - *Crucial Step*: Make sure your frontend knows how to point to the live Render Backend. You can use Vite's environment variables for this.
   - Create a file named `.env.production` inside the `client` folder:
     ```env
     VITE_API_BASE_URL=https://task-manager-api-xxxx.onrender.com/api
     ```
   - Make sure your `api.js` connects using `import.meta.env.VITE_API_BASE_URL` rather than a hardcoded `localhost:5000/api`.
   - **Commit and Push these changes to GitHub.**
2. **Create an Account:** Go to [Vercel.com](https://vercel.com/) and log in with GitHub.
3. **Import Project:** Click "Add New..." -> "Project". Select your task manager repository.
4. **Configure Project:**
   - **Project Name:** task-manager (or similar)
   - **Framework Preset:** Vite
   - **Root Directory:** Edit this and select `client` *(Again, extremely important!)*
   - **Build Command:** Keep default (`npm run build`)
   - **Output Directory:** Keep default (`dist`)
5. **Environment Variables:**
   - If you didn't commit your `.env.production` file (or want to override it), add your `VITE_API_BASE_URL` pointing to your Render backend here.
6. **Deploy:** Click "Deploy" and wait about 30 seconds.

---

## 🚦 Step 4: Final Testing
1. Visit your live Vercel frontend URL (e.g., `https://task-manager-seven.vercel.app`).
2. Attempt to **Register** a new user. 
   - *(If this fails with a timeout, wait 1 minute. The free Render backend might be waking up from sleep).*
3. Create a **Project** and add a **Task** to verify database persistence.
4. Attempt a **File Upload** to verify your storage logic (if stored locally on Render, note that files will be wiped when the service restarts, so consider transitioning uploads to AWS S3 or Cloudinary in the future).

### 🎉 Congratulations! 
Your full-stack task manager app is now live on the internet!
