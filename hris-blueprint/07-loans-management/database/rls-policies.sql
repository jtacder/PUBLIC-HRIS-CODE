-- ============================================================================
-- Module 07: Loans Management (Cash Advances)
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================
-- Access Control:
--   ADMIN  : Full access to all cash advances and deduction records
--   HR     : Full access to all cash advances and deduction records
--   ENGINEER: View/create own cash advances; view own deduction history
--   WORKER  : View/create own cash advances; view own deduction history
-- ============================================================================

-- =============================================
-- cash_advances policies
-- =============================================
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all cash advances
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advances_admin_hr_select ON cash_advances
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
-- Policy: Employees can view their own cash advances
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advances_self_select ON cash_advances
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: All authenticated users can submit cash advance requests
-- (Application layer validates employee_id matches current user for non-admin)
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advances_insert ON cash_advances
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
-- Policy: Only ADMIN and HR can update cash advances (approve/disburse/reject)
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advances_admin_hr_update ON cash_advances
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
-- Policy: System can update cash advances (for auto-deduction from payroll)
-- This allows the payroll computation process to update remaining_balance
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advances_system_update ON cash_advances
    FOR UPDATE
    TO authenticated
    USING (status = 'Disbursed')
    WITH CHECK (status IN ('Disbursed', 'Fully_Paid'));

-- =============================================
-- cash_advance_deductions policies
-- =============================================
ALTER TABLE cash_advance_deductions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all deduction records
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advance_deductions_admin_hr_select ON cash_advance_deductions
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
-- Policy: Employees can view their own deduction records
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advance_deductions_self_select ON cash_advance_deductions
    FOR SELECT
    TO authenticated
    USING (
        cash_advance_id IN (
            SELECT ca.id FROM cash_advances ca
            JOIN employees e ON e.id = ca.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only system (via payroll process) can insert deduction records
-- ADMIN/HR role required as the payroll process runs under an admin session
-- ---------------------------------------------------------------------------
CREATE POLICY cash_advance_deductions_insert ON cash_advance_deductions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );
