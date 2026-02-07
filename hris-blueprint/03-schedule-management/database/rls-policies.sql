-- ============================================================================
-- Module 03: Schedule Management
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- schedule_templates: All authenticated users can view active templates
-- ---------------------------------------------------------------------------
CREATE POLICY schedule_templates_select ON schedule_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- ---------------------------------------------------------------------------
-- schedule_templates: Only ADMIN/HR can manage templates
-- ---------------------------------------------------------------------------
CREATE POLICY schedule_templates_insert ON schedule_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

CREATE POLICY schedule_templates_update ON schedule_templates
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role IN ('ADMIN', 'HR')
        )
    );

CREATE POLICY schedule_templates_delete ON schedule_templates
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
-- employee_schedules: ADMIN/HR can view all; employees can view own
-- ---------------------------------------------------------------------------
CREATE POLICY employee_schedules_admin_select ON employee_schedules
    FOR SELECT
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
-- employee_schedules: Only ADMIN/HR can manage schedules
-- ---------------------------------------------------------------------------
CREATE POLICY employee_schedules_manage ON employee_schedules
    FOR ALL
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
