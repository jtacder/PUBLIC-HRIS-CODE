-- Module 18: Expense Management - Row Level Security Policies
-- Reverse-engineered from ElectroManage ERP documentation

-- Employees can view their own expenses; HR/Admin can view all
CREATE POLICY expense_select ON expenses
    FOR SELECT
    USING (
        requester_id IN (SELECT id FROM employees WHERE user_id = current_setting('app.current_user_id')::UUID)
        OR current_setting('app.current_role') IN ('ADMIN', 'HR')
    );

-- Any authenticated employee can submit expenses
CREATE POLICY expense_insert ON expenses
    FOR INSERT
    WITH CHECK (
        requester_id IN (SELECT id FROM employees WHERE user_id = current_setting('app.current_user_id')::UUID)
    );

-- Only HR/Admin can update expenses (approve/reject/reimburse)
CREATE POLICY expense_update ON expenses
    FOR UPDATE
    USING (current_setting('app.current_role') IN ('ADMIN', 'HR'));

-- Only HR/Admin can delete expenses
CREATE POLICY expense_delete ON expenses
    FOR DELETE
    USING (current_setting('app.current_role') IN ('ADMIN', 'HR'));

-- Expense approvals: HR/Admin can manage
CREATE POLICY expense_approvals_all ON expense_approvals
    FOR ALL
    USING (current_setting('app.current_role') IN ('ADMIN', 'HR'));

-- Employees can view approval history on their own expenses
CREATE POLICY expense_approvals_select ON expense_approvals
    FOR SELECT
    USING (
        expense_id IN (
            SELECT id FROM expenses
            WHERE requester_id IN (SELECT id FROM employees WHERE user_id = current_setting('app.current_user_id')::UUID)
        )
        OR current_setting('app.current_role') IN ('ADMIN', 'HR')
    );
