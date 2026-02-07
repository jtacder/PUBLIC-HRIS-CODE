-- Module 18: Expense Management - Database Functions
-- Reverse-engineered from ElectroManage ERP documentation

-- Get expense totals by project
CREATE OR REPLACE FUNCTION get_expense_totals_by_project(p_project_id UUID)
RETURNS TABLE(
    total_submitted DECIMAL(15,2),
    total_approved DECIMAL(15,2),
    total_reimbursed DECIMAL(15,2),
    pending_count BIGINT,
    approved_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(amount), 0)::DECIMAL(15,2) AS total_submitted,
        COALESCE(SUM(CASE WHEN status IN ('Approved', 'Reimbursed') THEN amount ELSE 0 END), 0)::DECIMAL(15,2) AS total_approved,
        COALESCE(SUM(CASE WHEN status = 'Reimbursed' THEN amount ELSE 0 END), 0)::DECIMAL(15,2) AS total_reimbursed,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END)::BIGINT AS pending_count,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END)::BIGINT AS approved_count
    FROM expenses
    WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Get expense totals by category
CREATE OR REPLACE FUNCTION get_expense_totals_by_category(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    category VARCHAR,
    total_amount DECIMAL(15,2),
    expense_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.category,
        SUM(e.amount)::DECIMAL(15,2) AS total_amount,
        COUNT(*)::BIGINT AS expense_count
    FROM expenses e
    WHERE e.status IN ('Approved', 'Reimbursed')
      AND (p_start_date IS NULL OR e.created_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR e.created_at::DATE <= p_end_date)
    GROUP BY e.category
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Auto-update project actual_cost when expense is approved
CREATE OR REPLACE FUNCTION update_project_cost_on_expense_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Approved' AND OLD.status = 'Pending' AND NEW.project_id IS NOT NULL THEN
        UPDATE projects
        SET actual_cost = COALESCE(actual_cost, 0) + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_project_cost
    AFTER UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_cost_on_expense_approval();

-- Auto-set updated_at timestamp
CREATE OR REPLACE FUNCTION update_expense_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_expense_timestamp
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_timestamp();
