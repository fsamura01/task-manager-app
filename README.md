# Task Manager App

A React-based task management application that allows users to create, edit, delete, and track tasks with due dates and completion status.

## Features

### Task Management
- **Create Tasks**: Add new tasks with title, description, and due date
- **Edit Tasks**: Modify existing tasks with inline editing
- **Delete Tasks**: Remove tasks with confirmation dialog
- **Toggle Completion**: Mark tasks as complete/incomplete with one click

### User Experience
- **Task Statistics**: View total, incomplete, and completed task counts
- **Visual Feedback**: Different styling for completed vs incomplete tasks
- **Loading States**: Clear feedback during API operations
- **Error Handling**: Comprehensive error messages and validation

### Form Validation
- **Title**: Required, minimum 3 characters
- **Description**: Required
- **Due Date**: Required, cannot be in the past (for incomplete tasks)
- **Real-time Validation**: Clear errors as user types

### Data Management
- **Optimistic Updates**: Immediate UI updates for better UX
- **Auto-refresh**: Tasks update instantly after creation/editing
- **Conflict Detection**: Handles concurrent edits gracefully

## Technical Details

### Components
- **App**: Main application component with task list and state management
- **TaskCreationForm**: Form for creating new tasks
- **TaskEditForm**: Inline editing component for existing tasks

### API Integration
- RESTful API calls to `http://localhost:5000/api/tasks`
- Supports GET, POST, PUT, and DELETE operations
- Proper error handling and status code responses

### State Management
- React hooks (useState, useEffect) for local state
- Optimistic updates for immediate user feedback
- Separation of concerns between form and display logic

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Ensure backend API is running on `http://localhost:5000`

## Usage

1. **Create a Task**: Fill out the form at the top with title, description, and due date
2. **Edit a Task**: Click the "Edit" button on any task to modify it
3. **Complete a Task**: Click "Mark Complete" to toggle completion status
4. **Delete a Task**: Click "Delete" and confirm to remove a task

## API Requirements

The app expects a backend API with these endpoints:
- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get specific task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

Expected task object structure:
```json
{
  "id": 1,
  "title": "Task Title",
  "description": "Task Description",
  "due_date": "2024-12-31",
  "completed": false,
  "user_id": 1
}
```
## Task Manager API

A RESTful API for managing tasks and users built with Node.js, Express, and PostgreSQL.

## Features

### Task Management
- **Create Tasks**: Add new tasks with title, description, due date, and user assignment
- **View Tasks**: Get all tasks or retrieve specific tasks by ID
- **Update Tasks**: Edit task details with optimistic concurrency control
- **Delete Tasks**: Remove tasks with validation and error handling
- **Task Completion**: Mark tasks as complete/incomplete with automatic timestamp tracking

### Data Management
- **User Integration**: Tasks are linked to users with name and email display
- **Timestamp Tracking**: Automatic creation and update timestamps
- **Data Validation**: Server-side validation for all task fields
- **Sanitization**: Input cleaning and length validation

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks with user information |
| GET | `/api/tasks/:id` | Get specific task by ID |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id` | Update existing task |
| DELETE | `/api/tasks/:id` | Delete task |

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User's full name
- `email` - Unique email address
- `password_hash` - Hashed password
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Tasks Table
- `id` - Primary key
- `title` - Task title (required)
- `description` - Task description
- `completed` - Boolean completion status
- `user_id` - Foreign key to users table
- `due_date` - Task due date
- `created_at` - Task creation timestamp
- `updated_at` - Last modification timestamp

## Validation Rules

- **Title**: 3-200 characters, required
- **Description**: 10-1000 characters, required
- **Due Date**: Cannot be in the past for incomplete tasks
- **User ID**: Must reference existing user

## Error Handling

- **400**: Bad request (validation errors)
- **404**: Resource not found
- **409**: Conflict (concurrent modifications)
- **500**: Internal server error

## Concurrency Control

Uses optimistic locking with timestamp comparison to prevent conflicting updates when multiple users modify the same task.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Connection Pooling**: node-postgres (pg)
- **Environment**: dotenv for configuration
- **CORS**: Enabled for cross-origin requests

## Setup

1. Install dependencies: `npm install`
2. Configure environment variables in `.env`
3. Set up PostgreSQL database with provided schema
4. Run the server: `npm start`

Default port: 5000 (configurable via PORT environment variable)
