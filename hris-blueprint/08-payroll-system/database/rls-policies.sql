-- ============================================================================
-- Module 08: Payroll System
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================
-- Access Control:
--   ADMIN  : Full access to all payroll records, periods, and payslips; can release
--   HR     : Full access to payroll records and periods; can approve but not release
--   ENGINEER: View own payroll records and payslips only
--   WORKER  : View own payroll records and payslips only
-- ============================================================================

-- =============================================
-- payroll_periods policies
-- =============================================
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can view payroll periods
-- ---------------------------------------------------------------------------
CREATE POLICY payroll_periods_admin_hr_select ON payroll_periods
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
-- Policy: Only ADMIN and HR can manage payroll periods
-- ---------------------------------------------------------------------------
CREATE POLICY payroll_periods_admin_hr_insert ON payroll_periods
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

CREATE POLICY payroll_periods_admin_hr_update ON payroll_periods
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

-- =============================================
-- payroll_records policies
-- =============================================
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all payroll records
-- ---------------------------------------------------------------------------
CREATE POLICY payroll_records_admin_hr_select ON payroll_records
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
-- Policy: Employees can view their own payroll records
-- ---------------------------------------------------------------------------
CREATE POLICY payroll_records_self_select ON payroll_records
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can create payroll records (via generation)
-- ---------------------------------------------------------------------------
CREATE POLICY payroll_records_admin_hr_insert ON payroll_records
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
-- Policy: Only ADMIN and HR can update payroll records (approve/release)
-- ---------------------------------------------------------------------------
CREATE POLICY payroll_records_admin_hr_update ON payroll_records
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
-- Policy: Only ADMIN and HR can delete DRAFT payroll records
-- ---------------------------------------------------------------------------
CREATE POLICY payroll_records_admin_hr_delete ON payroll_records
    FOR DELETE
    TO authenticated
    USING (
        status = 'DRAFT'
        AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

-- =============================================
-- payslips policies
-- =============================================
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all payslips
-- ---------------------------------------------------------------------------
CREATE POLICY payslips_admin_hr_select ON payslips
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
-- Policy: Employees can view their own payslips
-- ---------------------------------------------------------------------------
CREATE POLICY payslips_self_select ON payslips
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only system (via payroll release) can create payslips
-- ---------------------------------------------------------------------------
CREATE POLICY payslips_admin_hr_insert ON payslips
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
-- Policy: Employees can update their own payslip (to set viewed_at)
-- ---------------------------------------------------------------------------
CREATE POLICY payslips_self_update ON payslips
    FOR UPDATE
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    )
    WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- =============================================
-- sss_contribution_table policies (read-only for all)
-- =============================================
ALTER TABLE sss_contribution_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY sss_table_select ON sss_contribution_table
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY sss_table_admin_insert ON sss_contribution_table
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

CREATE POLICY sss_table_admin_update ON sss_contribution_table
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );
