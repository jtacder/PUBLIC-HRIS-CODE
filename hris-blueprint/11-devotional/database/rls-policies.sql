-- ============================================================================
-- Module 11: Devotional System
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on devotionals table
ALTER TABLE devotionals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on devotional_reading_logs table
ALTER TABLE devotional_reading_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies: devotionals
-- ---------------------------------------------------------------------------

-- All authenticated users can read devotionals
CREATE POLICY devotionals_select_all ON devotionals
    FOR SELECT
    TO authenticated
    USING (true);

-- Only ADMIN and HR can create devotionals
CREATE POLICY devotionals_admin_hr_insert ON devotionals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- Only ADMIN and HR can update devotionals
CREATE POLICY devotionals_admin_hr_update ON devotionals
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

-- Only ADMIN can delete devotionals
CREATE POLICY devotionals_admin_delete ON devotionals
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
-- Policies: devotional_reading_logs
-- ---------------------------------------------------------------------------

-- ADMIN and HR can view all reading logs (engagement reports)
CREATE POLICY reading_logs_admin_hr_select ON devotional_reading_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- Employees can view their own reading logs
CREATE POLICY reading_logs_self_select ON devotional_reading_logs
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- All authenticated users can insert their own reading log (mark as read)
CREATE POLICY reading_logs_self_insert ON devotional_reading_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Reading logs are not updatable or deletable (immutable engagement records)
