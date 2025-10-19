-- Add indexes for faster data access
-- These indexes optimize the most common query patterns in TaskSpark AI

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON tasks(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status) WHERE project_id IS NOT NULL;

-- Full-text search index for title and description
CREATE INDEX IF NOT EXISTS idx_tasks_title_search ON tasks USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_tasks_description_search ON tasks USING gin(to_tsvector('english', COALESCE(description, '')));

-- Quota usage index for fast monthly lookups
CREATE INDEX IF NOT EXISTS idx_quota_user_month ON quota_usage(user_id, month);

-- AI insights index for recent insights
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(type);

-- Task templates index
CREATE INDEX IF NOT EXISTS idx_templates_project_id ON task_templates(project_id) WHERE project_id IS NOT NULL;
