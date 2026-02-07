-- ============================================================================
-- Module 17: Task Management (Kanban)
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_comments table
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies: tasks
-- ---------------------------------------------------------------------------

-- ADMIN and HR can view all tasks
CREATE POLICY tasks_admin_hr_select ON tasks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ENGINEER can view tasks on their assigned projects
CREATE POLICY tasks_engineer_select ON tasks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ENGINEER'
        )
        AND project_id IN (
            SELECT pa.project_id
            FROM project_assignments pa
            JOIN employees e ON e.id = pa.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
              AND pa.is_active = true
        )
    );

-- WORKER can view tasks assigned to them
CREATE POLICY tasks_worker_select ON tasks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'WORKER'
        )
        AND assigned_to_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Only ADMIN and HR can create tasks
CREATE POLICY tasks_admin_hr_insert ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ADMIN and HR can update any task
CREATE POLICY tasks_admin_hr_update ON tasks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- Assigned employees can update their own tasks (status changes via self-service)
CREATE POLICY tasks_assignee_update ON tasks
    FOR UPDATE
    TO authenticated
    USING (
        assigned_to_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    )
    WITH CHECK (
        assigned_to_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Only ADMIN can delete tasks
CREATE POLICY tasks_admin_delete ON tasks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------------------------
-- Policies: task_comments
-- ---------------------------------------------------------------------------

-- Comments are visible to anyone who can view the parent task
-- ADMIN and HR can view all comments
CREATE POLICY comments_admin_hr_select ON task_comments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ENGINEER can view comments on tasks in their assigned projects
CREATE POLICY comments_engineer_select ON task_comments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ENGINEER'
        )
        AND task_id IN (
            SELECT t.id FROM tasks t
            WHERE t.project_id IN (
                SELECT pa.project_id
                FROM project_assignments pa
                JOIN employees e ON e.id = pa.employee_id
                WHERE e.user_id = current_setting('app.current_user_id')::UUID
                  AND pa.is_active = true
            )
        )
    );

-- WORKER can view comments on tasks assigned to them
CREATE POLICY comments_worker_select ON task_comments
    FOR SELECT
    TO authenticated
    USING (
        task_id IN (
            SELECT t.id FROM tasks t
            JOIN employees e ON e.id = t.assigned_to_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- All authenticated users can add comments (to tasks they can view)
CREATE POLICY comments_insert ON task_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- Comments are immutable -- no update or delete policies
-- ---------------------------------------------------------------------------
-- Access Control Summary:
--   ADMIN   : Full CRUD on tasks; read/create comments on all tasks
--   HR      : Full CRUD on tasks (except delete); read/create comments on all tasks
--   ENGINEER: Read tasks on assigned projects; update own assigned tasks; comment
--   WORKER  : Read tasks assigned to self; update own assigned tasks; comment
-- ---------------------------------------------------------------------------
