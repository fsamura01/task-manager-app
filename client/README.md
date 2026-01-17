---
title: Task Manager - Frontend
description: React-based frontend for the Task Manager application, built with Vite.
type: frontend
tech_stack: [React, Vite, Lucide Icons, WebSockets]
---

## Task Manager - Frontend

This is the React-based frontend for the Task Manager application, built with Vite for a fast development experience.

### 🧱 Component Hierarchy & Logic

The application is structured into functional components that manage specific parts of the UI and state:

#### 1. 🛡️ Authentication (`AuthenticationProvider`)

- **Purpose**: Manages global user state (login/logout) and JWT storage.
- **Flow**: Wraps the entire application, providing `user` and `auth` functions via context. It checks for stored tokens on initialization.

#### 2. 🏠 Main Containers

- **`AppNavbar`**: Persistent navigation bar for profile access and logout.
- **`AuthScreen`**: Handles both Login and Registration views.
- **`ProjectsDashboard`**: The primary view after login, listing all projects and allowing creation of new ones.
- **`TasksDashboard`**: Displays tasks for a selected project, including statistics and filtering.

#### 3. 📝 Forms

- **`TaskCreationForm`**: Handles input validation and submission for new tasks.
- **`TaskEditForm`**: Used for modifying existing tasks via modals or inline views.
- **`LoginForm`/`RegistrationForm`**: Dedicated components for user credential handling.

### 🔄 Client-Side Flow

1. **Mounting**: `main.jsx` renders `App`, which is wrapped in the `AuthenticationProvider`.
2. **Auth Check**: `AuthenticationProvider` checks `localStorage` for a JWT. If found, it fetches the user profile.
3. **Data Fetching**: Once authenticated, the `ProjectsDashboard` triggers a fetch to `/api/projects`.
4. **State Management**: Components use hooks (like `useState` and `useEffect`) to manage local UI state (loading, errors, form inputs). Global state like "Active Project" is passed down or managed via lifting state up.

### 🛠️ Key Technologies

- **Vite**: Build tool and dev server.
- **React Hooks**: `useContext`, `useReducer`, `useState`, `useEffect`.
- **Lucide React**: Icon library for a clean UI.
- **WebSockets**: Real-time task status updates.

### 🚦 Getting Started

1. Navigate to the `client` directory.
2. Install dependencies: `npm install`
3. Configure your backend URL in code (default: `http://localhost:5000`).
4. Run development server: `npm run dev`
