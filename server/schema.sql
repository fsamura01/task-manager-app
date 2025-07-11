ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';

-- DROP TABLE IF EXISTS users CASCADE;

-- Create users table in your dedicated schema
CREATE TABLE IF NOT EXISTS task_management.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

INSERT INTO users (username, email, password_hash, name) VALUES
('testuser', 'test@example.com', '$2b$10$8GfgOXlVsWlmGFXjYKLuC.3rqkYVUuLVNTzpXQgQCzBQU.JlvQRN2', 'Test User'),
('alice', 'alice@example.com', '$2b$10$8GfgOXlVsWlmGFXjYKLuC.3rqkYVUuLVNTzpXQgQCzBQU.JlvQRN2', 'Alice Johnson'),
('bob', 'bob@example.com', '$2b$10$8GfgOXlVsWlmGFXjYKLuC.3rqkYVUuLVNTzpXQgQCzBQU.JlvQRN2', 'Bob Smith')
ON CONFLICT (username) DO NOTHING;