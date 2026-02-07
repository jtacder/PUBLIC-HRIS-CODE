-- ============================================================================
-- Module 04: Attendance System
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_verifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- attendance_logs: ADMIN/HR can view all records
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_admin_hr_select ON attendance_logs
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
-- attendance_logs: ENGINEER can view records for their project teams
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_engineer_select ON attendance_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ENGINEER'
        )
        AND (
            -- Own attendance
            employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.user_id = current_setting('app.current_user_id')::UUID
            )
            OR
            -- Project team attendance
            project_id IN (
                SELECT pa.project_id FROM project_assignments pa
                JOIN employees e ON e.id = pa.employee_id
                WHERE e.user_id = current_setting('app.current_user_id')::UUID
                  AND pa.is_active = true
            )
        )
    );

-- ---------------------------------------------------------------------------
-- attendance_logs: WORKER can view only own records
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_worker_select ON attendance_logs
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
        AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'WORKER'
        )
    );

-- ---------------------------------------------------------------------------
-- attendance_logs: Any authenticated user can insert (for time-in/time-out)
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_insert ON attendance_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- ---------------------------------------------------------------------------
-- attendance_logs: ADMIN/HR can update any record; employees can update own
-- (limited to time-out and justification at application layer)
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_update ON attendance_logs
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
        OR
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- attendance_verifications: ADMIN/HR can view and create
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_verifications_select ON attendance_verifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

CREATE POLICY attendance_verifications_insert ON attendance_verifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );
