-- ============================================================================
-- Module 17: Task Management (Kanban)
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: tasks
-- Description: Task definitions with Kanban-style status tracking
-- Linked to projects and assigned to individual employees
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Project association
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Assignee
    assigned_to_id      UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Status and priority
    status              VARCHAR(30) NOT NULL DEFAULT 'Todo'
                        CHECK (status IN ('Todo', 'In_Progress', 'Blocked', 'Done')),
    priority            VARCHAR(20) NOT NULL DEFAULT 'Medium'
                        CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),

    -- Timeline
    due_date            DATE,

    -- Kanban ordering (lower = higher position in column)
    sort_order          INTEGER NOT NULL DEFAULT 0,

    -- Proof of completion
    completion_photo_url TEXT,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to_id ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date)
    WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_kanban_order ON tasks(status, sort_order);

COMMENT ON TABLE tasks IS 'Kanban-style task definitions with status, priority, and project association';
COMMENT ON COLUMN tasks.project_id IS 'FK to projects -- every task belongs to a project';
COMMENT ON COLUMN tasks.assigned_to_id IS 'FK to employees -- the employee responsible for this task';
COMMENT ON COLUMN tasks.status IS 'Kanban status: Todo, In_Progress, Blocked, Done';
COMMENT ON COLUMN tasks.priority IS 'Priority level: Low, Medium, High, Critical';
COMMENT ON COLUMN tasks.sort_order IS 'Manual sort order within a Kanban column (lower = higher position)';
COMMENT ON COLUMN tasks.completion_photo_url IS 'URL to proof-of-completion photo (e.g., site photo)';

-- ---------------------------------------------------------------------------
-- Table: task_comments
-- Description: Flat (non-threaded) comment list for task discussions
-- Supports optional file attachment URLs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_comments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content             TEXT NOT NULL,

    -- Optional attachment
    attachment_url      TEXT,

    -- Timestamps (comments are immutable -- no updated_at)
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(task_id, created_at);

COMMENT ON TABLE task_comments IS 'Flat (non-threaded) comments on tasks with optional file attachments';
COMMENT ON COLUMN task_comments.task_id IS 'FK to tasks -- the task this comment belongs to';
COMMENT ON COLUMN task_comments.user_id IS 'FK to users -- the user who wrote the comment';
COMMENT ON COLUMN task_comments.content IS 'Comment text content';
COMMENT ON COLUMN task_comments.attachment_url IS 'Optional URL to an attached file or document';
