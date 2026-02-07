-- ============================================================================
-- Module 02: Employee Management
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all employees
-- ---------------------------------------------------------------------------
CREATE POLICY employees_admin_hr_select ON employees
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: ENGINEER can view employees assigned to the same projects
-- ---------------------------------------------------------------------------
CREATE POLICY employees_engineer_select ON employees
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ENGINEER'
        )
        AND (
            -- Can see self
            user_id = current_setting('app.current_user_id')::UUID
            OR
            -- Can see employees on same project
            id IN (
                SELECT pa2.employee_id
                FROM project_assignments pa1
                JOIN project_assignments pa2 ON pa1.project_id = pa2.project_id
                JOIN employees eng ON eng.user_id = current_setting('app.current_user_id')::UUID
                WHERE pa1.employee_id = eng.id AND pa1.is_active = true AND pa2.is_active = true
            )
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: WORKER can only view their own employee record
-- ---------------------------------------------------------------------------
CREATE POLICY employees_worker_select ON employees
    FOR SELECT
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
        AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'WORKER'
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can insert employees
-- ---------------------------------------------------------------------------
CREATE POLICY employees_admin_hr_insert ON employees
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can update employees
-- ---------------------------------------------------------------------------
CREATE POLICY employees_admin_hr_update ON employees
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

-- ---------------------------------------------------------------------------
-- Policy: WORKER can update limited fields on their own record
-- (implemented at application layer - this policy allows the update)
-- ---------------------------------------------------------------------------
CREATE POLICY employees_self_update ON employees
    FOR UPDATE
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    )
    WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN can delete (soft-delete) employees
-- ---------------------------------------------------------------------------
CREATE POLICY employees_admin_delete ON employees
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );
