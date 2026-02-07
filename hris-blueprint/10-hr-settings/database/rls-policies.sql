-- Module 10: HR Settings - Row Level Security Policies
-- Reverse-engineered from ElectroManage ERP documentation

-- Holidays: All authenticated users can read, only ADMIN/HR can modify
CREATE POLICY holidays_select ON holidays
    FOR SELECT
    USING (true);  -- All authenticated users can view holidays

CREATE POLICY holidays_insert ON holidays
    FOR INSERT
    WITH CHECK (current_setting('app.current_role') IN ('ADMIN', 'HR'));

CREATE POLICY holidays_update ON holidays
    FOR UPDATE
    USING (current_setting('app.current_role') IN ('ADMIN', 'HR'));

CREATE POLICY holidays_delete ON holidays
    FOR DELETE
    USING (current_setting('app.current_role') IN ('ADMIN', 'HR'));

-- Company Settings: All authenticated users can read, only ADMIN can modify
CREATE POLICY company_settings_select ON company_settings
    FOR SELECT
    USING (true);

CREATE POLICY company_settings_update ON company_settings
    FOR UPDATE
    USING (current_setting('app.current_role') = 'ADMIN');

CREATE POLICY company_settings_insert ON company_settings
    FOR INSERT
    WITH CHECK (current_setting('app.current_role') = 'ADMIN');

-- Note: Leave types and payroll cutoffs are managed through their respective modules
-- (06-leave-management and 08-payroll-system) but configured via the HR Settings UI.
-- Their RLS policies are defined in those modules.
