-- First, let's update the users table to include authentication fields
-- Run this SQL to modify your existing users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';

-- Create an index on username for faster lookups during login
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create an index on email for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- If you want to start fresh with a new users table that has all the auth fields:
-- (Only run this if you want to recreate the table - it will delete existing data!)


DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE task_management.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (with hashed passwords)
-- Note: These passwords are hashed versions of "password123"
-- In production, never store plain text passwords!

INSERT INTO users (username, email, password_hash, name) VALUES
('testuser', 'test@example.com', '$2b$10$8GfgOXlVsWlmGFXjYKLuC.3rqkYVUuLVNTzpXQgQCzBQU.JlvQRN2', 'Test User'),
('alice', 'alice@example.com', '$2b$10$8GfgOXlVsWlmGFXjYKLuC.3rqkYVUuLVNTzpXQgQCzBQU.JlvQRN2', 'Alice Johnson'),
('bob', 'bob@example.com', '$2b$10$8GfgOXlVsWlmGFXjYKLuC.3rqkYVUuLVNTzpXQgQCzBQU.JlvQRN2', 'Bob Smith')
ON CONFLICT (username) DO NOTHING;