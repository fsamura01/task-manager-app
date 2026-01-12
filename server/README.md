# Task Manager - Backend API

This is the Express-based backend for the Task Manager application, providing a secure and scalable API for task and project management.

## ⚙️ Backend Architecture

The server is built with Node.js and Express, following a modular structure for middleware and services:

-   **`app.js`**: The main entry point where routes are defined, middleware is applied, and the server is started.
-   **`middleware/`**: Custom logic for authentication (`verifyToken`), file uploads, and request limiting.
-   **`services/`**: External API integrations (e.g., GitHub API/OAuth).
-   **`utils/`**: Helper functions for database operations, JWT generation, and hashing.
-   **`database.js`**: PostgreSQL connection pooling and test logic.

## 📡 API Endpoints

### 🔐 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new user account. |
| POST | `/api/auth/login` | Authenticate user and return JWT. |
| GET | `/api/auth/profile` | (Protected) Get current user's profile. |

### 📁 Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | (Protected) List all projects for the user. |
| POST | `/api/projects` | (Protected) Create a new project. |

### 📝 Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | (Protected) Get tasks (filter by `project_id`). |
| POST | `/api/tasks` | (Protected) Create a task within a project. |
| PUT | `/api/tasks/:id` | (Protected) Update task status or details. |
| DELETE | `/api/tasks/:id` | (Protected) Remove a task. |

## 🔄 Backend Logic Flow

1.  **Request Handling**: Every request starts at `app.js`.
2.  **Auth Middleware**: For protected routes, `verifyToken` checks the `Authorization` header. If valid, user info is attached to `req.user`.
3.  **Database Operations**: Controllers use `db.query` to interact with PostgreSQL. Transactions are used where necessary to maintain data integrity.
4.  **Real-time Broadcast**: After successful mutations (create/update/delete), the server emits events via WebSockets to keep connected clients in sync.
5.  **Error Handling**: Centralized error catching ensures consistent JSON responses for client errors (400, 401, 404) and server errors (500).

## 🗄️ Database Schema
Refer to `database_schema.sql` for the full DDL. Key tables include:
-   `users`: ID, username, email, password_hash.
-   `projects`: ID, name, description, user_id (FK).
-   `tasks`: ID, title, completed, project_id (FK), user_id (FK).

## 🚦 Getting Started
1.  Navigate to the `server` directory.
2.  Install dependencies: `npm install`
3.  Set up environment variables in `.env` (JWT_SECRET, DB_URL, etc.).
4.  Run the server: `npm start`
