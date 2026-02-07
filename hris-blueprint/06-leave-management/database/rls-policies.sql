-- ============================================================================
-- Module 06: Leave Management
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================
-- Access Control:
--   ADMIN  : Full access to all leave requests, types, and allocations
--   HR     : Full access to all leave requests, types, and allocations
--   ENGINEER: View/create own leave requests; view own allocations; view leave types
--   WORKER  : View/create own leave requests; view own allocations; view leave types
-- ============================================================================

-- =============================================
-- leave_types policies
-- =============================================
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: All authenticated users can view active leave types
-- ---------------------------------------------------------------------------
CREATE POLICY leave_types_select ON leave_types
    FOR SELECT
    TO authenticated
    USING (true);

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can manage leave types
-- ---------------------------------------------------------------------------
CREATE POLICY leave_types_admin_hr_insert ON leave_types
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

CREATE POLICY leave_types_admin_hr_update ON leave_types
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

CREATE POLICY leave_types_admin_hr_delete ON leave_types
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- =============================================
-- leave_requests policies
-- =============================================
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all leave requests
-- ---------------------------------------------------------------------------
CREATE POLICY leave_requests_admin_hr_select ON leave_requests
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
-- Policy: Employees can view their own leave requests
-- ---------------------------------------------------------------------------
CREATE POLICY leave_requests_self_select ON leave_requests
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: All authenticated users can submit leave requests
-- (Application layer validates employee_id matches current user for non-admin)
-- ---------------------------------------------------------------------------
CREATE POLICY leave_requests_insert ON leave_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- ADMIN/HR can create for anyone
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
        OR
        -- Employees can only create for themselves
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can update leave requests (approve/reject)
-- ---------------------------------------------------------------------------
CREATE POLICY leave_requests_admin_hr_update ON leave_requests
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
-- Policy: Employees can update (cancel) their own pending requests
-- (Application layer enforces that only status = 'Cancelled' is allowed)
-- ---------------------------------------------------------------------------
CREATE POLICY leave_requests_self_cancel ON leave_requests
    FOR UPDATE
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
        AND status = 'Pending'
    )
    WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- =============================================
-- leave_allocations policies
-- =============================================
ALTER TABLE leave_allocations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all allocations
-- ---------------------------------------------------------------------------
CREATE POLICY leave_allocations_admin_hr_select ON leave_allocations
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
-- Policy: Employees can view their own allocations
-- ---------------------------------------------------------------------------
CREATE POLICY leave_allocations_self_select ON leave_allocations
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can manage allocations
-- ---------------------------------------------------------------------------
CREATE POLICY leave_allocations_admin_hr_insert ON leave_allocations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

CREATE POLICY leave_allocations_admin_hr_update ON leave_allocations
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
