-- ============================================================================
-- Module 16: Project Management
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project_assignments table
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies: projects
-- ---------------------------------------------------------------------------

-- ADMIN and HR can view all projects
CREATE POLICY projects_admin_hr_select ON projects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ENGINEER can view projects they are assigned to
CREATE POLICY projects_engineer_select ON projects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ENGINEER'
        )
        AND id IN (
            SELECT pa.project_id
            FROM project_assignments pa
            JOIN employees e ON e.id = pa.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
              AND pa.is_active = true
        )
    );

-- WORKER can view projects they are assigned to
CREATE POLICY projects_worker_select ON projects
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'WORKER'
        )
        AND id IN (
            SELECT pa.project_id
            FROM project_assignments pa
            JOIN employees e ON e.id = pa.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
              AND pa.is_active = true
        )
    );

-- Only ADMIN and HR can create projects
CREATE POLICY projects_admin_hr_insert ON projects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- Only ADMIN and HR can update projects
CREATE POLICY projects_admin_hr_update ON projects
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

-- Only ADMIN can delete projects
CREATE POLICY projects_admin_delete ON projects
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
-- Policies: project_assignments
-- ---------------------------------------------------------------------------

-- ADMIN and HR can view all assignments
CREATE POLICY assignments_admin_hr_select ON project_assignments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ENGINEER and WORKER can view assignments for their projects
CREATE POLICY assignments_member_select ON project_assignments
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT pa.project_id
            FROM project_assignments pa
            JOIN employees e ON e.id = pa.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
              AND pa.is_active = true
        )
    );

-- Only ADMIN and HR can manage assignments
CREATE POLICY assignments_admin_hr_insert ON project_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

CREATE POLICY assignments_admin_hr_update ON project_assignments
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

CREATE POLICY assignments_admin_hr_delete ON project_assignments
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ---------------------------------------------------------------------------
-- Access Control Summary:
--   ADMIN   : Full CRUD on projects and assignments
--   HR      : Full CRUD on projects and assignments
--   ENGINEER: Read assigned projects and their assignments only
--   WORKER  : Read assigned projects and their assignments only
-- ---------------------------------------------------------------------------
