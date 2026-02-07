-- ============================================================================
-- Module 05: 201 Files
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================
-- Access Control:
--   ADMIN  : Full CRUD on all employee documents and government IDs
--   HR     : Full CRUD on all employee documents and government IDs
--   ENGINEER: Read-only access to own documents and government IDs
--   WORKER  : Read-only access to own documents and government IDs
-- ============================================================================

-- =============================================
-- employee_documents policies
-- =============================================
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all employee documents
-- ---------------------------------------------------------------------------
CREATE POLICY employee_documents_admin_hr_select ON employee_documents
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
-- Policy: Employees can view their own documents
-- ---------------------------------------------------------------------------
CREATE POLICY employee_documents_self_select ON employee_documents
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can insert documents
-- ---------------------------------------------------------------------------
CREATE POLICY employee_documents_admin_hr_insert ON employee_documents
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
-- Policy: Only ADMIN and HR can update documents (verification, notes)
-- ---------------------------------------------------------------------------
CREATE POLICY employee_documents_admin_hr_update ON employee_documents
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
-- Policy: Only ADMIN and HR can delete documents
-- ---------------------------------------------------------------------------
CREATE POLICY employee_documents_admin_hr_delete ON employee_documents
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
-- employee_government_ids policies
-- =============================================
ALTER TABLE employee_government_ids ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: ADMIN and HR can view all government IDs
-- ---------------------------------------------------------------------------
CREATE POLICY employee_gov_ids_admin_hr_select ON employee_government_ids
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
-- Policy: Employees can view their own government IDs
-- ---------------------------------------------------------------------------
CREATE POLICY employee_gov_ids_self_select ON employee_government_ids
    FOR SELECT
    TO authenticated
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            WHERE e.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN and HR can insert government IDs
-- ---------------------------------------------------------------------------
CREATE POLICY employee_gov_ids_admin_hr_insert ON employee_government_ids
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
-- Policy: Only ADMIN and HR can update government IDs
-- ---------------------------------------------------------------------------
CREATE POLICY employee_gov_ids_admin_hr_update ON employee_government_ids
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
-- Policy: Only ADMIN and HR can delete government IDs
-- ---------------------------------------------------------------------------
CREATE POLICY employee_gov_ids_admin_hr_delete ON employee_government_ids
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );
