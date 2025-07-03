-- Create users table in your dedicated schema
CREATE TABLE IF NOT EXISTS task_management.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table in your dedicated schema
CREATE TABLE IF NOT EXISTS task_management.tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    user_id INTEGER NOT NULL REFERENCES task_management.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP
);

-- Create indexes in your dedicated schema
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON task_management.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON task_management.users(email);