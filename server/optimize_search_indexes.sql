-- Database Indexing for Performance Optimization
-- This script adds indexes to improve search performance on tasks.

-- 1. Standard B-tree Index for exact matches (useful for short titles or exact filters)
-- While ILIKE '%term%' doesn't use B-tree indexes, they are still good for exact title lookups.
CREATE INDEX IF NOT EXISTS idx_tasks_title_btree ON task_management.tasks(title);

-- 2. Trigram Index for Performance Optimization of 'LIKE' and 'ILIKE' queries
-- Trigram indexes allow PostgreSQL to search for substrings efficiently.
-- First, we need the pg_trgm extension.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN (Generalized Inverted Index) indexes using trigram operations
-- These significantly speed up ILIKE '%term%' queries.
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm ON task_management.tasks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_description_trgm ON task_management.tasks USING gin (description gin_trgm_ops);

-- 3. Composite Index for user-specific searches
-- Since all searches are within a user's context, including user_id can help.
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_title ON task_management.tasks(user_id, title);

-- Analyze the table to update statistics for the query planner
ANALYZE task_management.tasks;
