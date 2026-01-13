---
title: Task Manager App
description: A full-stack project-based task management application built with React, Node.js, and PostgreSQL.
type: project-root
tech_stack: [React, Node.js, Express, PostgreSQL, WebSockets]
---

# Task Manager App

A full-stack project-based task management application built with a modern tech stack (React, Node.js, Express, PostgreSQL). This app allows users to organize tasks within projects, manage authentication, and handle file uploads.

## 🏗️ High-Level Architecture

The application follows a standard client-server architecture:

-   **Frontend (Client)**: A React application built with Vite, handling the user interface, state management, and API communication.
-   **Backend (Server)**: An Express.js server providing RESTful API endpoints, handling authentication, data persistence, and file management.
-   **Database**: PostgreSQL for structured data storage (Users, Projects, Tasks).
-   **Storage**: Local file storage (with middleware prepared for S3) for uploaded files.

## 🔄 Logic Flow

### 🔐 Authentication Flow
1.  **Sign Up**: User submits credentials -> Server hashes password (bcrypt) -> User record created in DB -> JWT token returned.
2.  **Login**: User submits credentials -> Server verifies password -> JWT token generated -> Token sent to client.
3.  **Authorization**: Client includes JWT in the `Authorization` header for protected requests -> `verifyToken` middleware validates the token before reaching the controller logic.

### 📝 Task & Project Management
1.  **Dashboard**: Upon login, the client fetches projects/tasks associated with the authenticated user ID.
2.  **Creation**: User submits a form -> Client sends POST request -> Server validates input and project ownership -> Record inserted into DB -> Real-time broadcast (via WebSockets) notifies other connected clients.
3.  **Updates/Deletions**: Similar flow to creation, using PUT/DELETE methods with ownership checks.

## 🛠️ Technical Stack

-   **Frontend**: React, CSS (Vanilla), Vite, Lucide Icons.
-   **Backend**: Node.js, Express.js.
-   **Database**: PostgreSQL (pg pool).
-   **Authentication**: JSON Web Tokens (JWT), Bcrypt.
-   **Real-time**: WebSockets (WS).

## 📁 Project Structure

```text
task-manager-app/
├── client/          # React frontend (Vite)
├── server/          # Express backend & API
├── database_schema.sql # Database initialization
└── README.md        # This file
```

## 🚀 Quick Start

### Prerequisites
-   Node.js (v18+)
-   PostgreSQL

### 1. Database Setup
Create a database in PostgreSQL and run the schemas provided in the `server` directory:
```bash
psql -U your_user -d your_db -f server/schema.sql
```

### 2. Backend Setup
```bash
cd server
npm install
# Configure .env based on .env.example
npm start
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

---

*For detailed technical documentation, please refer to the READMEs in the [client](file:///d:/task-manager-app/client/README.md) and [server](file:///d:/task-manager-app/server/README.md) directories.*
