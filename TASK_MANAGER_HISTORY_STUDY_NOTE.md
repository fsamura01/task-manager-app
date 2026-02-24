# 📚 Task Manager App: Full-Stack Development Study Note

This document summarizes the historical evolution, architectural decisions, and key technical concepts of the **Task Manager App**. Use this as a guide for understanding how to build and scale a professional-grade full-stack application.

---

## 🏗️ 1. The Architectural Journey

The application evolved through two major architectural stages:

### Stage 1: The Monolith (Initial Build)
In the beginning, the application followed a "Big File" strategy. 
- **Server**: `app.js` contained everything—database queries, authentication logic, route definitions, and error handling. (Over 3,000 lines of code!)
- **Client**: A flat `components/` folder were all UI logic lived together.
- **Benefit**: Easy to start and see connections.
- **Problem**: Impossible to maintain, test, or collaborate on as the app grew.

### Stage 2: The Modular Router (The Great Refactoring)
To scale, the app was broken down into a **Modular Router Architecture**.
- **Server**: Logic was split into:
  - `routes/`: Just defines URLs.
  - `controllers/`: Handles the business logic (the "chef").
  - `models/`: Handles raw database queries (the "pantry manager").
  - `middleware/`: Handles global checks (security, token verification).
- **Client**: Transitioned to **Feature-Based Organization** where `auth`, `tasks`, and `files` are self-contained modules.

### Stage 3: The Robust Engine (Error Handling & Reliability)
The third evolution focused on making the application professional-grade and "unbreakable".
- **Backend**: Implemented **Centralized Error Handling**. Replaced manual `try-catch` with a `catchAsync` utility and custom `AppError` classes.
- **Frontend**: Standardized communication via a centralized `api` utility. Integrated an **Error Boundary** to prevent UI crashes and a **Notification Context** for global user feedback.
- **Compatibility**: Upgraded to **Express 5**, requiring stricter route definitions and fixing wildcard route behaviors.

---

## 📡 2. The Backend "Map" (Server Directory)

The backend follows the **MVC (Model-View-Controller)** pattern:

| Folder | Responsibility | Example |
| :--- | :--- | :--- |
| `config/` | Application settings. | Storage strategies (Local vs S3). |
| `controllers/` | The brains. Receives requests and decides what to do. | `task_controller.js` -> `updateTask`. |
| `models/` | The interface for SQL. No business logic, only data. | `task_model.js` -> `UPDATE tasks SET...`. |
| `routes/` | The entry points. Defines the URL paths. | `auth_routes.js` -> `/login`. |
| `middleware/` | Intercepts requests for security or formatting. | `verifytoken.js` checks if you are logged in. |
| `services/` | Integration with 3rd party APIs. | `github_api.js` for importing issues. |
| `sockets/` | Handles real-time communication. | `socket_manager.js`. |

---

## 🎨 3. The Frontend "Hive" (Client Directory)

The client is organized by **Responsibility**, not just file type:

- **`src/hooks/`**: Custom "tools" like `useAuth` or `useWebSocket`.
- **`src/components/features/`**: Heavy-duty logic blocks.
  - `auth/`: Login/Register forms.
  - `tasks/`: Modals for editing/creating tasks.
  - `files/`: Drag-and-drop uploaders.
- **`src/pages/`**: The main views (The "Dashboard").
- **`src/context/`**: The "Global Brain" that shares state (like user info) across all pages.

---

## 🧠 4. Critical Technical Concepts (Study These!)

### 🔐 1. Authentication (JWT)
We use **JSON Web Tokens**.
- **Flow**: User Logs in -> Server generates a signed Token -> Client saves it in `localStorage` -> Client sends it in the `Authorization` header for every future request.
- **Benefit**: The server doesn't have to remember your session ID; it just "decodes" the token to see who you are.

### 🔄 2. Real-Time Sync (WebSockets)
Instead of the browser asking "Is there a new task?" every second (Polling), we use a persistent connection:
- **Server**: When a task is created, it calls `io.emit('task_created', task)`.
- **Client**: The `useWebSocket` hook listens for this event and updates the UI instantly without a refresh.

### 📁 3. File Path Security (Multer)
Files are not stored with their original names (to prevent collisions and security attacks).
- **Logic**: `uploads/YYYY/MM/timestamp-randomhex.ext`.
- **Reference**: See `DEBUGGING_NOTES.md` for path normalization details.

### 🗑️ 4. Recursive Deletion (CASCADE)
When you delete a **Project**, what happens to the **Tasks** inside it?
- We use SQL `ON DELETE CASCADE`.
- This ensures that cleaning up a parent record automatically wipes the children, keeping the database clean.

---

## 🛡️ 5. Error Handling & Robustness

Professional apps don't just "work"; they fail gracefully. We implemented a multi-layered safety net:

### 🧩 1. Backend: The `AppError` Strategy
Instead of returning generic 500 errors, we use specialized classes:
- `BadRequestError (400)`: For invalid input.
- `UnauthorizedError (401)`: For missing tokens.
- `NotFoundError (404)`: For missing resources.
- **Utility**: `catchAsync` wraps every controller function, so any error (thrown or rejected) goes straight to the `errorHandler` middleware.

### 🛡️ 2. Frontend: The Error Boundary
If a JavaScript error occurs during rendering (e.g., a missing variable like `Card`), the `ErrorBoundary` catches it.
- **Fail-Safe**: Instead of a "White Screen of Death," the user sees a premium "Something went wrong" screen with a reload button.

### 📮 3. Notification System (Toasts)
User actions now give immediate feedback via the `useNotification` hook.
- **Variants**: `success` (green), `danger` (red), `info` (blue).
- **Architecture**: A Global `NotificationProvider` at the root of the app manages the message queue.

---

## 🏗️ 6. Express 5 & Modern Routing

Upgrading to **Express 5** introduced breaking changes in how routes are parsed:
1. **Wildcards**: `app.all("*")` is replaced by middleware `app.use((req, res, next) => { ... })` to catch unmatched routes without triggering `path-to-regexp` errors.
2. **Path Parameters**: Strictly defined parameters (e.g., `/:id`) are required for reliability.
3. **Async Routes**: Express 5 natively handles rejected promises in routes, aligning perfectly with our `catchAsync` pattern.

## 🛠️ 7. Debugging Pro-Tips
1. **Empty FormData**: Remember that `console.log(formData)` shows nothing. Use `[...formData.entries()]` to see what's inside.
2. **Database Reset**: Use `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` to wipe data and reset IDs to 1.
3. **Network Tab**: Always check the "Network" tab in Chrome DevTools to see exactly what the server is receiving or erroring on.

## 🧪 8. Testing & Verification

To ensure the error handling system is functioning, perform these "Stress Tests":

### 1. Triggering System Errors (Backend)
- **The 404 Test**: Visit `/api/non-existent`.
  - *Expected*: A clean JSON response with `status: "fail"` and a custom error message.
- **The Unauthorized Test**: Call `GET /api/tasks` without a Bearer token.
  - *Expected*: A `401 Access token required` response handled by the `api` utility.

### 2. Triggering UI Resiliency (Frontend)
- **The Error Boundary Test**: Instead of hardcoding a `throw` (which causes "unreachable code" warnings), use a test trigger:
  1. Click the **"Test Crash"** button added to the Tasks Dashboard.
  2. *Expected*: The app should NOT show a white screen. It should show the "Something went wrong" emergency UI with a **Reload** button.
  - *Tip*: If you see a Vite/React error overlay (purple/black), click the "X" on it to see the underlying `ErrorBoundary` UI.
- **The Notification Test**: Disable your internet and click "Deploy Directive".
  - *Expected*: A red toast notification should appear saying "Action failed. Check connection." (or a specific API error).

### 3. Business Logic Validation
- **Past Date Check**: Try to set a task deadline for yesterday.
  - *Expected*: Inline validation should turn the input red and disable the submit button.
- **Form Length Check**: Enter a 1-character title.
  - *Expected*: "That name is too short" validation alert should appear.

---

## 🏁 Summary for Students
Building a professional app isn't just about making features work; it's about **Separation of Concerns** and **Predictable Failure**. Keep your functions small, your files focused, handle your errors centrally, and always respect the rules of the framework versions you are using.
