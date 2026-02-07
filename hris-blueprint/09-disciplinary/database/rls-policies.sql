-- ============================================================================
-- Module 09: Disciplinary
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================
-- Access Control:
--   ADMIN  : Full access to all disciplinary records, explanations, and sanctions
--   HR     : Full access to all disciplinary records, explanations, and sanctions
--   ENGINEER: View own records only; submit explanations on own NTEs
--   WORKER  : View own records only; submit explanations on own NTEs
-- ============================================================================

-- =============================================
-- disciplinary_records policies
-- =============================================
ALTER TABLE disciplinary_records ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all disciplinary records
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_records_admin_hr_select ON disciplinary_records
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
-- Policy: Employees can view their own disciplinary records
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_records_self_select ON disciplinary_records
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can create disciplinary records (issue NTEs)
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_records_admin_hr_insert ON disciplinary_records
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
-- Policy: Only ADMIN and HR can update disciplinary records (resolve NTEs)
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_records_admin_hr_update ON disciplinary_records
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
-- Policy: ADMIN and HR can update status when employee submits explanation
-- (The application layer handles the Issued -> Explanation_Received transition
--  when an employee submits via POST /:id/explanation)
-- ---------------------------------------------------------------------------

-- =============================================
-- disciplinary_explanations policies
-- =============================================
ALTER TABLE disciplinary_explanations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all explanations
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_explanations_admin_hr_select ON disciplinary_explanations
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
-- Policy: Employees can view explanations on their own NTEs
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_explanations_self_select ON disciplinary_explanations
    FOR SELECT
    TO authenticated
    USING (
        disciplinary_record_id IN (
            SELECT dr.id FROM disciplinary_records dr
            JOIN employees e ON e.id = dr.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Employees can submit explanations on their own NTEs
-- (Application layer validates the NTE belongs to the submitting employee
--  and that the NTE status is 'Issued')
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_explanations_self_insert ON disciplinary_explanations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- ADMIN/HR can insert on behalf
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
        OR
        -- Employee can submit for their own NTE
        disciplinary_record_id IN (
            SELECT dr.id FROM disciplinary_records dr
            JOIN employees e ON e.id = dr.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
              AND dr.status = 'Issued'
        )
    );

-- =============================================
-- disciplinary_sanctions policies
-- =============================================
ALTER TABLE disciplinary_sanctions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all sanctions
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_sanctions_admin_hr_select ON disciplinary_sanctions
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
-- Policy: Employees can view sanctions on their own NTEs
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_sanctions_self_select ON disciplinary_sanctions
    FOR SELECT
    TO authenticated
    USING (
        disciplinary_record_id IN (
            SELECT dr.id FROM disciplinary_records dr
            JOIN employees e ON e.id = dr.employee_id
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can create sanctions
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_sanctions_admin_hr_insert ON disciplinary_sanctions
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
-- Policy: Only ADMIN and HR can update sanctions
-- ---------------------------------------------------------------------------
CREATE POLICY disciplinary_sanctions_admin_hr_update ON disciplinary_sanctions
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
